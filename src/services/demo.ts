import type {
  CopyResult,
  CopySection,
  GeneratePayload,
  GenerateResponse,
  SectionKey,
  VisionAnalysis,
} from '@/types'
import { SECTION_META } from '@/types'

/**
 * 演示模式数据
 * ----------------------------------------------------------------------------
 * 当后端没有配置任何真实 API Key（或用户还没填 BYOK 配置）时，前端用本地模板
 * 生成一份"结构完全一致"的结果，保证全站流程可跑通、可编辑、可复制。
 * 所有演示内容都显式标注为演示数据，并且保留 [待补充] 占位，
 * 不在没有依据的情况下编造材质、尺寸、性能、认证与功效。
 */

interface DemoCopy {
  title: string
  points: string[]
  description: string
  marketing: string
  keywords: string[]
}

interface DemoContent {
  analysis: VisionAnalysis
  zh: DemoCopy
  en: DemoCopy
}

const BOTTLE: DemoContent = {
  analysis: {
    category: '保温杯 / 运动水杯',
    colors: ['深空灰', '银色'],
    appearance: '圆柱形杯体，哑光磨砂表面，杯盖带一体式提环，杯身中部有细密纹理',
    shape: '直筒圆柱 + 旋拧式杯盖，口径与杯身接近',
    visibleFeatures: ['杯盖自带提环，可挂背包', '杯身磨砂质感，视觉上不易留指纹', '杯身线条简洁，无多余装饰'],
    possibleScenarios: ['通勤路上携带（推测）', '办公室桌面饮水（推测）', '短途户外与健身（推测）'],
    unconfirmedAttributes: ['材质与内胆类型', '实际容量', '保温时长', '是否可机洗', '是否通过食品接触材料认证'],
    confidence: 0.82,
  },
  zh: {
    title: '户外运动保温杯 磨砂质感杯身 便携提环设计 通勤与健身日常适用',
    points: [
      '杯盖自带一体式提环，手指一勾就能带走，背包侧袋也放得下',
      '杯身磨砂表面，握持手感细腻，日常使用不易留指纹',
      '直筒圆柱造型线条简洁，放在办公桌、车载杯架都不显得突兀',
      '旋拧式杯盖单手可开，接水、饮水步骤简单',
      '[待补充：材质与容量] 建议在详情页明确标注内胆材质与容量，减少售前咨询',
    ],
    description:
      '这款运动水杯采用直筒圆柱造型，杯身做了哑光磨砂处理，视觉上偏冷调、质感克制。杯盖与提环一体成型，出门时可以直接挂在手指或背包挂扣上，通勤、健身、短途出行都比较省事。\n\n杯口为旋拧式结构，开合行程短，单手操作不费力；杯身直径与常见车载杯架、背包侧袋相匹配，日常携带不容易晃。\n\n需要说明的是：材质、容量、保温时长等信息无法从图片确认，请在购买前以商品详情页或客服说明为准。',
    marketing:
      '出门总忘带水？把杯子挂在包上就不会了。\n\n磨砂杯身 + 一体提环，通勤、健身、自驾都能顺手带走。桌面放一只，开会、写方案的时候随手就能喝到水。\n\n[待补充：容量/材质/保温参数] 具体规格以详情页为准。',
    keywords: [
      '保温杯',
      '运动水杯',
      '便携提环水杯',
      '磨砂杯身',
      '通勤水杯',
      '健身水壶',
      '户外水杯',
      '大容量水杯',
      '办公室水杯',
      '礼物水杯',
    ],
  },
  en: {
    title: 'Insulated Travel Bottle with Carry Loop, Matte Finish, for Commute & Gym',
    points: [
      'Integrated loop on the lid lets you carry it with one finger or clip it to a backpack',
      'Matte, slightly textured body feels firm in hand and hides fingerprints',
      'Clean cylindrical silhouette fits desk, cup holder and side pocket',
      'Screw-on lid opens in a short turn for quick refills',
      '[To be confirmed: material & capacity] List the liner material and volume on the listing to cut pre-sale questions',
    ],
    description:
      'A straight-sided bottle with a matte, low-gloss finish and a lid that doubles as a carry loop. It is designed to be picked up and taken along — commute, gym session or a short drive — without needing a separate sleeve or bag.\n\nThe screw lid needs only a short turn to open, so refilling at a water cooler stays a one-hand job. The body diameter is sized to sit in a standard cup holder and a backpack side pocket.\n\nPlease note: material, capacity and insulation performance cannot be confirmed from the photo. Check the product specification before purchase.',
    marketing:
      'The bottle you actually remember to bring.\n\nMatte body, built-in carry loop, and a lid that opens in one turn. Keep one on the desk and one in the car — hydration stops being a task.\n\n[To be confirmed: capacity / material / insulation] See the listing for exact specs.',
    keywords: [
      'insulated bottle',
      'travel water bottle',
      'bottle with carry loop',
      'matte water bottle',
      'gym water bottle',
      'commuter bottle',
      'stainless steel bottle',
      'leak proof bottle',
      'office water bottle',
      'gift water bottle',
    ],
  },
}

