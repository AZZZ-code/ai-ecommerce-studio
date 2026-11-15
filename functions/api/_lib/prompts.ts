import {
  EMPTY_PRODUCT_INFO,
  LANGUAGE_META,
  PLATFORM_META,
  PRODUCT_FIELD_LABELS,
  SECTION_META,
  STYLE_META,
  type CopyResult,
  type CopySection,
  type GeneratePayload,
  type LanguageMode,
  type SectionKey,
  type VisionAnalysis,
} from '../../../shared/types'

/* ============================== 视觉识别 ============================== */

export const VISION_SYSTEM_PROMPT = `你是一名严谨的商品视觉分析助手，服务于电商文案团队。
你的唯一任务是客观描述图片中"可以直接看到"的内容。

必须遵守的硬性规则：
1. 只描述图片里能直接观察到的信息：类别、颜色、外观、形状、结构、可见细节。
2. 严禁凭图片推断或编造以下属性：材质成分、尺寸、重量、容量、功率、性能参数、认证资质、品牌、价格、功效、产地、执行标准。
3. 如果需要这些信息，把它们写进 unconfirmedAttributes（表示"图片无法确认，需要用户补充"）。
4. possibleScenarios 只能作为"可能的使用场景"推测，措辞必须体现不确定性（例如"可能适合……"）。
5. 不确定就少写，宁可留空也不要猜。
6. 只输出一个 JSON 对象，不要输出 Markdown、解释或多余文字。`

export function buildVisionPrompt(payload: GeneratePayload): string {
  const { product } = payload
  const userHints = (Object.keys(product) as (keyof typeof product)[])
    .filter((key) => product[key]?.trim())
    .map((key) => `- ${PRODUCT_FIELD_LABELS[key]}：${product[key].trim()}`)
    .join('\n')

  return `请分析这张商品图片，严格按下面的 JSON 结构输出（不要增删字段）：

{
  "category": "最贴切的商品类别，例如：保温杯 / 蓝牙耳机 / 帆布托特包",
  "colors": ["图片中看到的主色，最多 4 个"],
  "appearance": "外观描述，40-80 字，只写看到的",
  "shape": "形状与结构，例如：圆柱形直身杯体，顶部带旋转杯盖",
  "visibleFeatures": ["可直接观察到的特征，3-6 条，每条不超过 20 字"],
  "possibleScenarios": ["可能的使用场景，2-4 条，措辞带不确定性"],
  "unconfirmedAttributes": ["图片无法确认、需要用户补充的属性，2-6 条"],
  "confidence": 0.0
}

补充说明：
- confidence 是 0 到 1 的数字，表示你对"类别判断"的把握。
${userHints ? `- 用户提供了以下补充信息，仅用于帮助理解图片，不得因此编造未在图片中出现的属性：\n${userHints}` : '- 用户没有提供任何补充信息，请完全基于图片判断。'}`
}

/* ============================== 文案生成 ============================== */

export const COPY_SYSTEM_PROMPT = `你是一名资深电商文案策划，同时服务国内电商（淘宝、拼多多、抖音、小红书）与跨境电商（Amazon、eBay）。

必须遵守的硬性规则：
1. 只能使用两类信息：图片识别出来的客观特征，以及用户明确提供的商品信息。
2. 用户没有提供的信息（材质、尺寸、重量、性能、认证、品牌、价格、功效）绝对不能编造；如果必须提及，用"[待补充：xxx]"这样的占位标记提醒商家补充。
3. 不写"最""第一""国家级""永久""100% 无效退款"等绝对化、无法证明的宣传语；不使用医疗功效承诺。
4. 不要声称通过任何平台官方审核或认证。
5. 标题要具体、可搜索，包含品类词与核心属性词，不堆砌无意义形容词。
6. 只输出一个 JSON 对象，不要输出 Markdown 代码块或解释文字。`

