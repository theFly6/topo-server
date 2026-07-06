import express from 'express'
import dotenv from 'dotenv'
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLocalIPv4 } from '../server';

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
async function canSshLogin(ip: string, port=14735): Promise<boolean> {
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
    let port = data.port as string || "14735";
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

    // 未传 source → 使用本机IP
    if (!source) {
        source = getLocalIPv4();
    }

    // 测量单个IP的函数
    const measureSingle = async (target: string) => {
        try {
            let cmd: string;
            if (source) {
                cmd = `ssh -n -T -q -p 14735 ${source} "curl --http0.9 -w '%{time_connect}' -o /dev/null -s --connect-timeout 2 ${target}:14735 2>/dev/null || true"`;
            } else {
                cmd = `curl --http0.9 -w "%{time_connect}" -o /dev/null -s --connect-timeout 2 ${target}:14735 2>/dev/null || true"`;
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
        // ✅ 并行测量所有目标（超快）
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


// ==================== 全局缓存：确保每个节点只启动一次 iperf server ====================
const iperfServerCache = new Set<string>();

/**
 * 自动启动目标节点的 iperf3 server（只启动一次）
 */
async function ensureIperfServer(targetIp: string, port = 14735) {
    if (iperfServerCache.has(targetIp)) {
        return; // 已经启动过，直接返回
    }

    try {
        const cmd = `ssh -n -T -q -p ${port} ${targetIp} "docker rm -f iperf3 2>/dev/null; docker run -d --name iperf3 --net=host --restart=always quay.io/networkstatic/iperf3 -s 2>/dev/null"`;
        await runCommand(cmd);
        iperfServerCache.add(targetIp); // 标记已启动
        console.log(`✅ 节点 ${targetIp} 已启动 iperf3 server`);
    } catch (err) {
        console.log(`❌ 启动 ${targetIp} iperf3 失败:`, err);
    }
}

// ==================== 测量单个目标带宽 ====================
async function measureSingleBandwidth(source: string, dest: string) {
    try {
        // ✅ 自动确保 dest 启动了 server（只一次）
        await ensureIperfServer(dest);

        // 等待 server 就绪
        await new Promise(r => setTimeout(r, 300));

        const cmd = `ssh -n -T -q -p 14735 ${source} "docker run --rm --net=host quay.io/networkstatic/iperf3 -c ${dest} -t 1 -J 2>/dev/null || true"`;
        const result = await runCommand(cmd);
        const parsed = JSON.parse(result);

        if (!parsed.end?.sum_received) {
            throw new Error("无法获取带宽，iperf3 server 可能未启动");
        }

        const bps = parsed.end.sum_received.bits_per_second;

        return {
            dest,
            bandwidth_mbps: (bps / 1e6).toFixed(2),
            success: true,
            timestamp: new Date().toLocaleString()
        };
    } catch (err: any) {
        return { dest, success: false, error: err.message };
    }
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