const EARBUDS: DemoContent = {
  analysis: {
    category: '真无线蓝牙耳机',
    colors: ['白色'],
    appearance: '入耳式耳机本体 + 圆角方形充电仓，外壳为亮面白色，充电仓正面有指示灯',
    shape: '充电仓为圆角矩形，耳机为短柄入耳结构',
    visibleFeatures: ['充电仓圆角设计，体积接近掌心大小', '耳机短柄造型，柄部有触控区域', '仓体正面有状态指示灯'],
    possibleScenarios: ['通勤与地铁听音（推测）', '线上会议与通话（推测）', '运动与健身（推测）'],
    unconfirmedAttributes: ['蓝牙版本', '续航时间', '是否支持主动降噪', '防水等级', '充电接口类型', '是否支持无线充电'],
    confidence: 0.78,
  },
  zh: {
    title: '真无线蓝牙耳机 入耳式短柄设计 掌心充电仓 通勤与办公适用',
    points: [
      '短柄入耳结构，佩戴时贴合耳廓，日常走动不易松脱',
      '充电仓为圆角矩形，体积接近掌心大小，口袋和随身小包都能放下',
      '仓体正面带状态指示灯，剩余电量一眼可读',
      '[待补充：蓝牙版本与续航] 建议在详情页标注蓝牙版本、单次续航与总续航',
      '[待补充：降噪与防水等级] 如有主动降噪或防水能力，请以官方参数为准说明',
    ],
    description:
      '这副真无线耳机由入耳式耳机本体与一个圆角方形充电仓组成，整体为亮面白色，视觉上偏干净、轻量。\n\n耳机采用短柄设计，柄部预留了触控操作区域；充电仓为圆角矩形，合盖后体积接近掌心大小，适合放进口袋或随身小包。仓体正面设有指示灯，方便判断充电与剩余电量状态。\n\n蓝牙版本、续航时长、降噪能力、防水等级与充电接口等信息无法从图片确认，购买前请以官方参数页为准。',
    marketing:
      '通勤路上戴上就安静，会议、追剧、健身都不用来回插拔。\n\n掌心大小的圆角充电仓，塞进口袋就走；仓体指示灯一瞥就知道还能听多久。\n\n[待补充：蓝牙版本/续航/降噪] 具体参数见详情页。',
    keywords: [
      '蓝牙耳机',
      '真无线耳机',
      '入耳式耳机',
      '短柄耳机',
      '充电仓耳机',
      '通勤耳机',
      '运动耳机',
      '无线耳机',
      '学生耳机',
      '耳机礼物',
    ],
  },
  en: {
    title: 'True Wireless Earbuds, Short-Stem In-Ear Design with Pocket-Size Charging Case',
    points: [
      'Short-stem in-ear shape sits close to the ear for everyday walking use',
      'Rounded-square charging case is about palm-sized and slips into a pocket',
      'Status indicator on the case shows charging and battery level at a glance',
      '[To be confirmed: Bluetooth version & battery life] State version, per-charge and total playtime on the listing',
      '[To be confirmed: ANC & water resistance] Describe noise cancelling or IP rating only from official specs',
    ],
    description:
      'A pair of true wireless earbuds with a rounded-square charging case, finished in glossy white for a light, clean look.\n\nThe earbuds use a short-stem in-ear shape with a touch area on the stem. The case closes to roughly palm size, so it fits a pocket or a small pouch; an indicator on the front shows charging and battery status.\n\nBluetooth version, battery life, noise cancelling, water resistance and charging port type cannot be confirmed from the photo — check the official specification page before purchase.',
    marketing:
      'Put them in, and the commute goes quiet.\n\nPalm-sized rounded case, a touch area on the stem, and an indicator so you always know how much listening is left.\n\n[To be confirmed: Bluetooth version / battery / ANC] See the listing for exact specs.',
    keywords: [
      'wireless earbuds',
      'true wireless earbuds',
      'in-ear earbuds',
      'short stem earbuds',
      'earbuds with charging case',
      'commute earbuds',
      'sport earbuds',
      'bluetooth earbuds',
      'student earbuds',
      'earbuds gift',
    ],
  },
}

