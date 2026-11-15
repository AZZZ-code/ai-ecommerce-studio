import type {
  KeywordCategoryId,
  KeywordCoverage,
  KeywordGroup,
  KeywordItem,
  PlatformId,
  ProductInfo,
  SeoCopyBlock,
  SeoKeywordPayload,
  VisionAnalysis,
} from '../../../shared/types'
import {
  IMPORTANCE_META,
  KEYWORD_CATEGORY_META,
  LANGUAGE_META,
  PLATFORM_COPY_FORMATS,
  PLATFORM_META,
  STYLE_META,
} from '../../../shared/types'

/**
 * SEO 关键词提示词与结果归一化
 * ----------------------------------------------------------------------------
 * 硬性要求：
 * 1. 必须分类输出（10 类），每类给出可执行的使用建议。
 * 2. 不得虚构搜索量 / 排名 / 竞争度 / 转化率 —— 只允许给「相关性建议」。
 * 3. 竞品对比词只有在用户提供了合法准确的竞品信息时才允许生成。
 * 4. 文案块按平台差异化（淘宝标题 / Amazon 五点 / Shopify Meta…）。
 */

export const SEO_SYSTEM_PROMPT = [
  '你是资深电商运营与 SEO 关键词专家，服务对象是真实的店铺运营人员。',
  '规则（必须全部遵守）：',
  '1. 只输出 JSON，不要输出任何解释性文字。',
  '2. 关键词必须贴近真实买家的搜索习惯，宁可少而准，不要为了数量堆无关词。',
  '3. 严禁编造搜索量、搜索排名、竞争程度、转化率等数据；不要出现任何数字指标。',
  '4. 严禁编造商品属性：材质、尺寸、参数、认证、功效都必须来自商家提供的信息或图片中可见的事实，缺失就不要写。',
  '5. 品牌关键词只允许使用商家明确提供的真实品牌名；没有品牌就不要输出品牌词。',
  '6. 竞品对比词只有在商家提供了竞品信息时才生成，并标记需要人工确认。',
  '7. 不要声称文案已经通过任何平台的官方审核，也不要保证搜索排名。',
].join('\n')

