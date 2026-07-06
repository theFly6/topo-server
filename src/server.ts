import app from './app'
import dotenv from 'dotenv'
import os from 'os'

dotenv.config()

// 获取本机 IPv4 地址（排除内网回环地址）
export function getLocalIPv4() {
  const nets = os.networkInterfaces();
  // 定义网卡优先级列表（按优先级从高到低：ens22f1 > ens22f0）
  const priorityNics = ['ens22f1', 'ens22f0'];
  
  // 第一步：优先遍历高优先级网卡，获取其IPv4地址
  for (const nicName of priorityNics) {
    const nic = nets[nicName]; // 根据网卡名获取网卡信息
    if (nic && Array.isArray(nic)) {
      for (const net of nic) {
        // 筛选：IPv4 + 非内部地址（排除回环/容器内部地址）
        if (net.family === 'IPv4' && !net.internal) {
          return net.address; // 找到优先级网卡的IPv4，直接返回
        }
      }
    }
  }

  // 第二步：优先级网卡未找到，遍历所有其他网卡（保留原逻辑）
  for (const name of Object.keys(nets)) {
    // 跳过已检查过的优先级网卡（避免重复遍历）
    if (priorityNics.includes(name)) continue;
    
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address; // 返回第一个符合条件的非优先级网卡IPv4
      }
    }
  }

  // 第三步：无任何符合条件的IPv4，返回回环地址
  return '127.0.0.1';
}

const host = getLocalIPv4()
const PORT = process.env.PORT || 4000

console.log(`尝试启动，获取到的 IP 是: ${host}`) // 添加这行

const server = app.listen(PORT as number, host, () => {
  console.log(`Server running at http://${host}:${PORT}`);
});

// 显式捕获监听错误
server.on('error', (err) => {
  console.error('服务器启动失败:', err);
});
