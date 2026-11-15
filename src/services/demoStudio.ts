/**
 * 演示数据（图片创作 + SEO 关键词）
 * ----------------------------------------------------------------------------
 * 没有配置真实模型时，页面必须仍然可用 —— 但演示结果一定要能被一眼认出：
 *  - 图片：用本地 SVG 画一张占位图，画面里直接写"演示数据 · 非真实 AI 生成"；
 *  - 关键词：本地模板拼装，文案块后缀「（演示内容）」，并附禁用声明。
 * 绝不把模拟结果伪装成真实模型输出。
 */
import {
  IMAGE_TYPE_META,
  KEYWORD_CATEGORY_META,
  PLATFORM_META,
  PLATFORM_IMAGE_SPEC,
  type ImageGeneratePayload,
  type ImageGenerateResponse,
  type KeywordCoverage,
  type KeywordGroup,
  type KeywordItem,
  type SeoCopyBlock,
  type SeoKeywordPayload,
  type SeoKeywordResponse,
  PLATFORM_COPY_FORMATS,
} from '@/types'

/* ============================ 图片创作演示 ============================ */

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 画一张带明确"演示数据"标注的占位效果图 */
function demoImageSvg(payload: ImageGeneratePayload, index: number): string {
  const spec = PLATFORM_IMAGE_SPEC[payload.platform]
  const typeMeta = IMAGE_TYPE_META[payload.imageType]
  const name = (payload.product?.name || payload.product?.category || '商品').slice(0, 18)
  const w = payload.width
  const h = payload.height
  const label = `${spec.label} · ${typeMeta.label} · ${w}×${h}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" rx="${Math.min(w, h) * 0.04}"
        fill="none" stroke="#93c5fd" stroke-width="${Math.max(2, Math.round(w / 400))}" stroke-dasharray="${w / 40} ${w / 60}"/>
  <text x="50%" y="42%" text-anchor="middle" font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${Math.round(w / 22)}" font-weight="700" fill="#1d4ed8">演示数据 · 非真实 AI 生成</text>
  <text x="50%" y="52%" text-anchor="middle" font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${Math.round(w / 34)}" fill="#1e40af">${name}</text>
  <text x="50%" y="60%" text-anchor="middle" font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${Math.round(w / 46)}" fill="#2563eb">${label}</text>
  <text x="50%" y="68%" text-anchor="middle" font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${Math.round(w / 52)}" fill="#3b82f6">画面中不会出现错别字或虚假参数</text>
  <text x="50%" y="90%" text-anchor="middle" font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${Math.round(w / 60)}" fill="#60a5fa">${spec.stylePreset.slice(0, 28)} · 变体 ${index + 1}</text>
</svg>`
}

export function buildDemoImageResult(
  payload: ImageGeneratePayload,
  latencyMs = 1200,
): ImageGenerateResponse {
  const outputFormat = payload.modelConfig?.format ?? 'png'
  const count = Math.max(1, payload.count ?? 1)
  const now = new Date().toISOString()
  const images = Array.from({ length: count }, (_, index) => ({
    id: `demo-img-${Date.now()}-${index}`,
    url: svgDataUrl(demoImageSvg(payload, index)),
    demo: true,
    width: payload.width,
    height: payload.height,
    format: outputFormat,
    prompt: `（演示）${PLATFORM_META[payload.platform].label} · ${IMAGE_TYPE_META[payload.imageType].label}`,
    createdAt: now,
  }))

  return {
    ok: true,
    mode: 'demo',
    platform: payload.platform,
    imageType: payload.imageType,
    fidelity: payload.fidelity,
    images,
    prompt: `（演示模式）平台：${PLATFORM_META[payload.platform].label}；类型：${
      IMAGE_TYPE_META[payload.imageType].label
    }；保真模式：${payload.fidelity === 'fidelity' ? '商品保真' : '创意营销'}；画幅：${payload.width}×${payload.height}。`,
    negativePrompt: '演示模式不会调用任何模型，也没有真实提示词发送出去。',
    meta: {
      provider: 'custom-image',
      model: 'demo-image-template',
      quality: 'standard',
      format: outputFormat,
      width: payload.width,
      height: payload.height,
      latencyMs,
      accessMode: payload.mode,
    },
    warnings: [
      '当前为演示模式：这些图片是本地生成的占位图，不是真实 AI 生成结果，不能用于上架。',
      '配置真实的图片模型（如 Gemini 图片生成 / OpenAI GPT Image）后，才会调用模型生成真实效果图。',
      '即使真实生成，也建议人工核对商品细节是否与实物一致。',
    ],
  }
}

/* ============================ SEO 演示 ============================ */

const NEED_SUFFIX: Record<string, string> = {
  core: '',
  attribute: '',
  longtail: '',
  scenario: '',
  audience: '',
  need: '',
  brand: '',
  competitor: '',
  english: '',
  'xhs-topic': '',
}

