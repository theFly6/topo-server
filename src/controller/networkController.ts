import express from 'express'
import dotenv from 'dotenv'
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLocalIPv4 } from '../server';
import { SSH_PORT } from '../config/platform';
import { getRealNodes } from './infoController';

const execPromise = promisify(exec);

dotenv.config()

const PSEUDO_HOSTNAMES = new Set(['Overall', 'Subnet']);

function ipToInt(octets: number[]): number {
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function ipInSubnet(ip: string, subnet: string): boolean {
    const cleanIp = ip.split('/')[0];
    const [networkPart, prefixStr = '32'] = subnet.includes('/') ? subnet.split('/') : [subnet, '32'];
    const prefix = Number(prefixStr);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const ipInt = ipToInt(cleanIp.split('.').map(Number));
    const netInt = ipToInt(networkPart.split('.').map(Number));
    return (ipInt & mask) === (netInt & mask);
}

async function nmapAvailable(): Promise<boolean> {
    try {
        await execPromise('command -v nmap');
        return true;
    } catch {
        return false;
    }
}

async function getNodesFromWorkersConf(subnet: string): Promise<string[]> {
    const candidates = getRealNodes()
        .filter((node) => !PSEUDO_HOSTNAMES.has(node.hostname))
        .filter((node) => ipInSubnet(node.ip, subnet))
        .map((node) => node.ip.split('/')[0]);

    return [...new Set(candidates)];
}


/**
 * 辅助函数：执行 Shell 命令
 */
async function runCommand(command: string) {
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr && !stdout) throw new Error(stderr);
        return stdout.trim();
    } catch (error: any) {
        throw new Error(error.message);
    }
}

// 检测是否可免密 SSH 登录
async function canSshLogin(ip: string, port: string | number = SSH_PORT): Promise<boolean> {
  try {
    const cmd = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes ${ip} -p ${port} exit`;
    await execPromise(cmd);
    return true;
  } catch (e) {
    return false;
  }
}

// 1. 获取在线节点列表 (Nmap)
// 访问示例: /network/nodes?subnet=192.168.162.0/24&port=14735
export async function getNodes(req: express.Request, res: express.Response) {
    // 记录开始执行的时间
    const data = { ...req.query, ...req.body };
    const startTime = Date.now();
    let subnet = data.subnet as string || "192.168.162.0/24";
    let port = data.port as string || SSH_PORT;
    if (!subnet.includes("/")) subnet += "/24"; // 自动补子网掩码

    const finishWithNodes = async (allNodes: string[], source: 'nmap' | 'workers') => {
        const localIP = getLocalIPv4();
        const sshChecks = allNodes.map(async (ip) => {
            if (ip === localIP) return true;
            return canSshLogin(ip, port);
        });
        const results = await Promise.all(sshChecks);
        const sshReadyNodes = allNodes.filter((_, i) => results[i]);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${source}] 子网 ${subnet} 发现 ${allNodes.length} 节点，SSH 可达 ${sshReadyNodes.length}，耗时 ${duration}s`);
        res.json({
            success: true,
            ssh_ready_nodes: sshReadyNodes,
            scan_duration_seconds: duration,
            source,
        });
    };

    try {
        if (!(await nmapAvailable())) {
            console.log('nmap 不可用，回退到 workers.conf 节点列表');
            const workerNodes = await getNodesFromWorkersConf(subnet);
            return finishWithNodes(workerNodes, 'workers');
        }

        const cmd = `nmap -p ${port} --open -oG - ${subnet} | grep "Up" | awk '{print $2}'`;
        const result = await runCommand(cmd);
        const getNodesDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Nmap 扫描完成，耗时 ${getNodesDuration} 秒，结果:\n${result}`);
        const allNodes = result.split('\n').filter(ip => ip.length > 0);
        return finishWithNodes(allNodes, 'nmap');
    } catch (err: any) {
        if (err.message.includes('nmap')) {
            console.log('nmap 执行失败，回退到 workers.conf 节点列表');
            try {
                const workerNodes = await getNodesFromWorkersConf(subnet);
                return finishWithNodes(workerNodes, 'workers');
            } catch (fallbackErr: any) {
                return res.status(500).json({ success: false, error: fallbackErr.message });
            }
        }
        res.status(500).json({ success: false, error: err.message });
    }
}

// 2. 测量指定路径的 TCP 时延（支持 1对多 targets）
// 访问示例: /network/latency?source=192.168.162.18&targets=192.168.162.17,192.168.162.19,192.168.162.20
export async function getLatency(req: express.Request, res: express.Response) {
    const data = { ...req.query, ...req.body };
    let { source, targets } = data;

    // 兼容参数：支持 target / targets
    const targetList = targets || data.target;
    if (!targetList) {
        return res.status(400).json({ error: "Missing targets" });
    }

    // 把逗号分隔的字符串 → 数组
    const targetArray = targetList
        .split(",")
        .map((ip: string) => ip.trim())
        .filter(Boolean);

    if (targetArray.length === 0) {
        return res.status(400).json({ error: "No valid targets" });
    }

    const probePort = (data.port as string) || SSH_PORT;

    if (!source) {
        source = getLocalIPv4();
    }

    const measureSingle = async (target: string) => {
        try {
            let cmd: string;
            if (source) {
                cmd = `ssh -n -T -q -p ${SSH_PORT} ${source} "curl --http0.9 -w '%{time_connect}' -o /dev/null -s --connect-timeout 2 ${target}:${probePort} 2>/dev/null || true"`;
            } else {
                cmd = `curl --http0.9 -w "%{time_connect}" -o /dev/null -s --connect-timeout 2 ${target}:${probePort} 2>/dev/null || true"`;
            }

            const { stdout } = await execPromise(cmd);
            const result = stdout.trim();
            const timeValue = parseFloat(result);

            if (!isNaN(timeValue) && timeValue > 0) {
                return {
                    target,
                    latency_ms: (timeValue * 1000).toFixed(3),
                    success: true
                };
            } else {
                return { target, success: false, error: "timeout" };
            }
        } catch (err) {
            return { target, success: false, error: (err as any).message };
        }
    };

    try {
        const results = await Promise.all(targetArray.map((t: any) => measureSingle(t)));

        return res.json({
            success: true,
            timestamp: new Date().toLocaleString(),
            source,
            count: targetArray.length,
            results
        });
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            error: "Measurement failed",
            detail: err.message
        });
    }
}


