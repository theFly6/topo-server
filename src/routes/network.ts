import express from 'express'

import { getBandwidth, getLatency, getNodes } from '../controller/networkController'

const router = express.Router()

// 1. 获取在线节点列表 (Nmap)
router.all('/nodes', getNodes);

// 2. 测量指定节点的 TCP 时延 (Curl)
router.all('/latency', getLatency);

// 3. 测量带宽 (iperf3)
router.all('/bandwidth', getBandwidth);

export default router