function item(
  term: string,
  intent: string,
  placement: string,
  importance: KeywordItem['importance'],
  needsReview = false,
): KeywordItem {
  return { term: term.trim(), intent, placement, importance, needsReview: needsReview || Boolean(NEED_SUFFIX.term) }
}

/** 计算覆盖情况：去重、按重要程度计数 */
export function computeCoverage(groups: KeywordGroup[]): KeywordCoverage {
  const seen = new Set<string>()
  let total = 0
  let duplicatesRemoved = 0
  const byGroup: KeywordCoverage['byGroup'] = Object.fromEntries(
    (Object.keys(KEYWORD_CATEGORY_META) as (keyof typeof KEYWORD_CATEGORY_META)[]).map((id) => [id, 0]),
  ) as KeywordCoverage['byGroup']
  let high = 0
  let medium = 0
  let low = 0
  let needsReview = 0
  for (const group of groups) {
    let uniqueInGroup = 0
    for (const keyword of group.keywords) {
      total += 1
      const key = keyword.term.trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) {
        duplicatesRemoved += 1
        continue
      }
      seen.add(key)
      uniqueInGroup += 1
      if (keyword.importance === 'high') high += 1
      else if (keyword.importance === 'medium') medium += 1
      else low += 1
      if (keyword.needsReview) needsReview += 1
    }
    byGroup[group.id] = uniqueInGroup
  }
  return {
    total,
    unique: seen.size,
    duplicatesRemoved,
    high,
    medium,
    low,
    needsReview,
    byGroup,
  }
}