// ==================== iperf3 带宽测量 ====================
const IPERF_SSH_PORT = SSH_PORT;
const iperfServerCache = new Set<string>();

interface HostCaps {
    docker: boolean;
    iperf3: boolean;
}

const hostCapsCache = new Map<string, HostCaps>();

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function sshCmd(host: string, remote: string, port = IPERF_SSH_PORT) {
    const escaped = remote.replace(/"/g, '\\"');
    return `ssh -n -T -q -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${port} ${host} "${escaped}"`;
}

async function remoteCommandExists(host: string, cmd: string, port = IPERF_SSH_PORT): Promise<boolean> {
    try {
        await runCommand(sshCmd(host, `command -v ${cmd} >/dev/null`, port));
        return true;
    } catch {
        return false;
    }
}

/** 探测节点是否有 docker / 原生 iperf3 */
async function detectHostCaps(host: string, port = IPERF_SSH_PORT): Promise<HostCaps> {
    const cached = hostCapsCache.get(host);
    if (cached) return cached;

    const caps: HostCaps = {
        docker: await remoteCommandExists(host, 'docker', port),
        iperf3: await remoteCommandExists(host, 'iperf3', port),
    };
    hostCapsCache.set(host, caps);
    console.log(`[iperf] 节点 ${host} 能力: docker=${caps.docker}, iperf3=${caps.iperf3}`);
    return caps;
}

/** iperf3 客户端 JSON：上行用 sum_sent，部分环境只有 sum_received */
function extractBandwidthBps(parsed: any): number | null {
    const end = parsed?.end;
    if (!end) return null;
    const sent = end.sum_sent?.bits_per_second;
    const recv = end.sum_received?.bits_per_second;
    const bps = sent || recv;
    return typeof bps === 'number' && bps > 0 ? bps : null;
}

async function waitIperfPortOpen(serverIp: string, port = IPERF_SSH_PORT, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    const probe = 'ss -lnt 2>/dev/null | grep -q ":5201" || netstat -lnt 2>/dev/null | grep -q ":5201"';
    while (Date.now() < deadline) {
        try {
            await runCommand(sshCmd(serverIp, probe, port));
            return;
        } catch {
            await sleep(400);
        }
    }
    throw new Error(`节点 ${serverIp} 上 iperf3 服务未在 ${timeoutMs}ms 内就绪`);
}

async function waitIperfServerReadyDocker(serverIp: string, port = IPERF_SSH_PORT, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const probe = sshCmd(
                serverIp,
                'docker ps --filter name=iperf3 --filter status=running -q | grep -q . && (ss -lnt 2>/dev/null | grep -q ":5201" || netstat -lnt 2>/dev/null | grep -q ":5201")',
                port,
            );
            await runCommand(probe);
            return;
        } catch {
            await sleep(400);
        }
    }
    throw new Error(`节点 ${serverIp} 上 docker iperf3 未在 ${timeoutMs}ms 内就绪`);
}

