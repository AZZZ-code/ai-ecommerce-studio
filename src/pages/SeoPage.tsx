import {
  Copy,
  CopyCheck,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Field } from '@/components/Field'
import { KeywordTable } from '@/components/KeywordTable'
import { OptionGroup } from '@/components/OptionGroup'
import { Spinner } from '@/components/Spinner'
import { useCopy } from '@/hooks/useCopy'
import { describeError, generateSeoKeywords } from '@/services/api'
import { buildDemoSeoResult, computeCoverage } from '@/services/demoStudio'
import { getSessionKeys, setSessionKeys } from '@/services/sessionKeys'
import { loadPreferences, toEndpointConfig } from '@/services/storage'
import {
  EMPTY_PRODUCT_INFO,
  IMPORTANCE_META,
  KEYWORD_CATEGORY_META,
  LANGUAGE_META,
  PLATFORM_META,
  STYLE_META,
  type KeywordGroup,
  type LanguageMode,
  type PlatformId,
  type ProductInfo,
  type CopyStyleId,
  type SeoKeywordResponse,
} from '@/types'

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_META) as PlatformId[]).map((id) => ({
  value: id,
  label: PLATFORM_META[id].label,
  description: PLATFORM_META[id].desc,
  badge: PLATFORM_META[id].region,
}))

const STYLE_OPTIONS = (Object.keys(STYLE_META) as CopyStyleId[]).map((id) => ({
  value: id,
  label: STYLE_META[id].label,
  description: STYLE_META[id].desc,
}))

const LANGUAGE_OPTIONS = (Object.keys(LANGUAGE_META) as LanguageMode[]).map((id) => ({
  value: id,
  label: LANGUAGE_META[id].label,
  description: LANGUAGE_META[id].desc,
}))