const PLATFORM_RULES: Record<keyof typeof PLATFORM_META, string> = {
  general: '通用电商：标题信息完整，卖点分层清晰，描述结构标准，任何平台都能直接改写使用。',
  taobao: '淘宝：标题包含核心搜索词 + 属性词，卖点覆盖材质/容量/设计/使用体验，描述分段说明参数与使用方式，语气可信、强调品质与服务。',
  tmall: '天猫：品牌向表达，突出品牌调性、品质与售后服务，标题含品牌词与品类词，避免绝对化用语，强调正品与体验一致性。',
  jd: '京东：参数与规格优先，标题结构为品牌 + 品类 + 关键规格，卖点强调性能与做工，描述以条目化参数表为主，语气理性、不夸张。',
  pinduoduo: '拼多多：短句、直白、卖点前置，突出实用价值与性价比，避免长篇大论，标题控制在 30 字以内。',
  douyin: '抖音：营销感强，开头 3 秒要有钩子，用口语化短句，结尾带明确行动号召，适合短视频挂车与直播口播。',
  kuaishou: '快手：口语化、实在、接地气，突出"能解决什么实际问题"与价格实惠，带话题标签，避免精致辞藻。',
  xiaohongshu: '小红书：第一人称生活化表达，场景感强，像真实使用分享，适度使用 emoji（不超过 5 个），避免硬广口吻。',
  amazon: 'Amazon：英文 Title 结构为 品牌 + 核心关键词 + 关键属性 + 规格 + 数量，五点描述每条以大写短语开头，客观、克制、不夸大，不使用促销性语言与竞品对比。',
  ebay: 'eBay：描述客观准确，条件（成色、包含配件）清晰，便于比价，不使用营销夸张词。',
  shopify: 'Shopify：SEO Title 控制在 60 字符内、Meta Description 150 字符内，URL Slug 用英文小写连字符，正文分段可扫读，语气为品牌独立站的克制专业感。',
  etsy: 'Etsy：手作与设计感优先，标题堆叠高意图关键词（用逗号或竖线分隔），Tags 用 13 个以内的英文短语，强调材质、工艺与使用场景。',
}

const STYLE_RULES: Record<keyof typeof STYLE_META, string> = {
  professional: '专业型：结构严谨、术语准确、信息密度高，适合品牌与跨境 Listing。',
  concise: '简洁型：句子短、去修饰、一条只讲一个信息点。',
  marketing: '营销型：强钩子、强对比、强调利益点，带明确行动号召。',
  lifestyle: '生活化：口语化、有场景、有细节，像朋友推荐。',
  premium: '高端商务型：克制、有质感，强调设计理念与细节工艺，不用感叹号与促销词。',
}

function languageRule(language: LanguageMode): string {
  if (language === 'zh') {
    return '语言模式：中文为主。zh 字段必须完整、可直接上架；en 字段给出对应的简洁英文版本（便于跨境复用，可略短）。'
  }
  if (language === 'en') {
    return '语言模式：英文为主。en 字段必须完整、地道、符合目标平台用语习惯；zh 字段给出对应的简洁中文版本（便于国内团队核对）。'
  }
  return '语言模式：中英双语。zh 与 en 两个字段都必须完整、专业、可直接使用，且内容语义一致（不是逐字直译）。'
}

function describeProductInfo(payload: GeneratePayload): string {
  const { product } = payload
  const entries = (Object.keys(product) as (keyof typeof product)[])
    .filter((key) => product[key]?.trim())
    .map((key) => `- ${PRODUCT_FIELD_LABELS[key]}：${product[key].trim()}`)
  if (!entries.length) {
    return '用户没有填写任何补充信息。因此文案中不得出现具体的材质、尺寸、重量、性能、认证与价格；需要这些信息的位置用 [待补充：xxx] 标记。'
  }
  return entries.join('\n')
}

function describeAnalysis(analysis: VisionAnalysis): string {
  const lines = [
    `- 类别：${analysis.category || '未识别'}`,
    `- 颜色：${analysis.colors.join('、') || '未识别'}`,
    `- 外观：${analysis.appearance || '未识别'}`,
    `- 形状：${analysis.shape || '未识别'}`,
    `- 可见特征：${analysis.visibleFeatures.join('；') || '未识别'}`,
    `- 可能场景（推测）：${analysis.possibleScenarios.join('；') || '无'}`,
    `- 无法确认、需要补充：${analysis.unconfirmedAttributes.join('；') || '无'}`,
  ]
  return lines.join('\n')
}

/** 分析结果的标题与说明：区分"视觉模型识别"与"仅文字整理"两种来源 */
function analysisBlock(analysis: VisionAnalysis): string {
  if (analysis.source === 'text-only') {
    return `【文字分析结果：本次未使用图片识别】
说明：本次没有调用视觉模型（当前配置的文本模型不支持图片输入），下面内容来自商家填写的文字信息整理，
不是图片识别结果。请只使用这些信息写作，不要推测商品的外观、颜色、材质与结构；
信息缺失处用 [待补充：xxx] 标记。

${describeAnalysis(analysis)}`
  }
  return `【图片识别结果（客观观察）】
${describeAnalysis(analysis)}`
}

