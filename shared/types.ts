/**
 * ProductAI 共享类型定义
 * ----------------------------------------------------------------------------
 * 该文件同时被前端（src/）与后端（functions/）引用，是前后端唯一的数据契约。
 * 任何字段变更都需要前后端同时校验，避免出现"前端有字段、后端读不到"的问题。
 */

/* ============================ 基础枚举 ============================ */

/**
 * 已适配的模型服务商。
 * 注意：deepseek 目前只提供纯文本模型（deepseek-chat / deepseek-reasoner），
 * 不具备图片输入能力，因此它只能作为「文本模型」使用。
 */
export type ProviderId = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'compatible'

/** 接入模式：A = 平台默认 API；B = 用户自带 Key（BYOK） */
export type AccessMode = 'platform' | 'byok'

/** 电商平台 */
export type PlatformId =
  | 'general'
  | 'taobao'
  | 'tmall'
  | 'jd'
  | 'pinduoduo'
  | 'douyin'
  | 'kuaishou'
  | 'xiaohongshu'
  | 'amazon'
  | 'ebay'
  | 'shopify'
  | 'etsy'

/** 文案风格 */
export type CopyStyleId =
  | 'professional'
  | 'concise'
  | 'marketing'
  | 'lifestyle'
  | 'premium'

/** 语言模式 */
export type LanguageMode = 'zh' | 'en' | 'bilingual'

/** 可单独重新生成 / 单独切换语言的文案模块 */
export type SectionKey =
  | 'title'
  | 'sellingPoints'
  | 'description'
  | 'marketing'
  | 'keywords'

/** 生成模式：demo = 本地演示数据；live = 真实模型调用 */
export type GenerateMode = 'demo' | 'live'

/* ============================ 商品信息 ============================ */

/**
 * 商品补充信息（全部选填）。
 * 图片无法确认的属性必须由用户主动填写，AI 不得凭空编造。
 */
export interface ProductInfo {
  name: string
  category: string
  brand: string
  material: string
  size: string
  color: string
  price: string
  targetCustomer: string
  scenarios: string
  functions: string
  features: string
  extra: string
}

export const EMPTY_PRODUCT_INFO: ProductInfo = {
  name: '',
  category: '',
  brand: '',
  material: '',
  size: '',
  color: '',
  price: '',
  targetCustomer: '',
  scenarios: '',
  functions: '',
  features: '',
  extra: '',
}

/* ============================ 生成请求 ============================ */

/**
 * 单个模型端点配置。
 * 视觉模型与文本模型各用一份，允许分别来自不同服务商。
 */
export interface ModelEndpointConfig {
  provider: ProviderId
  baseUrl: string
  apiKey: string
  model: string
}

/** 用户在前端填写的模型配置（BYOK）；apiKey 只存在于内存，不落盘 */
export interface ModelConfigInput {
  /** 视觉模型；使用「仅文字生成」（skipVision）时不需要 */
  vision?: ModelEndpointConfig
  text: ModelEndpointConfig
}

/** POST /api/generate 的 payload（放在 multipart 的 payload 字段里） */
export interface GeneratePayload {
  mode: AccessMode
  platform: PlatformId
  style: CopyStyleId
  language: LanguageMode
  product: ProductInfo
  /** 仅 mode === 'byok' 时存在 */
  modelConfig?: ModelConfigInput
  /** 只重新生成某一个模块时使用；为空表示生成全部模块 */
  regenerateSection?: SectionKey
  /** 重新生成某一模块时，上一次的分析结果可复用，避免二次识别 */
  reuseAnalysis?: VisionAnalysis | null
  /**
   * 跳过图片识别，只根据用户填写的文字信息生成文案。
   * 场景：所选文本模型（如 DeepSeek）不支持图片输入，用户又不希望额外配置视觉模型。
   * 为 true 时后端不会把图片发送给任何模型，也不会调用视觉模型。
   */
  skipVision?: boolean
}

/* ============================ 图片识别结果 ============================ */

/**
 * 视觉模型对图片的客观观察结果。
 * 每个字段都是"可直接观察到的"信息，不包含材质/尺寸/性能等不可验证属性。
 */
export interface VisionAnalysis {
  /** 商品类别（如：保温杯 / 蓝牙耳机 / 帆布包） */
  category: string
  /** 可观察到的颜色 */
  colors: string[]
  /** 外观描述 */
  appearance: string
  /** 形状 / 结构 */
  shape: string
  /** 可直接观察到的特征（如：杯盖有提环、表面有磨砂质感） */
  visibleFeatures: string[]
  /** 可能的使用场景（推测，需标注为推测） */
  possibleScenarios: string[]
  /** 无法从图片确认、需要用户补充的属性 */
  unconfirmedAttributes: string[]
  /** 识别置信度 0-1 */
  confidence: number
  /**
   * 分析结果来源：
   *  - vision    ：由视觉模型直接识别图片得到
   *  - text-only ：没有调用视觉模型（例如文本模型不支持图片输入），按用户填写的文字信息整理
   */
  source?: 'vision' | 'text-only'
}

export const EMPTY_ANALYSIS: VisionAnalysis = {
  category: '',
  colors: [],
  appearance: '',
  shape: '',
  visibleFeatures: [],
  possibleScenarios: [],
  unconfirmedAttributes: [],
  confidence: 0,
}