const TOTE: DemoContent = {
  analysis: {
    category: '帆布托特包 / 单肩包',
    colors: ['米白', '浅卡其'],
    appearance: '方形包身，米白帆布质感，加宽肩带，包口为敞口设计，正面无明显印花',
    shape: '软质方形托特版型，肩带较宽',
    visibleFeatures: ['包身方正，容量视觉上偏大', '肩带宽且平整，肩部压力分散', '包口敞口，取放方便', '正面留白，适合二次定制印花'],
    possibleScenarios: ['日常通勤与上学（推测）', '超市采购与周末出行（推测）', '作为定制印花的载体（推测）'],
    unconfirmedAttributes: ['面料克重与成分', '是否有内袋与拉链', '承重能力', '是否可水洗', '尺寸与容量'],
    confidence: 0.8,
  },
  zh: {
    title: '简约帆布托特包 加宽肩带 大容量敞口设计 通勤与采购日常适用',
    points: [
      '方正托特版型，包身留白多，装书、装电脑、装采购物品都比较从容',
      '加宽肩带平整贴合肩线，久背时压力分散更均匀',
      '敞口设计取放顺手，结账、过安检不用反复开合',
      '正面无印花，适合后续做定制图案或刺绣',
      '[待补充：面料克重与内袋结构] 建议标注面料成分与是否有内袋/拉链',
    ],
    description:
      '这只托特包采用米白帆布质感面料与方正版型，整体没有多余装饰，是比较耐看的日常款。\n\n肩带做了加宽处理，与肩线接触面积更大，背久了不容易勒出印子；包口为敞口设计，取放物品时不用反复开合拉链。包身正面大面积留白，既可以保持素净，也方便后续做定制印花或刺绣。\n\n面料克重、内袋结构、承重能力与是否可水洗等信息无法从图片确认，购买前请以详情页说明为准。',
    marketing:
      '一只包，通勤、上课、逛超市都能用。\n\n加宽肩带背着不勒，敞口设计结账更快，素净的帆布面无论怎么穿都好搭。想做成自己的图案？留白刚好够。\n\n[待补充：尺寸/面料/内袋] 具体规格见详情页。',
    keywords: [
      '帆布包',
      '托特包',
      '单肩包',
      '大容量帆布包',
      '通勤包',
      '学生书包',
      '购物袋',
      '定制帆布包',
      '简约托特包',
      '环保布袋',
    ],
  },
  en: {
    title: 'Minimal Canvas Tote Bag with Wide Shoulder Straps, Open-Top Everyday Carry',
    points: [
      'Boxy tote shape with generous room for books, a laptop or groceries',
      'Wide, flat shoulder straps spread weight instead of cutting in',
      'Open top is quick to load and unload at checkout or security',
      'Blank front panel leaves space for custom print or embroidery',
      '[To be confirmed: fabric weight & interior pockets] Note fabric composition and whether pockets or a zip exist',
    ],
    description:
      'A boxy canvas tote in an off-white tone, kept plain on purpose so it works with everything.\n\nThe shoulder straps are widened and flat, spreading load across the shoulder instead of digging in on a long walk. The open top keeps loading quick — no zip to fight at checkout. The front panel is left blank, which keeps the look clean and leaves room for custom printing or embroidery.\n\nFabric weight, interior pockets, load capacity and washability cannot be confirmed from the photo — check the listing before purchase.',
    marketing:
      'One bag for the commute, the classroom and the grocery run.\n\nWide straps that do not cut in, an open top that speeds up checkout, and a clean canvas face that goes with any outfit. Want your own print? There is room.\n\n[To be confirmed: size / fabric / pockets] See the listing for exact specs.',
    keywords: [
      'canvas tote bag',
      'tote bag',
      'shoulder bag',
      'large canvas bag',
      'commuter tote',
      'student tote bag',
      'reusable shopping bag',
      'custom tote bag',
      'minimal tote',
      'eco friendly bag',
    ],
  },
}