/**
 * 当不使用视觉模型时（例如文本模型是 DeepSeek），把商家填写的文字信息整理成与
 * VisionAnalysis 同构的结构，让下游文案 prompt 无需分支即可复用。
 * 明确标记 source='text-only'，前端据此提示"未使用图片识别"，不会伪装成视觉识别。
 */
export function buildTextOnlyAnalysis(payload: GeneratePayload): VisionAnalysis {
  const product = payload.product ?? EMPTY_PRODUCT_INFO
  const colors = product.color
    ? product.color
        .split(/[、,，/;；\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    : []
  const features = [product.features, product.functions, product.extra]
    .filter((item) => item?.trim())
    .join('；')
  const appearance = [product.material ? `材质：${product.material}` : '', product.size ? `尺寸：${product.size}` : '']
    .filter(Boolean)
    .join('；')

  const unconfirmed: string[] = []
  if (!colors.length) unconfirmed.push('颜色')
  if (!product.material) unconfirmed.push('材质')
  if (!product.size) unconfirmed.push('尺寸')
  if (!product.features?.trim()) unconfirmed.push('产品特征')
  if (!product.scenarios?.trim()) unconfirmed.push('使用场景')

  return {
    category: product.category.trim() || product.name.trim() || '待补充',
    colors,
    appearance: appearance || '未提供（本次未使用图片识别，无法观察外观）',
    shape: '未提供（本次未使用图片识别，无法观察形状）',
    visibleFeatures: features ? features.split(/[；;]/).map((item) => item.trim()).filter(Boolean) : [],
    possibleScenarios: product.scenarios
      ? product.scenarios.split(/[、,，;；]/).map((item) => item.trim()).filter(Boolean)
      : [],
    unconfirmedAttributes: unconfirmed,
    confidence: 0,
    source: 'text-only',
  }
}

const FULL_SCHEMA = `{
  "title": { "zh": "中文商品标题", "en": "English product title" },
  "sellingPoints": {
    "zh": ["卖点1", "卖点2", "卖点3"],
    "en": ["point 1", "point 2", "point 3"]
  },
  "description": { "zh": "商品详细介绍，2-4 段，用 \\n\\n 分隔", "en": "Product description, 2-4 paragraphs" },
  "marketing": { "zh": "营销推广文案", "en": "Marketing copy" },
  "keywords": {
    "zh": ["关键词1", "关键词2"],
    "en": ["keyword 1", "keyword 2"]
  }
}`

export function buildCopyPrompt(payload: GeneratePayload, analysis: VisionAnalysis): string {
  const platform = PLATFORM_META[payload.platform]
  const style = STYLE_META[payload.style]

  return `请基于下面的商品信息，生成一套可以直接使用的电商文案。

【目标平台】${platform.label}（${platform.region}）— ${platform.desc}
【平台写作要求】${PLATFORM_RULES[payload.platform]}

【文案风格】${style.label} — ${STYLE_RULES[payload.style]}
【语言模式】${LANGUAGE_META[payload.language].label}
${languageRule(payload.language)}

${analysisBlock(analysis)}

【商家补充信息】
${describeProductInfo(payload)}

【输出要求】
- 卖点 3-5 条，每条一句话，先讲价值再讲支撑，不堆形容词。
- 详细介绍 2-4 段：外观与设计 → 使用方式与场景 → 适合人群（只写已确认的信息）。
- 营销文案 60-120 字（英文 40-80 words），带一句行动号召，可用于短视频/活动/社媒。
- 关键词 8-12 个（英文 10-15 个），覆盖品类词、属性词、场景词，用空格或短语，不要 # 号。
- 英文内容要符合目标市场表达习惯，不要中式英语。

严格按以下 JSON 结构输出，不要增删字段：
${FULL_SCHEMA}`
}

export function buildSectionPrompt(
  payload: GeneratePayload,
  analysis: VisionAnalysis,
  section: SectionKey,
): string {
  const meta = SECTION_META[section]
  const platform = PLATFORM_META[payload.platform]
  const style = STYLE_META[payload.style]
  return `这是一次"单模块重写"任务，只需要重写【${meta.label}】这一个模块。

【目标平台】${platform.label} — ${PLATFORM_RULES[payload.platform]}
【风格】${style.label} — ${STYLE_RULES[payload.style]}
【语言模式】${LANGUAGE_META[payload.language].label}
${languageRule(payload.language)}

${analysisBlock(analysis)}

【商家补充信息】
${describeProductInfo(payload)}

【本次只写】${meta.label}（${meta.labelEn}）：${meta.desc}

输出 JSON 结构（其他字段留空、留空数组，不要省略字段）：
${FULL_SCHEMA}`
}

/* ============================== 结果归一化 ============================== */

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .join('\n\n')
  }
  return fallback
}