/* ============================ 文案结果 ============================ */

/** 单个文案模块：中英双语都保留，前端按语言模式展示 */
export interface CopySection {
  key: SectionKey
  zh: string
  en: string
  /** 列表型模块（卖点、关键词）额外提供数组形式，方便编辑与复制 */
  zhList?: string[]
  enList?: string[]
}

export interface CopyResult {
  sections: CopySection[]
  /** 标题单独抽出来方便展示在卡片头部 */
  title: { zh: string; en: string }
  sellingPoints: { zh: string[]; en: string[] }
  description: { zh: string; en: string }
  marketing: { zh: string; en: string }
  keywords: { zh: string[]; en: string[] }
}

export interface GenerationMeta {
  provider: ProviderId
  visionModel: string
  textModel: string
  latencyMs: number
  /** 平台默认模式还是 BYOK */
  accessMode: AccessMode
  generatedAt: string
}

/** /api/generate 成功响应 */
export interface GenerateResponse {
  ok: true
  mode: GenerateMode
  data: {
    analysis: VisionAnalysis
    copy: CopyResult
  }
  meta: GenerationMeta
  /** 后端给出的提醒（如：多项属性未确认，建议补充） */
  warnings: string[]
}

/** 统一错误响应 */
export interface ApiErrorBody {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
    /** 可选的可执行建议 */
    hint?: string
    retryable?: boolean
  }
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_FILE'
  | 'FILE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'NO_MODEL_CONFIG'
  | 'NO_VISION_MODEL'
  | 'NO_IMAGE_MODEL'
  | 'IMAGE_GENERATION_FAILED'
  | 'IMAGE_UNSUPPORTED'
  | 'INVALID_MODEL_CONFIG'
  | 'BLOCKED_BASE_URL'
  | 'UPSTREAM_UNAUTHORIZED'
  | 'UPSTREAM_INSUFFICIENT_BALANCE'
  | 'UPSTREAM_RATE_LIMIT'
  | 'MODEL_NOT_FOUND'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'BAD_MODEL_OUTPUT'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR'

/* ============================ 模型目录 ============================ */

export interface ModelOption {
  id: string
  label: string
  supportsVision: boolean
  notes?: string
}

export interface ProviderOption {
  id: ProviderId
  label: string
  /** 是否要求用户填写 Base URL */
  requiresBaseUrl: boolean
  defaultBaseUrl: string
  docsUrl: string
  /** 该服务商请求格式说明 */
  requestFormat: string
  visionModels: ModelOption[]
  textModels: ModelOption[]
}

export interface ModelCatalog {
  providers: ProviderOption[]
  /** 平台默认 API 是否已配置（由后端读取环境变量判断，不返回任何 Key） */
  platformDefault: {
    configured: boolean
    vision: { provider: ProviderId; model: string } | null
    text: { provider: ProviderId; model: string } | null
  }
  /** 图片生成模型服务商（与文本 / 视觉模型分开配置） */
  imageProviders: ImageProviderOption[]
  /** 平台默认图片模型是否已配置 */
  imagePlatformDefault: {
    configured: boolean
    provider: ImageProviderId | null
    model: string | null
  }
  /** 演示模式始终可用 */
  demoMode: boolean
  limits: {
    maxUploadBytes: number
    acceptedMimeTypes: string[]
    rateLimitPerMinute: number
  }
}

/* ============================ 连接测试 ============================ */

export interface TestConnectionPayload {
  target: 'vision' | 'text' | 'image' | 'both' | 'all'
  vision?: ModelEndpointConfig
  text?: ModelEndpointConfig
  image?: ImageEndpointConfig
}

export interface TestConnectionTargetResult {
  ok: boolean
  model: string
  latencyMs: number
  message: string
  /** 模型返回的原文（截断后），方便排查问题 */
  sample?: string
}

export interface TestConnectionResponse {
  ok: boolean
  target: 'vision' | 'text' | 'image' | 'both' | 'all'
  results: {
    vision?: TestConnectionTargetResult
    text?: TestConnectionTargetResult
    image?: TestConnectionTargetResult
  }
  error?: ApiErrorBody['error']
}

/* ============================ 常量元数据 ============================ */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const
export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

export const PLATFORM_META: Record<
  PlatformId,
  { label: string; region: '国内' | '跨境'; desc: string; tone: string }