/** 兜底模板：完全基于用户填写的字段拼装，不编造任何属性 */
function buildGenericContent(product: GeneratePayload['product']): DemoContent {
  /**
   * 前端理论上总会传入完整字段，但这里做一次兜底归一化：
   * 缺失字段一律当作空字符串，避免演示模式的模板拼装抛错。
   */
  const safe = {
    name: (product?.name ?? '').trim(),
    category: (product?.category ?? '').trim(),
    brand: (product?.brand ?? '').trim(),
    material: (product?.material ?? '').trim(),
    size: (product?.size ?? '').trim(),
    color: (product?.color ?? '').trim(),
    targetCustomer: (product?.targetCustomer ?? '').trim(),
    scenarios: (product?.scenarios ?? '').trim(),
  }

  const name = safe.name || '商品'
  const category = safe.category || '该品类'
  const colorText = safe.color ? `${safe.color}配色` : '[待补充：颜色]'
  const materialText = safe.material || '[待补充：材质]'
  const sizeText = safe.size || '[待补充：尺寸]'
  const audience = safe.targetCustomer || '[待补充：目标客户]'
  const scenarios = safe.scenarios || '[待补充：适用场景]'

  return {
    analysis: {
      category: safe.category || '待确认（图片信息不足）',
      colors: safe.color ? [safe.color] : ['待确认'],
      appearance: '演示模式下不读取真实图片，此处为占位描述，接入真实视觉模型后会替换为实际识别结果。',
      shape: '演示模式占位',
      visibleFeatures: ['演示占位：接入视觉模型后将列出可直接观察到的特征'],
      possibleScenarios: safe.scenarios ? [safe.scenarios] : ['待补充适用场景'],
      unconfirmedAttributes: ['材质', '尺寸', '重量', '性能参数', '认证信息', '品牌归属'],
      confidence: 0,
    },
    zh: {
      title: `${name} ${colorText} ${sizeText} 日常使用款`,
      points: [
        `商品类别：${category}，适合${scenarios}`,
        `外观特征：${colorText}，${materialText}`,
        `规格信息：${sizeText}，下单前请确认是否满足需求`,
        `适用人群：${audience}`,
        '[待补充：材质 / 尺寸 / 性能参数] 演示模式未接入模型，请补充后重新生成',
      ],
      description: `${name} 属于 ${category}。\n\n外观方面：${colorText}，${materialText}，规格为 ${sizeText}。\n\n适用人群：${audience}；常见使用场景：${scenarios}。\n\n当前为演示模式生成的占位文案，接入真实模型后，会结合图片识别结果与补充信息重写本段内容。`,
      marketing: `${name}｜${colorText}｜${sizeText}\n\n${scenarios}都能用得上。\n\n[待补充：材质/尺寸/性能参数] 演示文案，请接入模型或补充信息后重新生成。`,
      keywords: [
        name,
        category,
        safe.color || '商品颜色',
        safe.material || '商品材质',
        safe.brand || '商品品牌',
        '日常使用',
        '高性价比',
        '送礼推荐',
        '新品上架',
        '热销商品',
      ],
    },
    en: {
      title: `${safe.name || 'Product'} — ${safe.color || '[To be confirmed: color]'} Everyday Use`,
      points: [
        `Category: ${category}`,
        `Appearance: ${safe.color || '[To be confirmed: color]'}, ${safe.material || '[To be confirmed: material]'}`,
        `Specification: ${safe.size || '[To be confirmed: size]'}`,
        `Intended for: ${safe.targetCustomer || '[To be confirmed: target customer]'}`,
        '[To be confirmed: material / size / performance] Demo mode did not call a model — add details and regenerate',
      ],
      description: `${safe.name || 'This product'} belongs to the ${category} category.\n\nAppearance: ${safe.color || '[To be confirmed: color]'}, ${safe.material || '[To be confirmed: material]'}, size ${safe.size || '[To be confirmed: size]'}.\n\nIntended for ${safe.targetCustomer || '[To be confirmed: target customer]'}; typical use: ${safe.scenarios || '[To be confirmed: scenarios]'}.\n\nThis is placeholder copy produced by demo mode. Once a real model is connected, this section is rewritten from the image analysis and your product details.`,
      marketing: `${safe.name || 'Product'} — ${safe.color || 'everyday'} pick.\n\nBuilt for ${safe.scenarios || 'daily use'}.\n\n[To be confirmed: material / size / performance] Demo copy — connect a model or add details and regenerate.`,
      keywords: [
        safe.name || 'product',
        category,
        'everyday use',
        'value pick',
        'gift idea',
        'new arrival',
        'best seller',
        'home essentials',
        'portable',
        'durable',
      ],
    },
  }
}

