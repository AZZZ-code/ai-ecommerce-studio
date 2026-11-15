/** 首页 → 生成页 的图片交接（只在内存中，不落盘） */
let pendingFile: File | null = null
let pendingSample: string | null = null

export function setPendingFile(file: File | null): void {
  pendingFile = file
}

export function takePendingFile(): File | null {
  const file = pendingFile
  pendingFile = null
  return file
}

export function setPendingSample(src: string | null): void {
  pendingSample = src
}

export function takePendingSample(): string | null {
  const src = pendingSample
  pendingSample = null
  return src
}

/** 示例图片（用于演示模式与首页展示，均为本地静态资源） */
export interface SampleProduct {
  id: string
  name: string
  category: string
  desc: string
  image: string
  /** 用于演示文案的模板 key */
  template: 'bottle' | 'earbuds' | 'tote'
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 'bottle',
    name: '户外运动保温杯',
    category: '保温杯 / 运动水杯',
    desc: '圆柱杯体 + 旋盖提环，磨砂质感',
    image: '/samples/sample-bottle.svg',
    template: 'bottle',
  },
  {
    id: 'earbuds',
    name: '真无线蓝牙耳机',
    category: '蓝牙耳机',
    desc: '入耳式 + 充电仓，白色亮面外壳',
    image: '/samples/sample-earbuds.svg',
    template: 'earbuds',
  },
  {
    id: 'tote',
    name: '简约帆布托特包',
    category: '帆布包 / 单肩包',
    desc: '米白帆布 + 加宽肩带，大容量',
    image: '/samples/sample-tote.svg',
    template: 'tote',
  },
]