> = {
  general: {
    label: '通用电商',
    region: '国内',
    desc: '信息完整、结构标准，任何平台都能直接改',
    tone: '信息均衡，标题 + 卖点 + 场景描述',
  },
  taobao: {
    label: '淘宝',
    region: '国内',
    desc: '商品信息完整，突出产品特点与规格',
    tone: '参数齐全、卖点分层、强调品质与保障',
  },
  tmall: {
    label: '天猫',
    region: '国内',
    desc: '品牌调性优先，强调材质、工艺与权益',
    tone: '品牌叙事、质感描述、成段卖点',
  },
  jd: {
    label: '京东',
    region: '国内',
    desc: '参数规范、品质与服务保障并重',
    tone: '参数清单 + 品质承诺 + 售后保障',
  },
  pinduoduo: {
    label: '拼多多',
    region: '国内',
    desc: '表达简洁直白，突出高性价比与使用价值',
    tone: '短句、强对比、卖点前置',
  },
  douyin: {
    label: '抖音',
    region: '国内',
    desc: '营销感强，适合短视频挂车与直播口播',
    tone: '口语化钩子、节奏快、有行动号召',
  },
  kuaishou: {
    label: '快手',
    region: '国内',
    desc: '口语化阐述，强调实用与价格优势',
    tone: '直给、接地气、强调性价比',
  },
  xiaohongshu: {
    label: '小红书',
    region: '国内',
    desc: '生活化表达，突出使用场景与真实体验',
    tone: '第一人称、场景化、种草笔记感',
  },
  amazon: {
    label: 'Amazon',
    region: '跨境',
    desc: '专业清晰，适合跨境 Listing（标题/五点描述/A+）',
    tone: 'Title + Bullet Points + Description，克制不夸张',
  },
  ebay: {
    label: 'eBay',
    region: '跨境',
    desc: '简洁准确，突出商品信息与状态',
    tone: '客观陈述、条件清晰、便于比价',
  },
  shopify: {
    label: 'Shopify',
    region: '跨境',
    desc: '独立站风格，SEO Title / Meta / Slug 齐全',
    tone: '品牌化、结构清晰、兼顾搜索与转化',
  },
  etsy: {
    label: 'Etsy',
    region: '跨境',
    desc: '手作与设计感，标题与 Tags 覆盖长尾',
    tone: '温暖叙事、强调手工与材质细节',
  },
}

export const STYLE_META: Record<CopyStyleId, { label: string; desc: string }> = {
  professional: { label: '专业型', desc: '结构严谨、术语准确，适合品牌与跨境 Listing' },
  concise: { label: '简洁型', desc: '短句、信息密度高，适合列表页快速阅读' },
  marketing: { label: '营销型', desc: '强钩子、强卖点、带行动号召' },
  lifestyle: { label: '生活化', desc: '口语化、场景感，像朋友之间的推荐' },
  premium: { label: '高端商务型', desc: '克制、有质感，突出设计与工艺叙事' },
}

export const LANGUAGE_META: Record<LanguageMode, { label: string; desc: string }> = {
  zh: { label: '中文', desc: '仅生成中文文案' },
  en: { label: 'English', desc: '仅生成英文文案' },
  bilingual: { label: '中英双语', desc: '中文 + 英文各一份，便于跨境铺货' },
}

export const SECTION_META: Record<
  SectionKey,
  { label: string; labelEn: string; kind: 'text' | 'list'; desc: string }
> = {
  title: { label: '商品标题', labelEn: 'Product Title', kind: 'text', desc: '主标题，可直接用于平台标题栏' },
  sellingPoints: {
    label: '核心卖点',
    labelEn: 'Key Selling Points',
    kind: 'list',
    desc: '3-5 条，每条一句话讲清一个价值点',
  },
  description: {
    label: '商品详细介绍',
    labelEn: 'Product Description',
    kind: 'text',
    desc: '分段说明外观、使用方式与适用人群',
  },
  marketing: {
    label: '营销推广文案',
    labelEn: 'Marketing Copy',
    kind: 'text',
    desc: '活动 / 短视频 / 社媒推广可直接使用',
  },
  keywords: {
    label: 'SEO 搜索关键词',
    labelEn: 'SEO Keywords',
    kind: 'list',
    desc: '用于标题优化、后台关键词与广告投放',
  },
}

/** 需要用户补充的字段中文名，用于生成提醒 */
export const PRODUCT_FIELD_LABELS: Record<keyof ProductInfo, string> = {
  name: '商品名称',
  category: '商品类别',
  brand: '商品品牌',
  material: '材质',
  size: '尺寸',
  color: '颜色',
  price: '价格',
  targetCustomer: '目标客户',
  scenarios: '适用场景',
  functions: '商品功能',
  features: '已知产品特点',
  extra: '其他补充信息',
}

/* ========================================================================
 *                     AI 商品效果图生成（图片模型）
 * ====================================================================== */

/** 图片生成服务商 */
export type ImageProviderId = 'gemini-image' | 'openai-image' | 'deepseek-image' | 'custom-image'

/** 生成质量档位：不同服务商映射到各自的参数 */
export type ImageQualityId = 'standard' | 'high'

/** 输出格式 */
export type ImageFormatId = 'png' | 'jpeg' | 'webp'

/** 通用画面比例（不是所有平台的强制要求，用户可自定义宽高） */
export type AspectRatioId = '1:1' | '4:5' | '3:4' | '16:9' | '9:16' | 'custom'

/** 图片生成类型 */
export type ProductImageTypeId =
  | 'white-bg'
  | 'scene'
  | 'selling-point'
  | 'detail'
  | 'usage'
  | 'detail-page'
  | 'social'

/** 商品保真度模式 */
export type ImageFidelityMode = 'fidelity' | 'creative'

/** 图片模型端点配置（Key 只在请求期间存在，前端不持久化） */
export interface ImageEndpointConfig {
  provider: ImageProviderId
  baseUrl: string
  apiKey: string
  model: string
  quality: ImageQualityId
  format: ImageFormatId
}