/** 在 serverIp 上启动 iperf3 server；优先 docker，否则原生 iperf3 */
async function ensureIperfServer(serverIp: string, force = false, port = IPERF_SSH_PORT) {
    if (!force && iperfServerCache.has(serverIp)) {
        return;
    }

    const caps = await detectHostCaps(serverIp, port);
    if (caps.docker) {
        const startCmd = sshCmd(
            serverIp,
            'docker rm -f iperf3 2>/dev/null; docker run -d --name iperf3 --net=host quay.io/networkstatic/iperf3 -s',
            port,
        );
        await runCommand(startCmd);
        await waitIperfServerReadyDocker(serverIp, port);
        console.log(`✅ 节点 ${serverIp} docker iperf3 server 已就绪`);
    } else if (caps.iperf3) {
        const startCmd = sshCmd(
            serverIp,
            'pkill -x iperf3 2>/dev/null || true; sleep 0.3; iperf3 -s -D -1',
            port,
        );
        await runCommand(startCmd);
        await waitIperfPortOpen(serverIp, port);
        console.log(`✅ 节点 ${serverIp} 原生 iperf3 server 已就绪`);
    } else {
        throw new Error(
            `节点 ${serverIp} 无 docker 且无 iperf3，请在节点上执行 deploy/tj/install-iperf3.sh`,
        );
    }

    iperfServerCache.add(serverIp);
}

/**
 * 运行一次 iperf3 测速（自动选择 docker 或原生客户端）
 */
async function runIperfOnce(clientHost: string, serverHost: string, reverse: boolean) {
    const caps = await detectHostCaps(clientHost);
    const revFlag = reverse ? '-R' : '';
    let raw: string;

    if (caps.docker) {
        const clientCmd = sshCmd(
            clientHost,
            `docker run --rm --net=host quay.io/networkstatic/iperf3 -c ${serverHost} -t 2 -P 1 ${revFlag} -J`,
        );
        raw = await runCommand(clientCmd);
    } else if (caps.iperf3) {
        const clientCmd = sshCmd(
            clientHost,
            `iperf3 -c ${serverHost} -t 2 -P 1 ${revFlag} -J`,
        );
        raw = await runCommand(clientCmd);
    } else {
        throw new Error(`节点 ${clientHost} 无 docker 且无 iperf3`);
    }

    if (!raw) {
        throw new Error('iperf3 无输出');
    }
    const parsed = JSON.parse(raw);
    const bps = extractBandwidthBps(parsed);
    if (!bps) {
        throw new Error('iperf3 结果无效（无 sum_sent/sum_received）');
    }
    return bps;
}

/**
 * 测量 source → dest 方向带宽
 * 1. 常规：server@dest + client@source
 * 2. 失败则反向：server@source + client@dest -R（适配部分节点入站 5201 受限）
 */
async function measureSingleBandwidth(source: string, dest: string) {
    const attempts: Array<{ mode: string; run: () => Promise<number> }> = [
        {
            mode: 'server@dest,client@source',
            run: async () => {
                await ensureIperfServer(dest);
                return runIperfOnce(source, dest, false);
            },
        },
        {
            mode: 'server@source,client@dest,-R',
            run: async () => {
                iperfServerCache.delete(source);
                await ensureIperfServer(source, true);
                return runIperfOnce(dest, source, true);
            },
        },
    ];

    let lastError = '未知错误';
    for (const attempt of attempts) {
        try {
            console.log(`带宽 ${source} → ${dest} 尝试 [${attempt.mode}]`);
            const bps = await attempt.run();
            return {
                dest,
                bandwidth_mbps: (bps / 1e6).toFixed(2),
                success: true,
                mode: attempt.mode,
                timestamp: new Date().toLocaleString(),
            };
        } catch (err: any) {
            lastError = err.message || String(err);
            console.log(`带宽 ${source} → ${dest} [${attempt.mode}] 失败: ${lastError}`);
            iperfServerCache.delete(dest);
            iperfServerCache.delete(source);
        }
    }

    return { dest, success: false, error: lastError };
}

// ==================== 最终带宽接口（全自动版） ====================
// 访问示例: /network/bandwidth?source=192.168.162.18&dests=192.168.162.17,192.168.162.19
export async function getBandwidth(req: express.Request, res: express.Response) {
    const data = { ...req.query, ...req.body };
    const { source } = data;

    const destList = data.dests || data.dest;
    if (!source || !destList) {
        return res.status(400).json({ error: 'Missing source or dest(s)' });
    }

    const destArray = destList
        .split(',')
        .map((ip: string) => ip.trim())
        .filter(Boolean);

    try {
        // 并行测量所有 dest
        // const results = await Promise.all(
        //     destArray.map((dest: any) => measureSingleBandwidth(source, dest))
        // );

        const results = []
        // ✅ 改用 for...of 循环，实现顺序执行
        for (const dest of destArray) {
            console.log(`正在测量从 ${source} 到 ${dest} 的带宽...`);
            const result = await measureSingleBandwidth(source, dest);
            results.push(result);
        }

        res.json({
            success: true,
            source,
            count: destArray.length,
            results
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
}