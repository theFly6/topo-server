import express from 'express'
import { nodes} from '../mock/infoData'
import dotenv from 'dotenv'

dotenv.config()

import { handleIp2TopologyData, handleIp2TopologyDetailData, getRealNodes, saveNodesToFile } from '../controller/infoController'

const router = express.Router()


router.all('/nodes', (req, res) => {
  console.log(`/info/nodes: Received request for nodes in ${process.env.MODE} mode`)
  if (process.env.MODE === 'development') {
    const realNodes = getRealNodes()
    console.log(`/info/nodes: Returning mock nodes data`, realNodes)
    res.json({
      nodes: realNodes,
      message: '成功获取节点信息（模拟数据）'
    })
  } else {
    res.json({
      nodes: getRealNodes(),
      message: '成功获取节点信息（真实数据）'
    })
  }
})

router.post('/nodes/update', (req, res) => {
    try {
        const { nodes } = req.body;

        if (!Array.isArray(nodes)) {
            return res.status(400).json({ message: '无效的数据格式' });
        }

        console.log(`[/info/nodes/update]: 正在更新节点配置，收到 ${nodes.length} 个新节点`);

        // 调用刚才写的保存函数
        saveNodesToFile(nodes);

        res.json({
            message: '节点配置已成功同步到 workers.conf',
            nodes: getRealNodes() // 返回更新后的完整列表给前端
        });
    } catch (err) {
        console.error('更新 workers.conf 失败:', err);
        res.status(500).json({ message: '服务器内部错误：无法保存配置文件' });
    }
});

router.all('/node', handleIp2TopologyData)

router.all('/node/detail', handleIp2TopologyDetailData)


export default router