export interface ImageModelOption {
  id: string
  label: string
  /** 是否支持传入原图做「图生图 / 编辑」 */
  supportsImageEditing: boolean
  /** 支持的输出格式 */
  formats: ImageFormatId[]
  notes?: string
}

export interface ImageProviderOption {
  id: ImageProviderId
  label: string
  requiresBaseUrl: boolean
  defaultBaseUrl: string
  docsUrl: string
  requestFormat: string
  /** 是否支持把商品原图发给模型（图生图），false 表示只能文生图 */
  supportsImageEditing: boolean
  models: ImageModelOption[]
  /** 能力或限制说明（例如某服务商当前没有图片模型） */
  notes?: string
}

/** 单个平台的图片规范（可维护的配置表，非平台强制标准） */
export interface PlatformImageSpec {
  platform: PlatformId
  label: string
  region: '国内' | '跨境'
  /** 该平台常用的画面比例（通用建议，可被用户覆盖） */
  ratios: AspectRatioId[]
  /** 常用尺寸建议 */
  recommended: { label: string; width: number; height: number }[]
  /** 图片风格预设（会拼进提示词） */
  stylePreset: string
  /** 构图建议 */
  compositionTips: string[]
  /** 该平台配图文案重点 */
  copyFocus: string
  /** 主语言 */
  language: 'zh' | 'en'
  /** 规范更新时间（配置表内部使用，便于后续维护） */
  updatedAt: string
  note?: string
}

/** 图片类型的元信息 */
export interface ImageTypeMeta {
  label: string
  labelEn: string
  desc: string
  /** 拼进图像提示词的画面要求 */
  promptFragment: string
  /** 是否需要在图片上叠加文字（用 Canvas 叠加，不交给图像模型绘制） */
  needsTextOverlay: boolean
  /** 该类型默认推荐的比例 */
  defaultRatio: AspectRatioId
}

/** /api/generate-image 请求体（multipart 的 payload 字段） */
export interface ImageGeneratePayload {
  mode: AccessMode
  platform: PlatformId
  imageType: ProductImageTypeId
  fidelity: ImageFidelityMode
  ratio: AspectRatioId
  width: number
  height: number
  /** 用户自定义补充提示词 */
  prompt?: string
  product: ProductInfo
  /** 上一次的商品识别结果（可选，避免重复调用视觉模型） */
  analysis?: VisionAnalysis | null
  /** 希望生成的图片数量（1-4） */
  count?: number
  modelConfig?: ImageEndpointConfig
}

/** 生成出来的单张图片 */
export interface GeneratedImage {
  id: string
  /** data:image/...;base64,... 或远端 URL */
  url: string
  demo: boolean
  width: number
  height: number
  format: ImageFormatId
  prompt: string
  createdAt: string
}

export interface ImageGenerateResponse {
  ok: true
  mode: GenerateMode
  platform: PlatformId
  imageType: ProductImageTypeId
  fidelity: ImageFidelityMode
  images: GeneratedImage[]
  /** 实际发送给图片模型的提示词（便于用户查看与二次编辑） */
  prompt: string
  negativePrompt: string
  meta: {
    provider: ImageProviderId
    model: string
    quality: ImageQualityId
    format: ImageFormatId
    width: number
    height: number
    latencyMs: number
    accessMode: AccessMode
  }
  warnings: string[]
}

/* ------------------------------------------------------------------------ */
/*                          平台图片规范配置表                              */
/* ------------------------------------------------------------------------ */

export const ASPECT_RATIO_META: Record<
  AspectRatioId,
  { label: string; value: number; baseWidth: number; baseHeight: number; desc: string }
> = {
  '1:1': { label: '1:1 正方形', value: 1, baseWidth: 1200, baseHeight: 1200, desc: '主图、社媒通用方图' },
  '4:5': { label: '4:5 竖版', value: 0.8, baseWidth: 1080, baseHeight: 1350, desc: '小红书 / Instagram 竖版' },
  '3:4': { label: '3:4 竖版', value: 0.75, baseWidth: 1080, baseHeight: 1440, desc: '详情页、场景竖图' },
  '16:9': { label: '16:9 横版', value: 1.7778, baseWidth: 1920, baseHeight: 1080, desc: '详情页头图、横版 Banner' },
  '9:16': { label: '9:16 竖版', value: 0.5625, baseWidth: 1080, baseHeight: 1920, desc: '抖音 / 快手 / Reels 全屏' },
  custom: { label: '自定义尺寸', value: 1, baseWidth: 1200, baseHeight: 1200, desc: '自行输入宽高（128–4096）' },
}