export function buildDemoSeoResult(payload: SeoKeywordPayload, latencyMs = 1100): SeoKeywordResponse {
  const p = payload.product ?? {}
  const name = (p.name || '').trim()
  const category = (p.category || '').trim()
  const brand = (p.brand || '').trim()
  const color = (p.color || '').trim()
  const material = (p.material || '').trim()
  const size = (p.size || '').trim()
  const scenario = (p.scenarios || '').trim()
  const audience = (p.targetCustomer || '').trim()
  const funcs = (p.functions || '').trim()
  const spec = PLATFORM_IMAGE_SPEC[payload.platform]
  const platformLabel = PLATFORM_META[payload.platform].label
  const base = name || category || '商品'
  const cat = category || '商品'

  const groups: KeywordGroup[] = [
    {
      id: 'core',
      label: KEYWORD_CATEGORY_META.core.label,
      labelEn: KEYWORD_CATEGORY_META.core.labelEn,
      description: KEYWORD_CATEGORY_META.core.description,
      keywords: [
        item(base, '直接搜索该商品', `${platformLabel} 商品标题前段`, 'high'),
        item(cat, '按品类浏览或搜索', '标题 + 类目属性', 'high'),
        item(`${base} 正品`, '带品质意图的搜索', '标题 + 详情人气区', 'medium'),
      ].filter((k) => k.term),
    },
    {
      id: 'attribute',
      label: KEYWORD_CATEGORY_META.attribute.label,
      labelEn: KEYWORD_CATEGORY_META.attribute.labelEn,
      description: KEYWORD_CATEGORY_META.attribute.description,
      keywords: [
        color && item(`${color} ${cat}`, '按颜色筛选', '标题属性位 / SKU 名', 'medium'),
        material && item(`${material} ${cat}`, '按材质筛选', '属性栏 + 详情参数', 'medium'),
        size && item(`${size} ${cat}`, '按规格筛选', 'SKU 名称', 'medium', true),
        item(`${cat} 加厚款`, '按款式筛选', '标题尾段', 'low', true),
      ].filter(Boolean) as KeywordItem[],
    },
    {
      id: 'longtail',
      label: KEYWORD_CATEGORY_META.longtail.label,
      labelEn: KEYWORD_CATEGORY_META.longtail.labelEn,
      description: KEYWORD_CATEGORY_META.longtail.description,
      keywords: [
        item(`${base} ${cat} 推荐`, '比较型长尾搜索', '详情页标题、内容标题', 'medium'),
        item(`${cat} 值得买吗`, '决策前调研', '小红书笔记标题 / 内容正文', 'low'),
        item(`${base} 怎么选`, '选购咨询', '内容正文小标题', 'low'),
      ],
    },
    {
      id: 'scenario',
      label: KEYWORD_CATEGORY_META.scenario.label,
      labelEn: KEYWORD_CATEGORY_META.scenario.labelEn,
      description: KEYWORD_CATEGORY_META.scenario.description,
      keywords: [
        scenario
          ? item(`${scenario} ${cat}`, '按使用场景搜索', '详情页场景段落 / 话题', 'medium')
          : item(`日常家用 ${cat}`, '按使用场景搜索', '详情页场景段落', 'low', true),
        item(`户外 ${cat}`, '按出行场景搜索', '内容正文 / 话题标签', 'low', true),
      ],
    },
    {
      id: 'audience',
      label: KEYWORD_CATEGORY_META.audience.label,
      labelEn: KEYWORD_CATEGORY_META.audience.labelEn,
      description: KEYWORD_CATEGORY_META.audience.description,
      keywords: [
        audience
          ? item(`${audience} ${cat}`, '按人群搜索', '详情页人群说明', 'medium')
          : item(`学生党 ${cat}`, '按人群搜索', '内容正文', 'low', true),
        item(`送人 ${cat}`, '礼赠需求', '营销文案 / 话题', 'low'),
      ],
    },
    {
      id: 'need',
      label: KEYWORD_CATEGORY_META.need.label,
      labelEn: KEYWORD_CATEGORY_META.need.labelEn,
      description: KEYWORD_CATEGORY_META.need.description,
      keywords: [
        funcs
          ? item(`${funcs.split(/[、,，;；]/)[0]?.trim() ?? funcs} 的 ${cat}`, '带着明确需求搜索', '卖点首条', 'high', true)
          : item(`${cat} 怎么选不踩坑`, '解决选择困难', '内容正文', 'low', true),
      ],
    },
    {
      id: 'brand',
      label: KEYWORD_CATEGORY_META.brand.label,
      labelEn: KEYWORD_CATEGORY_META.brand.labelEn,
      description: KEYWORD_CATEGORY_META.brand.description,
      keywords: brand
        ? [item(`${brand} ${cat}`, '品牌词搜索', '标题品牌位', 'high', true)]
        : [item('（未填写品牌，演示模式不生成品牌词）', '—', '—', 'low', true)],
    },
    {
      id: 'competitor',
      label: KEYWORD_CATEGORY_META.competitor.label,
      labelEn: KEYWORD_CATEGORY_META.competitor.labelEn,
      description: KEYWORD_CATEGORY_META.competitor.description,
      keywords: payload.competitorInfo
        ? [item(`${payload.competitorInfo} 对比`, '竞品对比调研', '内容正文（需人工确认）', 'low', true)]
        : [item('（未提供竞品信息，演示模式不生成竞品词）', '—', '—', 'low', true)],
    },
    {
      id: 'english',
      label: KEYWORD_CATEGORY_META.english.label,
      labelEn: KEYWORD_CATEGORY_META.english.labelEn,
      description: KEYWORD_CATEGORY_META.english.description,
      keywords: [
        item(cat.replace(/[\u4e00-\u9fa5]/g, '').trim() || 'product', '海外市场品类搜索', 'Amazon Search Terms', 'medium', true),
        item(`${base.replace(/[\u4e00-\u9fa5]/g, '').trim() || 'item'} gift`, '礼赠场景英文词', 'Etsy Tags / Amazon', 'low', true),
      ],
    },
    {
      id: 'xhs-topic',
      label: KEYWORD_CATEGORY_META['xhs-topic'].label,
      labelEn: KEYWORD_CATEGORY_META['xhs-topic'].labelEn,
      description: KEYWORD_CATEGORY_META['xhs-topic'].description,
      keywords: [
        item(`#${base.replace(/\s+/g, '')}分享`, '内容话题传播', '小红书笔记话题', 'medium'),
        item(`#${cat.replace(/\s+/g, '')}好物`, '好物推荐话题', '小红书笔记话题', 'medium'),
      ],
    },
  ]

  const copyBlocks: SeoCopyBlock[] = PLATFORM_COPY_FORMATS[payload.platform].map((format) => ({
    id: format.id,
    label: format.label,
    labelEn: format.labelEn,
    content:
      spec.language === 'en'
        ? `[Demo] ${format.labelEn}: ${base} — placeholder copy. Configure a text model to generate real listing copy.`
        : `（演示内容）${format.label}：${base}｜此处为演示占位文案，配置文本模型后会按「${spec.stylePreset.slice(0, 18)}…」的调性生成真实内容。`,
    note: format.note,
  }))

  const coverage = computeCoverage(groups)

  return {
    ok: true,
    mode: 'demo',
    platform: payload.platform,
    groups,
    copyBlocks,
    coverage,
    warnings: [
      '当前为演示模式：关键词与文案由本地模板拼装，不是真实 AI 生成结果。',
      '演示关键词不含真实搜索量、搜索排名、竞争程度与转化率，任何平台都不提供这些数据的免费估算。',
      '配置文本模型后重新生成，才会得到基于商品信息的真实关键词建议。',
    ],
    meta: {
      provider: 'compatible',
      model: 'demo-seo-template',
      latencyMs,
      accessMode: payload.mode,
      generatedAt: new Date().toISOString(),
    },
  }
}