export function SeoPage() {
  const [prefs] = useState(() => loadPreferences())
  const [keys, setKeys] = useState(() => getSessionKeys())
  const { copiedKey, error: copyError, copy } = useCopy()

  const [platform, setPlatform] = useState<PlatformId>('taobao')
  const [style, setStyle] = useState<CopyStyleId>(prefs.style)
  const [language, setLanguage] = useState<LanguageMode>(prefs.language)
  const [product, setProduct] = useState<ProductInfo>({ ...EMPTY_PRODUCT_INFO })
  const [competitorInfo, setCompetitorInfo] = useState('')

  const [result, setResult] = useState<SeoKeywordResponse | null>(null)
  const [groups, setGroups] = useState<KeywordGroup[]>([])
  const [generating, setGenerating] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [pageError, setPageError] = useState<{ message: string; hint?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const coverage = useMemo(() => computeCoverage(groups), [groups])

  const buildPayload = () => ({
    mode: prefs.mode,
    platform,
    style,
    language,
    product: { ...product, name: product.name.trim(), category: product.category.trim() },
    competitorInfo: competitorInfo.trim() || undefined,
    ...(prefs.mode === 'byok'
      ? { modelConfig: { text: toEndpointConfig(prefs.text, keys.text) } }
      : {}),
  })

  const validate = () => {
    if (!product.name.trim() && !product.category.trim()) {
      return '请至少填写商品名称或商品类别，否则关键词会缺少主体。'
    }
    if (prefs.mode === 'byok') {
      if (!prefs.text.model.trim()) return '请先在「AI 模型设置」里填写文本模型名称。'
      if (!keys.text.trim()) return 'BYOK 模式需要填写文本模型的 API Key（可在下方填写）。'
    }
    return null
  }

  const applyResult = (next: SeoKeywordResponse) => {
    setResult(next)
    setGroups(next.groups)
  }

  const runDemo = async () => {
    const problem = validate()
    if (problem) {
      setPageError({ message: problem })
      return
    }
    setPageError(null)
    setNotice(null)
    setDemoBusy(true)
    await wait(700)
    applyResult(buildDemoSeoResult(buildPayload() as never, 700))
    setDemoBusy(false)
  }

  const run = async () => {
    const problem = validate()
    if (problem) {
      setPageError({ message: problem, hint: '也可以先点「用演示数据生成」查看分类与文案结构。' })
      return
    }
    setPageError(null)
    setNotice(null)
    setGenerating(true)
    try {
      const response = await generateSeoKeywords(buildPayload())
      applyResult(response)
    } catch (err) {
      const info = describeError(err)
      if (info.message.includes('默认文本模型') && prefs.demoFallback) {
        applyResult(buildDemoSeoResult(buildPayload() as never, 700))
        setNotice('平台还没有配置文本模型，已自动改用演示数据（关键词为本地模板，不是真实 AI 结果）。')
      } else {
        setPageError({ message: info.message, hint: info.hint })
      }
    } finally {
      setGenerating(false)
    }
  }

  const allGroupsText = useMemo(
    () =>
      groups
        .map((group) => {
          const terms = group.keywords
            .filter((item) => item.term.trim())
            .map((item) => item.term.trim())
            .join('\n')
          return terms ? `【${group.label}】\n${terms}` : ''
        })
        .filter(Boolean)
        .join('\n\n'),
    [groups],
  )

  const updateGroup = (next: KeywordGroup) => {
    setGroups((prev) => prev.map((group) => (group.id === next.id ? next : group)))
  }

  const busy = generating || demoBusy

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="max-w-3xl">
        <span className="eyebrow">
          <Search className="h-3 w-3" />
          智能 SEO 关键词
        </span>
        <h1 className="section-title mt-3">按平台生成分类关键词与上架文案</h1>
        <p className="section-desc">
          关键词分 10 类输出，每条都带搜索意图、推荐使用位置与重要程度；同时按平台格式给出标题、五点、Tags、Meta
          Description 等文案块。这里给出的是「AI 相关性建议」，不是真实搜索数据。
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">1. 目标平台</h2>
            <OptionGroup
              name="seo-platform"
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={(value) => setPlatform(value as PlatformId)}
              columns={2}
              size="sm"
              disabled={busy}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              不同平台的文案结构与语言会在生成时自动切换（例如 Amazon 走英文 Title + Bullet Points，
              小红书走笔记标题与话题）。
            </p>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">2. 文案风格与语言</h2>
            <OptionGroup
              name="seo-style"
              options={STYLE_OPTIONS}
              value={style}
              onChange={(value) => setStyle(value as CopyStyleId)}
              columns={2}
              size="sm"
              disabled={busy}
            />
            <div className="mt-3">
              <OptionGroup
                name="seo-language"
                options={LANGUAGE_OPTIONS}
                value={language}
                onChange={(value) => setLanguage(value as LanguageMode)}
                columns={3}
                size="sm"
                disabled={busy}
              />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">3. 商品信息</h2>
            <div className="grid gap-3">
              <Field label="商品名称 / 类别">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    value={product.name}
                    placeholder="户外运动保温杯"
                    onChange={(event) => setProduct((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.category}
                    placeholder="保温杯"
                    onChange={(event) => setProduct((prev) => ({ ...prev, category: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="品牌 / 材质">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    value={product.brand}
                    placeholder="真实品牌名（没有就留空）"
                    onChange={(event) => setProduct((prev) => ({ ...prev, brand: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.material}
                    placeholder="316 不锈钢"
                    onChange={(event) => setProduct((prev) => ({ ...prev, material: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="尺寸 / 颜色">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    value={product.size}
                    placeholder="500ml / 高 22cm"
                    onChange={(event) => setProduct((prev) => ({ ...prev, size: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.color}
                    placeholder="雾蓝"
                    onChange={(event) => setProduct((prev) => ({ ...prev, color: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="功能 / 已知特点">
                <div className="grid gap-2">
                  <input
                    className="input"
                    value={product.functions}
                    placeholder="保温 12 小时、单手开合"
                    onChange={(event) => setProduct((prev) => ({ ...prev, functions: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.features}
                    placeholder="杯盖带提环、杯身磨砂、可放车载杯架"
                    onChange={(event) => setProduct((prev) => ({ ...prev, features: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="目标客户 / 适用场景">
                <div className="grid gap-2">
                  <input
                    className="input"
                    value={product.targetCustomer}
                    placeholder="通勤上班族、健身人群"
                    onChange={(event) =>
                      setProduct((prev) => ({ ...prev, targetCustomer: event.target.value }))
                    }
                  />
                  <input
                    className="input"
                    value={product.scenarios}
                    placeholder="通勤、办公室、健身房、短途户外"
                    onChange={(event) => setProduct((prev) => ({ ...prev, scenarios: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="竞品信息（可选，填了才会生成竞品对比词）">
                <textarea
                  className="input min-h-[56px] resize-y"
                  value={competitorInfo}
                  onChange={(event) => setCompetitorInfo(event.target.value)}
                  placeholder="例如：某品牌 X1 保温杯（同价位竞品）"
                  maxLength={400}
                />
              </Field>
            </div>
          </section>

          {prefs.mode === 'byok' ? (
            <section className="card p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <KeyRound className="h-4 w-4 text-brand-600" />
                本次会话的文本模型 Key
              </h2>
              <input
                className="input"
                type="password"
                value={keys.text}
                placeholder={`${prefs.text.provider} 的 API Key`}
                onChange={(event) => {
                  const next = { ...keys, text: event.target.value }
                  setKeys(next)
                  setSessionKeys(next)
                }}
                autoComplete="off"
              />
              <p className="mt-2 text-xs text-ink-500">
                Key 只保存在本页内存，刷新即失效；不会写入 localStorage，也不会进入日志。
              </p>
              <Link className="link-underline mt-1 inline-block text-xs text-brand-700" to="/models">
                去模型设置
              </Link>
            </section>
          ) : null}

          <div className="flex flex-col gap-2">
            <button type="button" className="btn-primary" onClick={() => void run()} disabled={busy}>
              {generating ? <Spinner /> : <Tags className="h-4 w-4" />}
              {generating ? '正在生成关键词…' : '生成分类关键词与文案'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void runDemo()} disabled={busy}>
              {demoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              用演示数据生成
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setResult(null)
                setGroups([])
                setPageError(null)
                setNotice(null)
              }}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
              清空结果
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {pageError ? (
            <Alert
              variant="error"
              title="生成失败"
              onClose={() => setPageError(null)}
              actions={
                <button type="button" className="btn btn-xs btn-secondary" onClick={() => void run()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  重试
                </button>
              }
            >
              <p>{pageError.message}</p>
              {pageError.hint ? <p className="mt-1 text-xs text-ink-500">{pageError.hint}</p> : null}
            </Alert>
          ) : null}

          {notice ? (
            <Alert variant="warning" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          ) : null}

          {copyError ? <Alert variant="error">{copyError}</Alert> : null}

          {!result ? (
            <section className="card flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Search className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink-900">关键词会分类显示在这里</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
                填写商品信息后点「生成分类关键词与文案」；没有配置文本模型时，可以先用演示数据体验完整的
                10 类关键词与平台文案结构。
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link className="btn btn-xs btn-secondary" to="/generate">
                  先写文案
                </Link>
                <Link className="btn btn-xs btn-ghost" to="/studio">
                  AI 图片创作
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {result.mode === 'demo' ? (
                    <span className="chip border-amber-300 bg-amber-50 text-amber-800">
                      演示数据（模板拼装，非真实 AI）
                    </span>
                  ) : (
                    <span className="chip border-emerald-300 bg-emerald-50 text-emerald-700">
                      真实模型生成
                    </span>
                  )}
                  <span className="chip">{PLATFORM_META[result.platform].label}</span>
                  <span className="chip">{STYLE_META[style].label}</span>
                  <span className="chip">{LANGUAGE_META[language].label}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="关键词总数" value={coverage.total + (result.coverage.duplicatesRemoved ?? 0)} />
                  <Stat label="去重后" value={coverage.unique} />
                  <Stat label="高重要" value={coverage.high} />
                  <Stat label="待人工确认" value={coverage.needsReview} />
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  模型：{result.meta.provider} / {result.meta.model} · 耗时{' '}
                  {(result.meta.latencyMs / 1000).toFixed(1)}s ·{' '}
                  {new Date(result.meta.generatedAt).toLocaleString('zh-CN')}
                  {coverage.duplicatesRemoved + (result.coverage.duplicatesRemoved ?? 0) > 0
                    ? ` · 已自动去除 ${
                        coverage.duplicatesRemoved + (result.coverage.duplicatesRemoved ?? 0)
                      } 个重复词`
                    : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    onClick={() => void copy(allGroupsText, 'all-groups')}
                    disabled={!allGroupsText}
                  >
                    {copiedKey === 'all-groups' ? (
                      <CopyCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === 'all-groups' ? '已复制全部关键词' : '复制全部关键词'}
                  </button>
                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => void run()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    重新生成
                  </button>
                </div>
                {result.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-xs text-ink-600">
                    {result.warnings.map((warning, index) => (
                      <li key={index} className="flex gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="card p-4">
                <h2 className="text-sm font-semibold text-ink-900">平台文案块</h2>
                <p className="mt-1 text-xs text-ink-500">
                  按 {PLATFORM_META[result.platform].label} 的结构生成，可直接复制到后台对应字段。
                </p>
                <div className="mt-3 space-y-3">
                  {result.copyBlocks.map((block) => (
                    <div key={block.id} className="rounded-xl border border-ink-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-ink-800">{block.label}</span>
                          <span className="chip text-[11px] text-ink-500">{block.labelEn}</span>
                          {block.note ? (
                            <span className="text-[11px] text-ink-400">{block.note}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => void copy(block.content, `block-${block.id}`)}
                          disabled={!block.content}
                        >
                          {copiedKey === `block-${block.id}` ? (
                            <CopyCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedKey === `block-${block.id}` ? '已复制' : '复制'}
                        </button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700">
                        {block.content || '（模型没有填写这一段，可重新生成）'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="space-y-3">
                {(Object.keys(KEYWORD_CATEGORY_META) as (keyof typeof KEYWORD_CATEGORY_META)[]).map((id) => {
                  const group = groups.find((item) => item.id === id)
                  if (!group) return null
                  return <KeywordTable key={id} group={group} onChange={updateGroup} />
                })}
              </div>

              <section className="card p-4">
                <h2 className="text-sm font-semibold text-ink-900">关键词覆盖情况</h2>
                <div className="mt-3 space-y-2">
                  {groups.map((group) => {
                    const unique = coverage.byGroup[group.id] ?? 0
                    const percent = coverage.unique > 0 ? Math.round((unique / coverage.unique) * 100) : 0
                    return (
                      <div key={group.id} className="flex items-center gap-3 text-xs">
                        <span className="w-24 shrink-0 text-ink-600">{group.label}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full bg-brand-500"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="w-16 shrink-0 text-right tabular-nums text-ink-400">
                          {unique} 词 · {percent}%
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-500">
                  重要程度分布：高 {coverage.high} / 中 {coverage.medium} / 低 {coverage.low}；
                  其中 {coverage.needsReview} 个词建议人工确认是否与商品真实属性一致。
                  {IMPORTANCE_META.high.label}优先用于标题与后台 Search Terms。
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-ink-900">{value}</p>
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