function asStringArray(value: unknown, max = 15): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean)
      .slice(0, max)
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|、|,|，|;|；/)
      .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, max)
  }
  return []
}

interface Bilingual {
  zh: string
  en: string
}

function readBilingual(value: unknown): Bilingual {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return { zh: asString(obj.zh), en: asString(obj.en) }
  }
  // 模型有时会直接返回字符串，此时按中文处理
  const plain = asString(value)
  return { zh: plain, en: '' }
}

function readBilingualList(value: unknown, max: number): { zh: string[]; en: string[] } {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return { zh: asStringArray(obj.zh, max), en: asStringArray(obj.en, max) }
  }
  return { zh: asStringArray(value, max), en: [] }
}

/**
 * 把模型返回的任意结构归一化成前端可直接渲染的 CopyResult。
 * 模型偶尔会少字段或用错嵌套，这里全部做兜底，避免前端崩溃。
 */
export function normalizeCopyResult(raw: unknown): CopyResult {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // 与 normalizeAnalysis 同理：兼容 { copy: {...} } / { data: {...} } 这类多包一层的外壳
  let obj = root
  if (!('title' in root) && !('productTitle' in root) && !('sellingPoints' in root)) {
    for (const key of ['copy', 'copywriting', 'data', 'result', 'json']) {
      const candidate = root[key]
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        obj = candidate as Record<string, unknown>
        break
      }
    }
  }
  const title = readBilingual(obj.title ?? obj.productTitle ?? obj.name)
  const sellingPoints = readBilingualList(obj.sellingPoints ?? obj.selling_points ?? obj.points, 5)
  const description = readBilingual(obj.description ?? obj.detail ?? obj.intro)
  const marketing = readBilingual(obj.marketing ?? obj.marketingCopy ?? obj.promo)
  const keywords = readBilingualList(obj.keywords ?? obj.seoKeywords ?? obj.tags, 15)

  const sections: CopySection[] = [
    { key: 'title', zh: title.zh, en: title.en },
    {
      key: 'sellingPoints',
      zh: sellingPoints.zh.join('\n'),
      en: sellingPoints.en.join('\n'),
      zhList: sellingPoints.zh,
      enList: sellingPoints.en,
    },
    { key: 'description', zh: description.zh, en: description.en },
    { key: 'marketing', zh: marketing.zh, en: marketing.en },
    {
      key: 'keywords',
      zh: keywords.zh.join(' · '),
      en: keywords.en.join(' · '),
      zhList: keywords.zh,
      enList: keywords.en,
    },
  ]

  return { sections, title, sellingPoints, description, marketing, keywords }
}

export function normalizeAnalysis(raw: unknown): VisionAnalysis {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  /**
   * 有些模型会把结果包一层（{ analysis: {...} }、{ data: {...} }、{ result: {...} }），
   * 这里自动剥一层壳，避免外壳导致整份识别结果被判为空。
   */
  const nestedKeys = ['analysis', 'data', 'result', 'json']
  let obj = root
  if (!hasAnalysisFields(root)) {
    for (const key of nestedKeys) {
      const candidate = root[key]
      if (candidate && typeof candidate === 'object' && hasAnalysisFields(candidate as Record<string, unknown>)) {
        obj = candidate as Record<string, unknown>
        break
      }
    }
  }
  const confidenceRaw = Number(obj.confidence)
  return {
    category: asString(obj.category ?? obj.productCategory),
    colors: asStringArray(obj.colors ?? obj.color, 6),
    appearance: asString(obj.appearance ?? obj.look),
    shape: asString(obj.shape ?? obj.structure),
    visibleFeatures: asStringArray(obj.visibleFeatures ?? obj.features, 8),
    possibleScenarios: asStringArray(obj.possibleScenarios ?? obj.scenarios, 6),
    unconfirmedAttributes: asStringArray(obj.unconfirmedAttributes ?? obj.unknowns, 8),
    confidence: Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0,
  }
}

/** 判断对象是否已经是"平铺"的识别结果（至少命中一个核心字段） */
function hasAnalysisFields(obj: Record<string, unknown>): boolean {
  return ['category', 'productCategory', 'appearance', 'look', 'shape', 'visibleFeatures', 'features'].some(
    (key) => typeof obj[key] === 'string' || Array.isArray(obj[key]),
  )
}