/** 每个平台需要的文案块来自 shared/types.ts 的 PLATFORM_COPY_FORMATS（与前端同源） */
function describeProduct(product: ProductInfo): string {
  const rows: [string, string][] = [
    ['商品名称', product.name],
    ['商品类别', product.category],
    ['品牌', product.brand],
    ['材质', product.material],
    ['尺寸', product.size],
    ['颜色', product.color],
    ['价格', product.price],
    ['目标客户', product.targetCustomer],
    ['适用场景', product.scenarios],
    ['商品功能', product.functions],
    ['已知特点', product.features],
    ['其他补充', product.extra],
  ]
  return rows
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}：${value}`)
    .join('\n')
}

function describeAnalysis(analysis: VisionAnalysis | null | undefined): string {
  if (!analysis) return '（本次没有图片识别结果）'
  const rows: string[] = []
  if (analysis.category) rows.push(`类别：${analysis.category}`)
  if (analysis.colors?.length) rows.push(`颜色：${analysis.colors.join('、')}`)
  if (analysis.appearance) rows.push(`外观：${analysis.appearance}`)
  if (analysis.shape) rows.push(`结构：${analysis.shape}`)
  if (analysis.visibleFeatures?.length) rows.push(`可见特征：${analysis.visibleFeatures.join('；')}`)
  if (analysis.possibleScenarios?.length) rows.push(`可能场景：${analysis.possibleScenarios.join('；')}`)
  return rows.length > 0 ? rows.join('\n') : '（图片识别结果为空）'
}

/** 组装 SEO 关键词提示词 */
export function buildSeoPrompt(payload: SeoKeywordPayload): string {
  const platform = PLATFORM_META[payload.platform]
  const formats = PLATFORM_COPY_FORMATS[payload.platform]
  const categorySpec = (Object.keys(KEYWORD_CATEGORY_META) as KeywordCategoryId[])
    .map((id) => {
      const meta = KEYWORD_CATEGORY_META[id]
      return `- ${id}（${meta.label}）：${meta.description}`
    })
    .join('\n')

  const schema = {
    groups: [
      {
        id: 'core',
        keywords: [
          {
            term: '关键词',
            intent: '搜索意图（一句话，用户想解决什么）',
            placement: '推荐使用位置（如：标题前 12 字 / 后台 Search Terms / 话题标签）',
            importance: 'high | medium | low',
            needsReview: false,
            note: '可选：需要人工确认的原因',
          },
        ],
      },
    ],
    copyBlocks: [{ id: 'title', content: '该平台的文案内容' }],
  }

  const lines = [
    `平台：${platform.label}（${platform.region}）— ${platform.desc}；文风：${platform.tone}`,
    `文案风格：${STYLE_META[payload.style].label}（${STYLE_META[payload.style].desc}）`,
    `语言：${LANGUAGE_META[payload.language].label}`,
    '',
    '商家提供的商品信息：',
    describeProduct(payload.product) || '（用户未填写，只能基于图片识别结果）',
    '',
    '图片识别结果（客观观察）：',
    describeAnalysis(payload.analysis),
    '',
    '需要输出的关键词分类（每一类 3–8 个，允许少给，不允许凑数）：',
    categorySpec,
    '',
    payload.competitorInfo
      ? `商家提供的竞品信息（仅可用于 competitor 类，且必须标记 needsReview=true）：${payload.competitorInfo}`
      : '商家没有提供竞品信息：competitor 类必须返回空数组 keywords: []。',
    '',
    '需要输出的平台文案块（按顺序全部输出，id 必须完全一致）：',
    formats.map((item) => `- ${item.id}（${item.label}${item.note ? `；${item.note}` : ''}）`).join('\n'),
    '',
    '输出 JSON 结构（严格遵守，不要增删字段）：',
    JSON.stringify(schema, null, 2),
    '',
    '再次强调：不要输出任何搜索量、排名、竞争度、转化率数字；不要编造商品属性。',
  ]
  return lines.join('\n')
}

/* ------------------------------------------------------------------------ */
/*                              结果归一化                                  */
/* ------------------------------------------------------------------------ */

const CATEGORY_IDS = Object.keys(KEYWORD_CATEGORY_META) as KeywordCategoryId[]

function trimTo(value: string, max: number): string {
  return value.trim().slice(0, max)
}

function asImportance(value: unknown): KeywordItem['importance'] {
  const raw = String(value ?? '').toLowerCase()
  return raw === 'high' || raw === 'low' ? (raw as 'high' | 'low') : 'medium'
}

function normalizeItem(raw: unknown): KeywordItem | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const term = trimTo(String(obj.term ?? ''), 80)
  if (!term) return null
  return {
    term,
    intent: trimTo(String(obj.intent ?? ''), 120) || '未说明搜索意图',
    placement: trimTo(String(obj.placement ?? ''), 120) || '建议放入标题或后台关键词',
    importance: asImportance(obj.importance),
    needsReview: obj.needsReview === true,
    ...(obj.note ? { note: trimTo(String(obj.note), 160) } : {}),
  }
}

/** 去重（同一类别内 + 全局软去重）并统计覆盖情况 */
export function normalizeSeoResult(
  parsed: unknown,
  payload: SeoKeywordPayload,
): { groups: KeywordGroup[]; coverage: KeywordCoverage; warnings: string[] } {
  const warnings: string[] = []
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
  const rawGroups = Array.isArray(root.groups) ? (root.groups as Record<string, unknown>[]) : []

  const seen = new Set<string>()
  let duplicatesRemoved = 0

  const groups: KeywordGroup[] = CATEGORY_IDS.map((id) => {
    const meta = KEYWORD_CATEGORY_META[id]
    const found = rawGroups.find((group) => String(group.id ?? '') === id)
    const rawKeywords = found && Array.isArray(found.keywords) ? found.keywords : []
    const keywords: KeywordItem[] = []
    for (const raw of rawKeywords) {
      const item = normalizeItem(raw)
      if (!item) continue
      const key = item.term.toLowerCase().replace(/\s+/g, '')
      if (seen.has(key)) {
        duplicatesRemoved += 1
        continue
      }
      seen.add(key)
      // 竞品词必须人工确认；品牌词同理
      if (id === 'competitor' || id === 'brand') item.needsReview = true
      keywords.push(item)
    }
    return {
      id,
      label: meta.label,
      labelEn: meta.labelEn,
      description: meta.description,
      keywords,
    }
  })

  // 没有竞品信息却出现了竞品词 → 直接清空，避免生成无依据的对比词
  if (!payload.competitorInfo) {
    const competitor = groups.find((group) => group.id === 'competitor')
    if (competitor && competitor.keywords.length > 0) {
      warnings.push('未提供竞品信息，已忽略模型生成的竞品对比词（避免无依据对比）。')
      competitor.keywords = []
    }
  }

  const total = groups.reduce((sum, group) => sum + group.keywords.length, 0)
  const byGroup = Object.fromEntries(groups.map((group) => [group.id, group.keywords.length])) as Record<
    KeywordCategoryId,
    number
  >
  const flat = groups.flatMap((group) => group.keywords)
  const coverage: KeywordCoverage = {
    total,
    unique: seen.size,
    duplicatesRemoved,
    high: flat.filter((item) => item.importance === 'high').length,
    medium: flat.filter((item) => item.importance === 'medium').length,
    low: flat.filter((item) => item.importance === 'low').length,
    needsReview: flat.filter((item) => item.needsReview).length,
    byGroup,
  }

  if (total === 0) {
    throw new Error('模型没有返回任何有效关键词')
  }
  if (coverage.needsReview > 0) {
    warnings.push(`有 ${coverage.needsReview} 个关键词需要人工确认（品牌 / 竞品 / 平台规则相关）。`)
  }
  warnings.push('关键词为 AI 相关性建议，不包含真实搜索量、排名或竞争度数据。')
  return { groups, coverage, warnings }
}

/** 平台文案块归一化：保证顺序与 id 与配置表一致 */
export function normalizeCopyBlocks(
  parsed: unknown,
  platform: PlatformId,
): SeoCopyBlock[] {
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
  const rawBlocks = Array.isArray(root.copyBlocks) ? (root.copyBlocks as Record<string, unknown>[]) : []
  const formats = PLATFORM_COPY_FORMATS[platform]
  return formats.map((format) => {
    const found = rawBlocks.find((block) => String(block.id ?? '') === format.id)
    return {
      id: format.id,
      label: format.label,
      labelEn: format.labelEn,
      content: found ? String(found.content ?? '').trim().slice(0, 3000) : '',
      ...(format.note ? { note: format.note } : {}),
    }
  })
}

/** 演示模式：完全基于用户填写的字段生成，不调用任何模型 */
export function buildDemoSeo(
  payload: SeoKeywordPayload,
): { groups: KeywordGroup[]; copyBlocks: SeoCopyBlock[]; coverage: KeywordCoverage; warnings: string[] } {
  const p = payload.product
  const base = p.name || p.category || '商品'
  const attrs = [p.material, p.color, p.size].filter(Boolean) as string[]
  const scenarios = (p.scenarios || '').split(/[、,，/;；\s]+/).filter(Boolean)
  const audiences = (p.targetCustomer || '').split(/[、,，/;；\s]+/).filter(Boolean)

  const mk = (
    term: string,
    intent: string,
    placement: string,
    importance: KeywordItem['importance'],
    needsReview = false,
  ): KeywordItem => ({ term, intent, placement, importance, needsReview })

  const groups: KeywordGroup[] = (Object.keys(KEYWORD_CATEGORY_META) as KeywordCategoryId[]).map((id) => {
    const meta = KEYWORD_CATEGORY_META[id]
    let keywords: KeywordItem[] = []
    if (id === 'core') {
      keywords = [mk(base, `搜索「${base}」的用户`, '标题前 12 字', 'high')]
      if (p.category) keywords.push(mk(p.category, '按品类浏览', '标题 / 类目词', 'high'))
    } else if (id === 'attribute') {
      keywords = attrs.map((attr) => mk(`${base} ${attr}`, '按属性筛选', '卖点 / 后台关键词', 'medium'))
    } else if (id === 'longtail') {
      keywords = [
        mk(`${base} ${p.functions || '使用场景'}`, '带功能的搜索', '详情页 / 搜索词', 'medium'),
        mk(`${base} 推荐`, '寻找推荐', '笔记 / 短视频描述', 'low'),
      ].filter((item) => item.term.trim().length > 2)
    } else if (id === 'scenario') {
      keywords = scenarios.map((sc) => mk(`${sc} ${base}`, '场景化搜索', '场景卖点 / 话题', 'medium'))
    } else if (id === 'audience') {
      keywords = audiences.map((au) => mk(`${au} ${base}`, '人群定向', '投放人群词', 'medium'))
    } else if (id === 'need') {
      keywords = [
        mk(`${base} 好用吗`, '购买前评估', '内容种草', 'low', true),
        mk(`${base} 怎么选`, '选购决策', '长尾内容', 'medium'),
      ]
    } else if (id === 'brand') {
      keywords = p.brand ? [mk(p.brand, '品牌词搜索', '标题 / 品牌区', 'high', true)] : []
    } else if (id === 'competitor') {
      keywords = []
    } else if (id === 'english') {
      keywords = [mk(base, 'Overseas search', 'Amazon title / Search Terms', 'medium')]
    } else if (id === 'xhs-topic') {
      keywords = [`#${base}`, `#${p.category || '好物推荐'}`].map((tag) =>
        mk(tag, '话题聚合', '小红书话题标签', 'low'),
      )
    }
    return { id, label: meta.label, labelEn: meta.labelEn, description: meta.description, keywords }
  })

  const flat = groups.flatMap((group) => group.keywords)
  const byGroup = Object.fromEntries(groups.map((group) => [group.id, group.keywords.length])) as Record<
    KeywordCategoryId,
    number
  >

  const copyBlocks: SeoCopyBlock[] = PLATFORM_COPY_FORMATS[payload.platform].map((format) => ({
    id: format.id,
    label: format.label,
    labelEn: format.labelEn,
    content: `${format.label}（演示内容）：${base}${attrs.length ? ` · ${attrs.join(' / ')}` : ''}`,
    ...(format.note ? { note: format.note } : {}),
  }))

  return {
    groups,
    copyBlocks,
    coverage: {
      total: flat.length,
      unique: flat.length,
      duplicatesRemoved: 0,
      high: flat.filter((item) => item.importance === 'high').length,
      medium: flat.filter((item) => item.importance === 'medium').length,
      low: flat.filter((item) => item.importance === 'low').length,
      needsReview: flat.filter((item) => item.needsReview).length,
      byGroup,
    },
    warnings: [
      '当前为演示模式：关键词与文案由本地模板根据你填写的字段拼装，不是真实 AI 生成结果。',
      '关键词不含任何真实搜索量 / 排名 / 竞争度数据，接入文本模型后才会得到 AI 建议。',
    ],
  }
}

export { IMPORTANCE_META }