export const IMAGE_TYPE_META: Record<ProductImageTypeId, ImageTypeMeta> = {
  'white-bg': {
    label: '电商白底主图',
    labelEn: 'White Background Main Image',
    desc: '纯净背景、主体居中，适合作为商品列表首图',
    promptFragment:
      '纯白或极浅灰的干净背景，商品完整居中，柔和的棚拍灯光，边缘清晰，无道具、无文字、无水印，产品形态与颜色保持原样',
    needsTextOverlay: false,
    defaultRatio: '1:1',
  },
  scene: {
    label: '产品场景图',
    labelEn: 'Lifestyle Scene',
    desc: '把商品放进真实生活场景，营造代入感',
    promptFragment:
      '把商品放入真实的生活场景中，环境与商品用途相符，自然光，浅景深，商品始终是画面视觉中心，商品外观保持不变',
    needsTextOverlay: false,
    defaultRatio: '4:5',
  },
  'selling-point': {
    label: '产品卖点图',
    labelEn: 'Selling Point Visual',
    desc: '展示核心卖点，配简要文字标注（文字由前端叠加）',
    promptFragment:
      '为商品留出干净的文案排版本，画面一侧保留大面积留白区域，柔和渐变背景，主体清晰，不包含任何文字',
    needsTextOverlay: true,
    defaultRatio: '1:1',
  },
  detail: {
    label: '产品细节图',
    labelEn: 'Detail Close-up',
    desc: '放大展示结构、材质纹理与做工',
    promptFragment:
      '商品局部的微距特写，突出结构、纹理与做工细节，柔和的侧光，背景虚化，不改变商品的真实材质与颜色',
    needsTextOverlay: false,
    defaultRatio: '1:1',
  },
  usage: {
    label: '产品使用图',
    labelEn: 'In-use Image',
    desc: '展示真实的持握、使用方式',
    promptFragment:
      '展示商品被真实使用的画面，人手与商品的比例自然，动作合理，商品外观不变，不使用虚假的功能演示',
    needsTextOverlay: false,
    defaultRatio: '4:5',
  },
  'detail-page': {
    label: '商品详情页配图',
    labelEn: 'Detail Page Visual',
    desc: '横向长图素材，适合详情页分屏排版',
    promptFragment:
      '横向构图的详情页素材，画面分区明确，一侧为商品、一侧留白用于排版，光线干净，商品比例真实',
    needsTextOverlay: true,
    defaultRatio: '16:9',
  },
  social: {
    label: '社交媒体宣传图',
    labelEn: 'Social Media Visual',
    desc: '适合短视频封面与图文平台传播',
    promptFragment:
      '具有传播感的社媒视觉，画面有节奏与情绪，色彩明快，主体突出，可留出标题区域，商品外观保持真实',
    needsTextOverlay: true,
    defaultRatio: '9:16',
  },
}

/**
 * 平台图片规范表。
 * 说明：这些是「通用建议值」，不是平台官方强制标准；用户可以自行修改宽高与比例。
 * 后续维护时直接改这张表即可，无需改动页面代码。
 */
