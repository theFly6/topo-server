// infoData.ts

export const nodes = [
    {
        hostname: "node1",
        ip: "172.16.0.46",
    },
    {
        hostname: "node24",
        ip: "172.16.0.24",
    },
    {
        hostname: "mx19",
        ip: "123.45.67.89",
    }
]

export const dataDictReal: Record<string, string> = {
    "172.16.0.46": `        GPU0    GPU1    GPU2    GPU3    GPU4    GPU5    GPU6    GPU7    NIC0    NIC1    CPU Affinity      NUMA Affinity   GPU NUMA ID
GPU0     X      NV8     NV8     NV8     NV8     NV8     NV8     NV8     PXB     SYS     0-31,64-950               N/A
GPU1    NV8      X      NV8     NV8     NV8     NV8     NV8     NV8     PXB     SYS     0-31,64-950               N/A
GPU2    NV8     NV8      X      NV8     NV8     NV8     NV8     NV8     NODE    SYS     0-31,64-950               N/A
GPU3    NV8     NV8     NV8      X      NV8     NV8     NV8     NV8     NODE    SYS     0-31,64-950               N/A
GPU4    NV8     NV8     NV8     NV8      X      NV8     NV8     NV8     SYS     PXB     32-63,96-127      1               N/A
GPU5    NV8     NV8     NV8     NV8     NV8      X      NV8     NV8     SYS     PXB     32-63,96-127      1               N/A
GPU6    NV8     NV8     NV8     NV8     NV8     NV8      X      NV8     SYS     NODE    32-63,96-127      1               N/A
GPU7    NV8     NV8     NV8     NV8     NV8     NV8     NV8      X      SYS     NODE    32-63,96-127      1               N/A
NIC0    PXB     PXB     NODE    NODE    SYS     SYS     SYS     SYS      X      SYS
NIC1    SYS     SYS     SYS     SYS     PXB     PXB     NODE    NODE    SYS      X 

Legend:

  X    = Self
  SYS  = Connection traversing PCIe as well as the SMP interconnect between NUMA nodes (e.g., QPI/UPI)
  NODE = Connection traversing PCIe as well as the interconnect between PCIe Host Bridges within a NUMA node
  PHB  = Connection traversing PCIe as well as a PCIe Host Bridge (typically the CPU)
  PXB  = Connection traversing multiple PCIe bridges (without traversing the PCIe Host Bridge)
  PIX  = Connection traversing at most a single PCIe bridge
  NV#  = Connection traversing a bonded set of # NVLinks

NIC Legend:

  NIC0: mlx5_0
  NIC1: mlx5_1
`,
  "172.16.0.24": `        GPU0    GPU1    GPU2    GPU3    GPU4    GPU5    GPU6    GPU7    NIC0    NIC1    CPU Affinity      NUMA Affinity   GPU NUMA ID
GPU0     X      NV8     NV8     NV8     NV8     NV8     NV8     NV8     PXB     SYS     0-31,64-950               N/A
GPU1    NV8      X      NV8     NV8     NV8     NV8     NV8     NV8     PXB     SYS     0-31,64-950               N/A
GPU2    NV8     NV8      X      NV8     NV8     NV8     NV8     NV8     NODE    SYS     0-31,64-950               N/A
GPU3    NV8     NV8     NV8      X      NV8     NV8     NV8     NV8     NODE    SYS     0-31,64-950               N/A
GPU4    NV8     NV8     NV8     NV8      X      NV8     NV8     NV8     SYS     PXB     32-63,96-127      1               N/A
GPU5    NV8     NV8     NV8     NV8     NV8      X      NV8     NV8     SYS     PXB     32-63,96-127      1               N/A
GPU6    NV8     NV8     NV8     NV8     NV8     NV8      X      NV8     SYS     NODE    32-63,96-127      1               N/A
GPU7    NV8     NV8     NV8     NV8     NV8     NV8     NV8      X      SYS     NODE    32-63,96-127      1               N/A
NIC0    PXB     PXB     NODE    NODE    SYS     SYS     SYS     SYS      X      SYS
NIC1    SYS     SYS     SYS     SYS     PXB     PXB     NODE    NODE    SYS      X 

Legend:

  X    = Self
  SYS  = Connection traversing PCIe as well as the SMP interconnect between NUMA nodes (e.g., QPI/UPI)
  NODE = Connection traversing PCIe as well as the interconnect between PCIe Host Bridges within a NUMA node
  PHB  = Connection traversing PCIe as well as a PCIe Host Bridge (typically the CPU)
  PXB  = Connection traversing multiple PCIe bridges (without traversing the PCIe Host Bridge)
  PIX  = Connection traversing at most a single PCIe bridge
  NV#  = Connection traversing a bonded set of # NVLinks

NIC Legend:

  NIC0: mlx5_0
  NIC1: mlx5_1
`,

"123.45.67.89": `        GPU0    GPU1    GPU2    GPU3    GPU4    GPU5    GPU6    GPU7    Node Affinity  CPU Affinity
GPU0    X       HT      HT      HT      HT      HT      HT      HT      2              32-47
GPU1    HT      X       HT      HT      HT      HT      HT      HT      2              32-47
GPU2    HT      HT      X       HT      HT      HT      HT      HT      3              48-63
GPU3    HT      HT      HT      X       HT      HT      HT      HT      3              48-63
GPU4    HT      HT      HT      HT      X       HT      HT      HT      6              96-111
GPU5    HT      HT      HT      HT      HT      X       HT      HT      6              96-111
GPU6    HT      HT      HT      HT      HT      HT      X       HT      7              112-127
GPU7    HT      HT      HT      HT      HT      HT      HT      X       7              112-127

Legend:
  X    = Self
  SYS  = Connection traversing PCIe as well as the SMP interconnect between NUMA nodes (e.g., QPI/UPI)
  NODE = Connection traversing PCIe as well as the interconnect between PCIe Host Bridges within a NUMA node
  PHB  = Connection traversing PCIe as well as a PCIe Host Bridge (typically the CPU)
  PXB  = Connection traversing multiple PCIe bridges (without traversing the PCIe Host Bridge)
  PIX  = Connection traversing at most a single PCIe bridge
  HT   = Connection traversing MarsLink
  NA   = Connection type is unknown`
}