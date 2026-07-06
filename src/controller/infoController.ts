import { dataDict } from '../mock/infoData';
import { nodes, dataDictReal } from '../real/infoData';
import dotenv from 'dotenv'
import os from 'os';
import { execSync, exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

dotenv.config()

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { get } from 'http';
import { getLocalIPv4 } from '../server';
import { SSH_PORT, WORKERS_CONF } from '../config/platform';

export const handleIp2TopologyData = (req: Request, res: Response) => {
    const { ip, port } = req.query;
    let data
    if (process.env.MODE === 'development') {
        // data = dataDict[ip as string];
        data = getMxTopo(ip as string, port as string)
    } else {
        // data = getNvidiaSmiTopo(ip as string)
        data = getMxTopo(ip as string, port as string)
    }
    console.log(`/info/node: Received topology request for IP: ${ip}, found data: ${data ? 'yes' : 'no'} ${data}`);
    if (data && data.startsWith('Error')) {
        res.status(404).json({ message: 'IP地址不存在' });
    }
    else if (data) {
        res.json({ topologyData: data }); // 返回拓扑图数据
    }
    else {
        res.status(404).json({ message: 'IP地址不存在' }); // 返回错误信息
    }
};

// export const handleIp2TopologyDetailData = (req: Request, res: Response) => {
//     const { ip, port } = req.query;
//     const filePath = path.join(os.homedir(), 'Topo-profiler', 'my_server_test.json');
//     try {
//         console.log(`/info/node/detail: Received topology detail request for IP:port: ${ip}:${port}, looking for file at: ${filePath}`);
//         // 检查文件是否存在
//         if (!fs.existsSync(filePath)) {
//             return res.status(404).json({ error: '找不到拓扑详细配置文件' });
//         }

//         // 读取文件内容
//         let rawData = fs.readFileSync(filePath, 'utf-8');
//         rawData = rawData.replace(/\bNAN\b/g, 'null');
//         const jsonData = JSON.parse(rawData);

//         // 根据逻辑，无论开发还是生产模式，目前都返回该文件内容
//         if (process.env.MODE === 'development') {
//             // 开发模式下可以增加一些调试日志
//             console.log(`[Dev] 为 IP: ${ip} 加载本地模拟数据`);
//             res.json(jsonData);
//         } else {
//             // 生产模式直接返回
//             res.json(jsonData);
//         }
//     } catch (error) {
//         console.error('读取.json文件 失败:', error);
//         res.status(500).json({ error: '服务器内部错误，无法解析拓扑数据' });
//     }
// };
export const handleIp2TopologyDetailData = async (req: any, res: any) => {
    const { ip } = req.query; 
    const safeIp = ip.replace(/\./g, '-');
    const sshPort = process.env.SSH_PORT || SSH_PORT;
    const remoteDir = "~/Topo-profiler";
    const binaryName = "topo-profiler";
    const targetFileName = `res_${safeIp}.json`; 
    const profilerHome = process.env.TOPO_PROFILER_HOME || path.join(os.homedir(), 'Topo-profiler');
    const filePath = path.join(profilerHome, targetFileName);
    const localBinaryPath = path.join(profilerHome, binaryName);
    const localMainPy = path.join(profilerHome, 'main.py');
    const outputBaseName = `res_${safeIp}`;
    const profilerArgs = `--format human csv json --bidirectional --repeat 5 --output ${outputBaseName}`;

    const logStep = (step: string, details: string) => {
        const time = new Date().toLocaleString();
        console.log(`\n[${time}] [NODE: ${ip}] >>> ${step} <<<`);
        console.log(`COMMAND: ${details}`);
        console.log("-".repeat(50));
    };

    const resolveProfilerMode = async (): Promise<'binary' | 'python'> => {
        if (fs.existsSync(localBinaryPath)) {
            try {
                await execPromise(`"${localBinaryPath}" --help >/dev/null 2>&1`);
                return 'binary';
            } catch {
                console.log(`[profiler] 本地二进制不可执行，回退 Python: ${localBinaryPath}`);
            }
        }
        if (fs.existsSync(localMainPy)) {
            return 'python';
        }
        throw new Error(
            `topo-profiler 未安装: ${profilerHome}，请运行 deploy/tj/install-topo-profiler.sh`,
        );
    };

    const remoteProfilerReady = async (mode: 'binary' | 'python') => {
        const probe = mode === 'binary'
            ? `[ -x ${remoteDir}/${binaryName} ] && echo exists || echo missing`
            : `[ -f ${remoteDir}/main.py ] && echo exists || echo missing`;
        const checkCmd = `ssh -q -p ${sshPort} ${ip} "${probe}"`;
        const { stdout: checkResult } = await execPromise(checkCmd);
        return checkResult.trim() === 'exists';
    };

    try {
        const mode = await resolveProfilerMode();
        console.log(`[profiler] 使用 ${mode} 模式，home=${profilerHome}`);

        const localDir = path.dirname(filePath);
        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
        }

        if (!(await remoteProfilerReady(mode))) {
            if (mode === 'binary') {
                const setupCmd = `ssh -q -p ${sshPort} ${ip} "mkdir -p ${remoteDir}" && scp -P ${sshPort} ${localBinaryPath} ${ip}:${remoteDir}/`;
                logStep('UPLOAD_BINARY', setupCmd);
                await execPromise(setupCmd);
            } else {
                const setupCmd = `ssh -q -p ${sshPort} ${ip} "mkdir -p ${remoteDir}" && scp -r -P ${sshPort} ${profilerHome}/* ${ip}:${remoteDir}/`;
                logStep('UPLOAD_PYTHON_SRC', setupCmd);
                await execPromise(setupCmd);
            }
        }

        const runRemote = mode === 'binary'
            ? `cd ${remoteDir} && ./${binaryName} ${profilerArgs}`
            : `cd ${remoteDir} && python3 main.py ${profilerArgs}`;
        const runCmd = `ssh -q -p ${sshPort} ${ip} "${runRemote}"`;
        logStep('EXECUTE_PROFILER', runCmd);
        await execPromise(runCmd);

        const pullCmd = `scp -P ${sshPort} ${ip}:${remoteDir}/${targetFileName} ${filePath}`;
        logStep('PULL_RESULT_FILE', pullCmd);
        await execPromise(pullCmd);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found at: ${filePath}`);
        }

        let rawData = fs.readFileSync(filePath, 'utf-8');
        rawData = rawData.replace(/\bNaN\b/gi, 'null').replace(/\bInfinity\b/gi, 'null');
        const jsonData = JSON.parse(rawData);
        console.log(`[SUCCESS] Request processed for ${ip}`);
        res.json(jsonData);

    } catch (error: any) {
        console.log("\n" + "=".repeat(20) + " ERROR OCCURRED " + "=".repeat(20));
        console.log(`NODE IP: ${ip}`);
        console.log(`FAILED AT COMMAND: ${error.cmd || 'N/A'}`);
        console.log(`ERROR MESSAGE: ${error.message}`);
        console.log("=".repeat(56) + "\n");
        
        res.status(500).json({ error: `执行远程任务 (${ip}) 失败: ${error.message}` });
    }
};

// 获取真实nodes
export const getRealNodes = (): any[] => {
    // 这里可以添加实际获取节点信息的逻辑
    // return nodes;
    const content = fs.readFileSync(WORKERS_CONF, 'utf-8');
    //   先过滤掉注释行和空行，再解析每行的hostname和ip以及端口
    const parsedList  = content.split('\n')
        // 第一步：处理行内注释（移除第一个#及其后的所有内容）
        .map(line => line.split('#')[0].trim())
        // 第二步：过滤空行（处理行内注释后可能变成空行的情况）
        .filter(line => line)
        // 第三步：解析每行的hostname、ip、port（port默认22）
        .map(line => {
            const [hostname, ip, port = "22"] = line.split(/\s+/);
            return { hostname, ip, port };
        });

    // 对于重复的ip仅仅保留最后一个
    const ipMap = new Map();
    parsedList.forEach(node => {
        ipMap.set(node.ip, node); // 后续同IP会覆盖之前的，自然保留最后一个
    });

    const results = [...Array.from(ipMap.values())];

    // 将Map的值转为数组返回
    return results;
}

// 将节点数组写回 workers.conf
export const saveNodesToFile = (newNodes: any[]) => {
    // 1. 构建文件内容
    const header = `# This file contains the hostname and IP address of each worker node.\n` +
                   `# format: <hostname> <ip_address> <port(optional, default 22)>\n\n`;
    
    const content = newNodes
        .map(n => `${n.hostname} ${n.ip} ${n.port || '22'}`)
        .join('\n');

    // 2. 写入文件
    fs.writeFileSync(WORKERS_CONF, header + content, 'utf-8');
};


// 获取本机nvidia-smi topo -m命令输出
// ssh -q yaowenxuan@${ip} "nvidia-smi topo -m"
export const getNvidiaSmiTopo = (ip: string): string => {
    return dataDictReal[ip];
    // const { execSync } = require('child_process');
    // try {
    //     const cmd = `ssh -T ${ip} "TERM=dumb nvidia-smi topo -m"
    //     `;
    //     let output = execSync(cmd).toString();
    //     output = output.replace(/\x1b\[[0-9;]*m/g, '');
    //     return output;
    // } catch (err) {
    //     return 'Error executing nvidia-smi topo -m';
    // }
}

// MX的拓扑数据：ht-smi topo -m命令的输出
//  ssh 192.168.162.17 -p 14735 "ht-smi topo -m"
//  ssh 192.168.162.18 -p 14735 "ht-smi topo -m"
export const getMxTopo = (ip: string, port = "22"): string => {
    if (process.env.MODE === 'development') {
        console.log(`[Dev] 即将执行 'ssh ${ip} -p ${port} "ht-smi topo -m"' 获取拓扑数据`);
        return dataDictReal[ip];
    } else {
        console.log(`[Prod] 即将执行 'ssh ${ip} -p ${port} "ht-smi topo -m"' 获取拓扑数据`);
        const { execSync } = require('child_process');
        try {
            // 1. 在 SSH 命令中添加 -o ConnectTimeout=3，确保 TCP 层面快速失败
            const localIP = getLocalIPv4()
            let cmd;
            if (ip === localIP) {
                cmd = `ht-smi topo -m`;    
            } else {
                cmd = `ssh -o ConnectTimeout=3 ${ip} -p ${port} "ht-smi topo -m"`;
            }
            // 2. 在 execSync 中设置 timeout: 3000 (3秒)
            // 如果超过 3 秒，execSync 会抛出一个异常
            let output = execSync(cmd, {
                timeout: 3000,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'] // 忽略 stderr 避免干扰
            }).toString();

            // 过滤逻辑
            output = output.replace(/\x1b\[[0-9;]*m/g, '');
            const tableStartIndex = output.indexOf('        GPU0');
            if (tableStartIndex !== -1) {
                output = output.substring(tableStartIndex);
            }
            output = output.trimEnd();

            return output;
        } catch (err: any) {
            // 3. 判断是否是超时导致的错误
            // code 为 'ETIMEDOUT' (Node 层面超时) 或信号为 'SIGTERM'
            if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM' || err.status === 255) {
                console.error(`[Prod] Connection to ${ip} timed out or node does not exist.`);
                return 'Error: IP does not exist or connection timed out';
            }

            return 'Error executing ht-smi topo -m';
        }
    }
}
