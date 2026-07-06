


export const nodes = [
    {
        hostname: "mccx",
        ip: "192.168.1.3",
    },
    {
        hostname: "mccy",
        ip: "192.168.1.3",
    },
    {
        hostname: "mccz",
        ip: "192.168.1.3",
    }
]

export const dataDict: Record<string, string> = {
    "192.168.1.1": `         GPU0     GPU1     GPU2     GPU3     GPU4     GPU5     GPU6     GPU7     mlx5_1   mlx5_2   mlx5_3   mlx5_4   mlx5_5   CPU Affinity   NUMA Affinity  
GPU0     X        MPB      MPB      MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU1     MPB      X        MPB      MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU2     MPB      MPB      X        MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU3     MPB      MPB      MPB      X        NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU4     NODE     NODE     NODE     NODE     X        MPB      MPB      MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU5     NODE     NODE     NODE     NODE     MPB      X        MPB      MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU6     NODE     NODE     NODE     NODE     MPB      MPB      X        MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU7     NODE     NODE     NODE     NODE     MPB      MPB      MPB      X        MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
mlx5_1   NODE     NODE     NODE     NODE     MPB      MPB      MPB      MPB      X        NODE     NODE     SYS      SYS      
mlx5_2   NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     X        SPB      SYS      SYS      
mlx5_3   NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     SPB      X        SYS      SYS      
mlx5_4   SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      
mlx5_5   SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        

Legend:
    X = Self
  SYS = Topology path that contains PCIe switches/bridges as well as multiple host bridges across NUMA nodes.
 NODE = Topology path that contains PCIe switches/bridges as well as multiple host bridges within a NUMA node.
  HPB = Topology path that contains PCIe switches/bridges as well as a single host bridge.
  MPB = Topology path that contains multiple PCIe switches/bridges (but no host bridge).
  SPB = Topology path that contains at most one PCIe switch/bridge.
  INT = Topology path that is created internally, for example 2 devices on a single S2000 card.
  MTx = Topology path that is a bonded set of x MTLinks.`,
  "192.168.1.2": `         GPU0     GPU1     GPU2     GPU3     GPU4     GPU5     GPU6     GPU7     mlx5_1   mlx5_2   mlx5_3   mlx5_4   mlx5_5   CPU Affinity   NUMA Affinity  
GPU0     X        MPB      MPB      MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU1     MPB      X        MPB      MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU2     MPB      MPB      X        MPB      NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU3     MPB      MPB      MPB      X        NODE     NODE     NODE     NODE     NODE     NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU4     NODE     NODE     NODE     NODE     X        MPB      MPB      MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU5     NODE     NODE     NODE     NODE     MPB      X        MPB      MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU6     NODE     NODE     NODE     NODE     MPB      MPB      X        MPB      MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
GPU7     NODE     NODE     NODE     NODE     MPB      MPB      MPB      X        MPB      NODE     NODE     SYS      SYS      0-31,64-95     0              
mlx5_1   NODE     NODE     NODE     NODE     MPB      MPB      MPB      MPB      X        NODE     NODE     SYS      SYS      
mlx5_2   NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     X        SPB      SYS      SYS      
mlx5_3   NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     NODE     SPB      X        SYS      SYS      
mlx5_4   SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      
mlx5_5   SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        

Legend:
    X = Self
  SYS = Topology path that contains PCIe switches/bridges as well as multiple host bridges across NUMA nodes.
 NODE = Topology path that contains PCIe switches/bridges as well as multiple host bridges within a NUMA node.
  HPB = Topology path that contains PCIe switches/bridges as well as a single host bridge.
  MPB = Topology path that contains multiple PCIe switches/bridges (but no host bridge).
  SPB = Topology path that contains at most one PCIe switch/bridge.
  INT = Topology path that is created internally, for example 2 devices on a single S2000 card.
  MTx = Topology path that is a bonded set of x MTLinks.`,
  "192.168.1.3": `         GPU0     GPU1     GPU2     GPU3     GPU4     GPU5     GPU6     GPU7     NIC0     NIC1     NIC2     NIC3     NIC4     NIC5     NIC6     NIC7     NIC8     NIC9     CPU Affinity   NUMA Affinity
GPU0     X        MT2      MT2      MT2      MT2      MT2      MT2      MT2      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      48-63,176-191  3
GPU1     MT2      X        MT2      MT2      MT2      MT2      MT2      MT2      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      48-63,176-191  3
GPU2     MT2      MT2      X        MT2      MT2      MT2      MT2      MT2      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      32-47,160-175  2
GPU3     MT2      MT2      MT2      X        MT2      MT2      MT2      MT2      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      32-47,160-175  2
GPU4     MT2      MT2      MT2      MT2      X        MT2      MT2      MT2      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      112-127,240-2547
GPU5     MT2      MT2      MT2      MT2      MT2      X        MT2      MT2      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      112-127,240-2547
GPU6     MT2      MT2      MT2      MT2      MT2      MT2      X        MT2      SYS      SYS      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      64-79,192-207  4
GPU7     MT2      MT2      MT2      MT2      MT2      MT2      MT2      X        SYS      SYS      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      64-79,192-207  4
NIC0     MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS
NIC1     MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS
NIC2     SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      SYS      SYS      SYS      SYS      SYS      SYS
NIC3     SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        SYS      SYS      SYS      SYS      SYS      SYS
NIC4     SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      SYS      SYS      SYS      SYS
NIC5     SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        SYS      SYS      SYS      SYS
NIC6     SYS      SYS      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB      SYS      SYS
NIC7     SYS      SYS      SYS      SYS      SYS      SYS      MPB      MPB      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X        SYS      SYS
NIC8     SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      X        SPB
NIC9     SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SYS      SPB      X

Legend:
    X = Self
  SYS = Topology path that contains PCIe switches/bridges as well as multiple host bridges across NUMA nodes.
 NODE = Topology path that contains PCIe switches/bridges as well as multiple host bridges within a NUMA node.
  HPB = Topology path that contains PCIe switches/bridges as well as a single host bridge.
  MPB = Topology path that contains multiple PCIe switches/bridges (but no host bridge).
  SPB = Topology path that contains at most one PCIe switch/bridge.
  INT = Topology path that is created internally, for example 2 devices on a single S2000 card.
  MTx = Topology path that is a bonded set of x MTLinks.

NIC Legend:
  NIC0: mlx5_0
  NIC1: mlx5_1
  NIC2: mlx5_2
  NIC3: mlx5_3
  NIC4: mlx5_4
  NIC5: mlx5_5
  NIC6: mlx5_6
  NIC7: mlx5_7
  NIC8: mlx5_8
  NIC9: mlx5_9
`
}