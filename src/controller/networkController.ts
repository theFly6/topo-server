import express from 'express'
import dotenv from 'dotenv'
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLocalIPv4 } from '../server';
import { SSH_PORT } from '../config/platform';

const execPromise = promisify(exec);

dotenv.config()


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
async function canSshLogin(ip: string, port = SSH_PORT): Promise<boolean> {
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
    const cmd = `nmap -p ${port} --open -oG - ${subnet} | grep "Up" | awk '{print $2}'`;
    try {
        const result = await runCommand(cmd);
        const getNodesDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Nmap 扫描完成，耗时 ${getNodesDuration} 秒，结果:\n${result}`);
        const allNodes = result.split('\n').filter(ip => ip.length > 0);
        const localIP = getLocalIPv4();

        // ===================== 并行检测 SSH =====================
        const sshChecks = allNodes.map(async (ip) => {
            if (ip === localIP) return true;
            return canSshLogin(ip);
        });
        const results = await Promise.all(sshChecks);
        const sshReadyNodes = allNodes.filter((_, i) => results[i]);

        // 记录结束时间并计算总耗时
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        // 3. 返回：保留原有 nodes + 新增 ssh_ready_nodes
        res.json({
        success: true,
        ssh_ready_nodes: sshReadyNodes, // 可免密登录的有效节点 ✅
        // nodes: allNodes,               // 端口开放的全部节点
        scan_duration_seconds: duration // 扫描耗时
        });
    } catch (err: any) {
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

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function sshCmd(host: string, remote: string, port = IPERF_SSH_PORT) {
    const escaped = remote.replace(/"/g, '\\"');
    return `ssh -n -T -q -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${port} ${host} "${escaped}"`;
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

async function waitIperfServerReady(serverIp: string, port = IPERF_SSH_PORT, timeoutMs = 8000) {
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
    throw new Error(`节点 ${serverIp} 上 iperf3 服务未在 ${timeoutMs}ms 内就绪`);
}

/** 在 serverIp 上启动 iperf3 server；force 时忽略缓存并重建容器 */
async function ensureIperfServer(serverIp: string, force = false, port = IPERF_SSH_PORT) {
    if (!force && iperfServerCache.has(serverIp)) {
        return;
    }

    const startCmd = sshCmd(
        serverIp,
        'docker rm -f iperf3 2>/dev/null; docker run -d --name iperf3 --net=host quay.io/networkstatic/iperf3 -s',
        port,
    );
    await runCommand(startCmd);
    await waitIperfServerReady(serverIp, port);
    iperfServerCache.add(serverIp);
    console.log(`✅ 节点 ${serverIp} iperf3 server 已就绪`);
}

/**
 * 运行一次 iperf3 测速
 * @param clientHost 运行 iperf 客户端的节点
 * @param serverHost iperf server 所在节点
 * @param reverse 是否 -R（server 发流 → 测 serverHost→clientHost 方向吞吐量）
 */
async function runIperfOnce(clientHost: string, serverHost: string, reverse: boolean) {
    const revFlag = reverse ? '-R' : '';
    const clientCmd = sshCmd(
        clientHost,
        `docker run --rm --net=host quay.io/networkstatic/iperf3 -c ${serverHost} -t 2 -P 1 ${revFlag} -J`,
    );
    const raw = await runCommand(clientCmd);
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