export const PLATFORM_IMAGE_SPEC: Record<PlatformId, PlatformImageSpec> = {
  general: {
    platform: 'general',
    label: '通用电商',
    region: '国内',
    ratios: ['1:1', '4:5', '16:9'],
    recommended: [
      { label: '方图主图', width: 1200, height: 1200 },
      { label: '详情竖图', width: 1080, height: 1440 },
    ],
    stylePreset: '干净商业摄影，柔和棚拍光，浅灰或纯白背景',
    compositionTips: ['主体占画面 60%–75%', '四周留出安全边距', '避免杂乱道具抢焦点'],
    copyFocus: '标题 + 3–5 条卖点',
    language: 'zh',
    updatedAt: '2025-01-01',
    note: '通用规范，适合尚未确定目标平台的场景',
  },
  taobao: {
    platform: 'taobao',
    label: '淘宝',
    region: '国内',
    ratios: ['1:1', '3:4', '16:9'],
    recommended: [
      { label: '主图方图', width: 800, height: 800 },
      { label: '主图高清', width: 1200, height: 1200 },
      { label: '详情页宽图', width: 750, height: 1000 },
    ],
    stylePreset: '明亮电商风，浅色背景，产品占画面主体，光线均匀',
    compositionTips: ['主图避免促销文字堆叠', '商品完整不裁切', '白底图边缘留白 8%'],
    copyFocus: '标题关键词 + 规格参数 + 卖点分层',
    language: 'zh',
    updatedAt: '2025-01-01',
    note: '以主图 1:1 为主，详情页常用 750 宽竖图',
  },
  tmall: {
    platform: 'tmall',
    label: '天猫',
    region: '国内',
    ratios: ['1:1', '3:4', '16:9'],
    recommended: [
      { label: '主图方图', width: 800, height: 800 },
      { label: '品牌主图', width: 1200, height: 1200 },
      { label: '详情页宽图', width: 790, height: 1000 },
    ],
    stylePreset: '品牌质感风，克制布光，高级灰或纯白背景，突出材质',
    compositionTips: ['视觉统一、留白充足', '避免夸张特效', '品牌元素不遮挡商品'],
    copyFocus: '品牌调性 + 材质工艺 + 权益说明',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  jd: {
    platform: 'jd',
    label: '京东',
    region: '国内',
    ratios: ['1:1', '3:4', '16:9'],
    recommended: [
      { label: '主图方图', width: 800, height: 800 },
      { label: '高清主图', width: 1200, height: 1200 },
      { label: '详情页宽图', width: 750, height: 1000 },
    ],
    stylePreset: '清晰规范风，白底为主，强调参数与品质感',
    compositionTips: ['白底图主体居中', '参数可视化留出排版位', '避免过度美化'],
    copyFocus: '参数规格 + 品质承诺 + 服务保障',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  pinduoduo: {
    platform: 'pinduoduo',
    label: '拼多多',
    region: '国内',
    ratios: ['1:1', '3:4'],
    recommended: [
      { label: '主图方图', width: 800, height: 800 },
      { label: '主图高清', width: 1200, height: 1200 },
    ],
    stylePreset: '直接对比风，高饱和背景，主体大而醒目',
    compositionTips: ['主体放大、信息前置', '背景简洁不抢眼', '避免过多小字'],
    copyFocus: '低价卖点 + 核心功能 + 简单对比',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  douyin: {
    platform: 'douyin',
    label: '抖音电商',
    region: '国内',
    ratios: ['9:16', '1:1', '16:9'],
    recommended: [
      { label: '短视频封面', width: 1080, height: 1920 },
      { label: '商品卡方图', width: 1080, height: 1080 },
    ],
    stylePreset: '短视频风，强对比、有情绪，画面留出标题区',
    compositionTips: ['竖版构图，主体在中上部', '顶部留出字幕安全区', '画面简洁、一眼看懂'],
    copyFocus: '口播钩子 + 3 秒卖点 + 话题标签',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  kuaishou: {
    platform: 'kuaishou',
    label: '快手',
    region: '国内',
    ratios: ['9:16', '1:1'],
    recommended: [
      { label: '短视频封面', width: 1080, height: 1920 },
      { label: '商品卡方图', width: 1080, height: 1080 },
    ],
    stylePreset: '生活化直给风，真实场景，少滤镜',
    compositionTips: ['竖版满屏', '主体清晰、不遮挡', '避免过度设计'],
    copyFocus: '口语化阐述 + 实用价值 + 价格优势',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  xiaohongshu: {
    platform: 'xiaohongshu',
    label: '小红书',
    region: '国内',
    ratios: ['3:4', '4:5', '1:1'],
    recommended: [
      { label: '笔记竖图', width: 1080, height: 1440 },
      { label: '方图', width: 1080, height: 1080 },
    ],
    stylePreset: '生活方式风，自然光、柔和色调，有场景与情绪',
    compositionTips: ['竖版封面优先', '留出封面大标题位置', '画面有生活痕迹但保持干净'],
    copyFocus: '笔记标题 + 种草正文 + 话题标签',
    language: 'zh',
    updatedAt: '2025-01-01',
  },
  amazon: {
    platform: 'amazon',
    label: 'Amazon',
    region: '跨境',
    ratios: ['1:1', '4:5', '16:9'],
    recommended: [
      { label: '主图方图', width: 2000, height: 2000 },
      { label: 'A+ 横图', width: 1464, height: 600 },
    ],
    stylePreset: '纯白背景专业棚拍（主图），清晰真实，无文字无道具',
    compositionTips: ['主图商品占比约 85%', '纯白背景（RGB 255）', '不含水印与文字'],
    copyFocus: 'Title + 5 Bullet Points + Description + Search Terms',
    language: 'en',
    updatedAt: '2025-01-01',
    note: '主图需纯白背景，副图可展示场景与细节',
  },
  ebay: {
    platform: 'ebay',
    label: 'eBay',
    region: '跨境',
    ratios: ['1:1', '3:4'],
    recommended: [
      { label: '主图方图', width: 1600, height: 1600 },
      { label: '细节图', width: 1600, height: 1200 },
    ],
    stylePreset: '真实客观风，白底或浅灰底，如实呈现商品状态',
    compositionTips: ['商品完整入镜', '如实展示磨损与配件', '避免夸张后期'],
    copyFocus: '标题 + 商品状况 + 属性词 + 描述',
    language: 'en',
    updatedAt: '2025-01-01',
  },
  shopify: {
    platform: 'shopify',
    label: 'Shopify',
    region: '跨境',
    ratios: ['1:1', '4:5', '16:9'],
    recommended: [
      { label: '产品页图', width: 2048, height: 2048 },
      { label: 'Banner 横图', width: 1920, height: 1080 },
    ],
    stylePreset: '独立站品牌风，干净留白，质感统一',
    compositionTips: ['统一色调与留白', '适配商品页卡片裁切', '首图突出主体'],
    copyFocus: 'SEO Title + Meta Description + URL Slug + 描述',
    language: 'en',
    updatedAt: '2025-01-01',
  },
  etsy: {
    platform: 'etsy',
    label: 'Etsy',
    region: '跨境',
    ratios: ['4:5', '1:1', '3:4'],
    recommended: [
      { label: '列表主图', width: 1500, height: 2000 },
      { label: '方图', width: 2000, height: 2000 },
    ],
    stylePreset: '手作生活风，温暖光线与真实场景，有故事感',
    compositionTips: ['首图强氛围感', '展示尺寸与细节', '避免纯电商白底堆叠'],
    copyFocus: '标题 + Tags + 描述 + 长尾词',
    language: 'en',
    updatedAt: '2025-01-01',
  },
}

/* ========================================================================
 *                       智能 SEO 关键词（分类 + 质量检查）
 * ====================================================================== */

export type KeywordCategoryId =
  | 'core'
  | 'attribute'
  | 'longtail'
  | 'scenario'
  | 'audience'
  | 'need'
  | 'brand'
  | 'competitor'
  | 'english'
  | 'xhs-topic'

export type ImportanceId = 'high' | 'medium' | 'low'

export interface KeywordItem {
  term: string
  /** 搜索意图（用户搜这个词想干什么） */
  intent: string
  /** 推荐使用位置（标题 / 后台关键词 / 话题标签…） */
  placement: string
  importance: ImportanceId
  /** 是否需要人工确认（如平台规则、真实品牌、竞品信息） */
  needsReview: boolean
  /** 可选备注：为什么需要确认、数据来源说明 */
  note?: string
}

export interface KeywordGroup {
  id: KeywordCategoryId
  label: string
  labelEn: string
  description: string
  keywords: KeywordItem[]
}

/** 平台差异化文案块（淘宝标题 / Amazon 五点 / Shopify Meta…） */
export interface SeoCopyBlock {
  id: string
  label: string
  labelEn: string
  content: string
  note?: string
}

export interface SeoKeywordPayload {
  mode: AccessMode
  platform: PlatformId
  style: CopyStyleId
  language: LanguageMode
  product: ProductInfo
  analysis?: VisionAnalysis | null
  /** 用户提供的合法竞品信息（可选，未提供则不生成竞品词） */
  competitorInfo?: string
  modelConfig?: ModelConfigInput
}

export interface KeywordCoverage {
  total: number
  unique: number
  duplicatesRemoved: number
  high: number
  medium: number
  low: number
  needsReview: number
  byGroup: Record<KeywordCategoryId, number>
}

export interface SeoKeywordResponse {
  ok: true
  mode: GenerateMode
  platform: PlatformId
  groups: KeywordGroup[]
  copyBlocks: SeoCopyBlock[]
  coverage: KeywordCoverage
  warnings: string[]
  meta: {
    provider: ProviderId
    model: string
    latencyMs: number
    accessMode: AccessMode
    generatedAt: string
  }
}

/** 关键词类别元信息（顺序即页面展示顺序） */
export const KEYWORD_CATEGORY_META: Record<
  KeywordCategoryId,
  { label: string; labelEn: string; description: string }
> = {
  core: { label: '核心关键词', labelEn: 'Core Keywords', description: '商品名称与主要品类，决定流量入口' },
  attribute: { label: '属性关键词', labelEn: 'Attribute Keywords', description: '颜色、材质、规格、款式、功能' },
  longtail: { label: '长尾关键词', labelEn: 'Long-tail Keywords', description: '更具体的搜索短语，转化更精准' },
  scenario: { label: '场景关键词', labelEn: 'Scenario Keywords', description: '使用地点与使用场景' },
  audience: { label: '人群关键词', labelEn: 'Audience Keywords', description: '适用客户群体' },
  need: { label: '需求关键词', labelEn: 'Need Keywords', description: '用户希望解决的问题' },
  brand: { label: '品牌关键词', labelEn: 'Brand Keywords', description: '仅使用真实品牌名，需人工确认' },
  competitor: { label: '竞品对比词', labelEn: 'Competitor Terms', description: '仅在用户提供合法准确的竞品信息时生成' },
  english: { label: '英文关键词', labelEn: 'English Keywords', description: '面向海外市场与跨境平台' },
  'xhs-topic': { label: '小红书话题标签', labelEn: 'Xiaohongshu Hashtags', description: '用于内容搜索与话题传播' },
}

export const IMPORTANCE_META: Record<ImportanceId, { label: string; desc: string }> = {
  high: { label: '高', desc: '优先放进标题与主关键词位' },
  medium: { label: '中', desc: '用于卖点与后台关键词' },
  low: { label: '低', desc: '补充覆盖，避免重复堆词' },
}

export const IMAGE_QUALITY_META: Record<ImageQualityId, { label: string; desc: string }> = {
  standard: { label: '标准质量', desc: '速度更快、成本更低，适合批量试稿' },
  high: { label: '高质量', desc: '细节更好、耗时更长，适合最终出图' },
}

export const IMAGE_FORMAT_META: Record<ImageFormatId, { label: string; mime: string; ext: string }> = {
  png: { label: 'PNG', mime: 'image/png', ext: 'png' },
  jpeg: { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
  webp: { label: 'WEBP', mime: 'image/webp', ext: 'webp' },
}

/* ================= 平台文案块配置（图片/SEO 共用，可自行维护） ================= */

/**
 * 每个平台的文案结构。id 用于前后端对齐，label 是给用户看的名字。
 * 需要新增平台或调整某平台的文案块时，只改这张表即可（前后端同时生效）。
 */
export const PLATFORM_COPY_FORMATS: Record<
  PlatformId,
  { id: string; label: string; labelEn: string; note?: string }[]
> = {
  general: [
    { id: 'title', label: '商品标题', labelEn: 'Product Title' },
    { id: 'selling-points', label: '商品卖点', labelEn: 'Selling Points' },
    { id: 'keywords', label: '核心搜索词', labelEn: 'Core Search Terms' },
    { id: 'description', label: '商品描述要点', labelEn: 'Description Points' },
  ],
  taobao: [
    { id: 'title', label: '商品标题优化', labelEn: 'Optimized Title', note: '30 字以内，前 12 字放核心词' },
    { id: 'core-search', label: '核心搜索词', labelEn: 'Core Search Terms' },
    { id: 'longtail', label: '长尾搜索词', labelEn: 'Long-tail Terms' },
    { id: 'selling-points', label: '商品卖点', labelEn: 'Selling Points' },
    { id: 'detail-keywords', label: '详情页关键词', labelEn: 'Detail Page Keywords' },
  ],
  tmall: [
    { id: 'title', label: '商品标题（品牌向）', labelEn: 'Brand Title', note: '突出品牌与材质工艺' },
    { id: 'core-search', label: '核心搜索词', labelEn: 'Core Search Terms' },
    { id: 'selling-points', label: '品牌卖点', labelEn: 'Brand Selling Points' },
    { id: 'detail-keywords', label: '详情页关键词', labelEn: 'Detail Page Keywords' },
  ],
  jd: [
    { id: 'title', label: '商品标题（参数向）', labelEn: 'Spec-oriented Title' },
    { id: 'core-search', label: '核心搜索词', labelEn: 'Core Search Terms' },
    { id: 'attribute', label: '属性关键词', labelEn: 'Attribute Keywords' },
    { id: 'selling-points', label: '商品卖点与服务保障', labelEn: 'Selling Points' },
  ],
  pinduoduo: [
    { id: 'title', label: '商品标题', labelEn: 'Product Title', note: '短、直接、卖点前置' },
    { id: 'core-search', label: '核心关键词', labelEn: 'Core Keywords' },
    { id: 'attribute', label: '属性词', labelEn: 'Attribute Terms' },
    { id: 'need', label: '用户搜索需求词', labelEn: 'Need Keywords' },
  ],
  douyin: [
    { id: 'video-title', label: '短视频商品标题', labelEn: 'Video Product Title' },
    { id: 'video-desc', label: '视频描述', labelEn: 'Video Description' },
    { id: 'selling-points', label: '商品卖点', labelEn: 'Selling Points' },
    { id: 'hashtags', label: '话题标签', labelEn: 'Hashtags' },
    { id: 'promo', label: '推广文案', labelEn: 'Promotion Copy' },
  ],
  kuaishou: [
    { id: 'video-title', label: '短视频商品标题', labelEn: 'Video Product Title' },
    { id: 'video-desc', label: '视频描述', labelEn: 'Video Description' },
    { id: 'selling-points', label: '商品卖点', labelEn: 'Selling Points' },
    { id: 'hashtags', label: '话题标签', labelEn: 'Hashtags' },
    { id: 'promo', label: '推广文案', labelEn: 'Promotion Copy' },
  ],
  xiaohongshu: [
    { id: 'note-title', label: '笔记标题', labelEn: 'Note Title', note: '自然口语，不堆关键词' },
    { id: 'note-body', label: '种草正文', labelEn: 'Note Body' },
    { id: 'search-keywords', label: '搜索关键词', labelEn: 'Search Keywords' },
    { id: 'hashtags', label: '话题标签', labelEn: 'Hashtags' },
    { id: 'audience-need', label: '目标用户需求词', labelEn: 'Audience Need Terms' },
  ],
  amazon: [
    { id: 'title', label: '英文商品标题', labelEn: 'English Title', note: '建议 150–200 字符' },
    { id: 'bullets', label: '五点描述 Bullet Points', labelEn: 'Bullet Points' },
    { id: 'description', label: 'Product Description', labelEn: 'Product Description' },
    { id: 'search-terms', label: 'Search Terms', labelEn: 'Search Terms', note: '后台关键词，避免重复' },
    { id: 'longtail', label: '长尾搜索词', labelEn: 'Long-tail Terms' },
  ],
  ebay: [
    { id: 'title', label: '商品标题', labelEn: 'Item Title', note: '80 字符以内' },
    { id: 'item-specifics', label: '商品属性关键词', labelEn: 'Item Specifics' },
    { id: 'description', label: '商品描述', labelEn: 'Item Description' },
    { id: 'search-terms', label: '搜索词', labelEn: 'Search Terms' },
  ],
  shopify: [
    { id: 'seo-title', label: 'SEO Title', labelEn: 'SEO Title', note: '建议 60 字符以内' },
    { id: 'meta-description', label: 'Meta Description', labelEn: 'Meta Description', note: '建议 155 字符以内' },
    { id: 'url-slug', label: 'URL Slug 建议', labelEn: 'URL Slug' },
    { id: 'description', label: 'Product Description', labelEn: 'Product Description' },
    { id: 'keywords', label: 'SEO Keywords', labelEn: 'SEO Keywords' },
  ],
  etsy: [
    { id: 'title', label: '商品标题', labelEn: 'Listing Title', note: '前 40 字符放最重要关键词' },
    { id: 'tags', label: '商品标签 Tags', labelEn: 'Tags', note: '13 个标签，每个不超过 20 字符' },
    { id: 'description', label: '商品描述', labelEn: 'Description' },
    { id: 'longtail', label: '长尾搜索词', labelEn: 'Long-tail Terms' },
  ],
}