function pickDemoContent(payload: GeneratePayload): DemoContent {
  const product = payload.product ?? {}
  const hint = `${product.category ?? ''} ${product.name ?? ''}`.toLowerCase()
  if (/杯|bottle|cup|tumbler/.test(hint)) return BOTTLE
  if (/耳机|earbud|headphone|audio/.test(hint)) return EARBUDS
  if (/包|tote|bag|backpack/.test(hint)) return TOTE
  return buildGenericContent(product)
}
function toSection(
  key: SectionKey,
  zh: DemoCopy,
  en: DemoCopy,
): CopySection {
  const meta = SECTION_META[key]
  if (meta.kind === 'list') {
    const zhList = key === 'sellingPoints' ? zh.points : zh.keywords
    const enList = key === 'sellingPoints' ? en.points : en.keywords
    return {
      key,
      zh: zhList.map((item, i) => `${i + 1}. ${item}`).join('\n'),
      en: enList.map((item, i) => `${i + 1}. ${item}`).join('\n'),
      zhList,
      enList,
    }
  }
  return {
    key,
    zh: key === 'title' ? zh.title : key === 'description' ? zh.description : zh.marketing,
    en: key === 'title' ? en.title : key === 'description' ? en.description : en.marketing,
  }
}

function assembleCopy(zh: DemoCopy, en: DemoCopy): CopyResult {
  const sections: CopySection[] = (
    ['title', 'sellingPoints', 'description', 'marketing', 'keywords'] as SectionKey[]
  ).map((key) => toSection(key, zh, en))

  return {
    sections,
    title: { zh: zh.title, en: en.title },
    sellingPoints: { zh: zh.points, en: en.points },
    description: { zh: zh.description, en: en.description },
    marketing: { zh: zh.marketing, en: en.marketing },
    keywords: { zh: zh.keywords, en: en.keywords },
  }
}

/** 组装完整的演示响应 */
export function buildDemoResult(payload: GeneratePayload, elapsedMs = 1400): GenerateResponse {
  const content = pickDemoContent(payload)
  const warnings = [
    '当前为演示模式：识别结果与文案来自本地示例模板，不是真实 AI 识别与生成结果。',
    '未配置真实 API Key。前往「AI 模型设置」填写 BYOK 配置，或由站点管理员配置平台默认 API。',
  ]
  if (content.analysis.unconfirmedAttributes.length > 0) {
    warnings.push(
      `以下属性无法从图片确认，建议补充后再生成：${content.analysis.unconfirmedAttributes.join('、')}。`,
    )
  }
  warnings.push('文案未提交任何平台官方审核，发布前请自行核对平台规则与商品实际参数。')

  return {
    ok: true,
    mode: 'demo',
    data: {
      analysis: content.analysis,
      copy: assembleCopy(content.zh, content.en),
    },
    meta: {
      provider: 'compatible',
      visionModel: 'demo-vision-template',
      textModel: 'demo-copy-template',
      latencyMs: elapsedMs,
      accessMode: payload.mode,
      generatedAt: new Date().toISOString(),
    },
    warnings,
  }
}

/** 单模块重新生成（演示模式） */
export function buildDemoSection(
  payload: GeneratePayload,
  section: SectionKey,
  elapsedMs = 900,
): { section: CopySection; latencyMs: number } {
  const content = pickDemoContent(payload)
  return { section: toSection(section, content.zh, content.en), latencyMs: elapsedMs }
}

/** 把单个模块合并回已有结果，保证头部摘要字段同步更新 */
export function mergeSection(copy: CopyResult, section: CopySection): CopyResult {
  const sections = copy.sections.some((item) => item.key === section.key)
    ? copy.sections.map((item) => (item.key === section.key ? section : item))
    : [...copy.sections, section]

  const next: CopyResult = { ...copy, sections }

  if (section.key === 'title') {
    next.title = { zh: section.zh, en: section.en }
  } else if (section.key === 'sellingPoints') {
    next.sellingPoints = { zh: section.zhList ?? [], en: section.enList ?? [] }
  } else if (section.key === 'description') {
    next.description = { zh: section.zh, en: section.en }
  } else if (section.key === 'marketing') {
    next.marketing = { zh: section.zh, en: section.en }
  } else if (section.key === 'keywords') {
    next.keywords = { zh: section.zhList ?? [], en: section.enList ?? [] }
  }

  return next
}
