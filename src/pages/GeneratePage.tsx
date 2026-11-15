import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Copy,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import {
  EMPTY_ANALYSIS,
  EMPTY_PRODUCT_INFO,
  LANGUAGE_META,
  MAX_UPLOAD_BYTES,
  PLATFORM_META,
  SECTION_META,
  STYLE_META,
  type CopySection,
  type CopyStyleId,
  type GeneratePayload,
  type GenerateResponse,
  type LanguageMode,
  type ModelConfigInput,
  type PlatformId,
  type ProductInfo,
  type SectionKey,
} from '@/types'
import { Alert } from '@/components/Alert'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { Field } from '@/components/Field'
import { GeneratingPanel } from '@/components/GeneratingPanel'
import { OptionGroup } from '@/components/OptionGroup'
import { ResultCard } from '@/components/ResultCard'
import { Uploader } from '@/components/Uploader'
import { useCopy } from '@/hooks/useCopy'
import { useModelCatalog } from '@/hooks/useModelCatalog'
import { describeError, generateCopy } from '@/services/api'
import { buildDemoResult, buildDemoSection, mergeSection } from '@/services/demo'
import { createFileFromImageUrl } from '@/lib/image'
import { fileToDataUrl } from '@/lib/utils'
import { findProvider, judgeVision } from '@/lib/visionSupport'
import { SAMPLE_PRODUCTS, takePendingFile, takePendingSample } from '@/services/pending'
import { getSessionKeys, setSessionKeys } from '@/services/sessionKeys'
import { loadPreferences, toEndpointConfig } from '@/services/storage'

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_META) as PlatformId[]).map((id) => ({
  value: id,
  label: PLATFORM_META[id].label,
  desc: PLATFORM_META[id].desc,
  badge: PLATFORM_META[id].region,
}))

const STYLE_OPTIONS = (Object.keys(STYLE_META) as CopyStyleId[]).map((id) => ({
  value: id,
  label: STYLE_META[id].label,
  desc: STYLE_META[id].desc,
}))

const LANGUAGE_OPTIONS = (Object.keys(LANGUAGE_META) as LanguageMode[]).map((id) => ({
  value: id,
  label: LANGUAGE_META[id].label,
  desc: LANGUAGE_META[id].desc,
}))

const PRODUCT_FIELDS: Array<{
  key: keyof ProductInfo
  label: string
  placeholder: string
  multiline?: boolean
  span?: boolean
}> = [
  { key: 'name', label: '商品名称', placeholder: '如：户外运动保温杯' },
  { key: 'category', label: '商品类别', placeholder: '如：保温杯 / 运动水杯' },
  { key: 'brand', label: '商品品牌', placeholder: '如：无品牌 / 自有品牌' },
  { key: 'material', label: '材质', placeholder: '如：316 不锈钢内胆（如有）' },
  { key: 'size', label: '尺寸', placeholder: '如：高 22cm，直径 7cm' },
  { key: 'color', label: '颜色', placeholder: '如：深空灰' },
  { key: 'price', label: '价格', placeholder: '如：79 元 / $12.99' },
  { key: 'targetCustomer', label: '目标客户', placeholder: '如：通勤上班族、健身人群' },
  {
    key: 'scenarios',
    label: '适用场景',
    placeholder: '如：通勤、办公室、健身房、短途户外',
    multiline: true,
    span: true,
  },
  {
    key: 'functions',
    label: '商品功能',
    placeholder: '如：保温 6 小时、单手开合（仅写确认过的功能）',
    multiline: true,
    span: true,
  },
  {
    key: 'features',
    label: '已知产品特点',
    placeholder: '如：杯盖带提环、磨砂杯身、可放车载杯架',
    multiline: true,
    span: true,
  },
  {
    key: 'extra',
    label: '其他补充信息',
    placeholder: '如售后政策、包装清单、定制选项等',
    multiline: true,
    span: true,
  },
]

type LastAction = { type: 'generate'; demo: boolean } | { type: 'regenerate'; section: SectionKey }

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** 把结果拼成可直接粘贴到文档里的纯文本 */
function composeFullText(result: GenerateResponse): string {
  const { copy } = result.data
  const lines: string[] = []
  for (const key of ['title', 'sellingPoints', 'description', 'marketing', 'keywords'] as SectionKey[]) {
    const section = copy.sections.find((item) => item.key === key)
    if (!section) continue
    lines.push(`【${SECTION_META[key].label}】`)
    lines.push(section.zh.trim())
    lines.push('')
    lines.push(`[${SECTION_META[key].labelEn}]`)
    lines.push(section.en.trim())
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function GeneratePage() {
  const [prefs] = useState(() => loadPreferences())
  const { catalog } = useModelCatalog()
  const { copiedKey, copy } = useCopy()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductInfo>({ ...EMPTY_PRODUCT_INFO })
  const [platform, setPlatform] = useState<PlatformId>(prefs.platform)
  const [style, setStyle] = useState<CopyStyleId>(prefs.style)
  const [language, setLanguage] = useState<LanguageMode>(prefs.language)

  const [keys, setKeys] = useState(() => getSessionKeys())
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [regenerating, setRegenerating] = useState<SectionKey | null>(null)
  const [pageError, setPageError] = useState<{ message: string; hint?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [analysisStale, setAnalysisStale] = useState(false)
  const [showForm, setShowForm] = useState(true)
  /** true = 仅文字生成：不调用视觉模型，也不把图片发给任何模型 */
  const [skipVision, setSkipVision] = useState(false)

  const lastAction = useRef<LastAction | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  /* ------------------------- 初始化：首页交接的图片 ------------------------- */
  useEffect(() => {
    const incoming = takePendingFile()
    if (incoming) {
      setFile(incoming)
      void fileToDataUrl(incoming).then(setPreviewUrl).catch(() => setPreviewUrl(null))
      return
    }
    const sample = takePendingSample()
    if (sample) {
      // 示例图自带商品名称/类别，顺手填入表单，演示文案会更贴近这张图（用户仍可改）
      const matched = SAMPLE_PRODUCTS.find((item) => item.image === sample)
      if (matched) {
        setProduct((prev) => ({
          ...prev,
          name: prev.name || matched.name,
          category: prev.category || matched.category,
        }))
      }
      void createFileFromImageUrl(sample, 'sample-product.png')
        .then((created) => {
          setFile(created)
          return fileToDataUrl(created).then(setPreviewUrl)
        })
        .catch((err: unknown) => {
          setFileError(err instanceof Error ? err.message : '示例图片加载失败。')
        })
    }
  }, [])

  /* ------------------------------- 工具函数 ------------------------------- */
  const updateField = (key: keyof ProductInfo, value: string) => {
    setProduct((prev) => ({ ...prev, [key]: value }))
  }

  const handleFileChange = (next: File | null) => {
    setFile(next)
    setPageError(null)
    if (!next) {
      setPreviewUrl(null)
      return
    }
    void fileToDataUrl(next).then(setPreviewUrl).catch(() => setPreviewUrl(null))
    // 图片变了，旧的分析结果不再可信
    if (result) setAnalysisStale(true)
  }

  const buildPayload = useCallback(
    (extra: Partial<GeneratePayload> = {}): GeneratePayload => {
      const textOnly = extra.skipVision ?? skipVision
      const payload: GeneratePayload = {
        mode: prefs.mode,
        platform,
        style,
        language,
        product,
        skipVision: textOnly,
        ...extra,
      }
      if (prefs.mode === 'byok') {
        const config: ModelConfigInput = {
          text: toEndpointConfig(prefs.text, keys.text.trim()),
          // 仅文字生成时不带视觉配置，后端也就不会调用视觉模型
          ...(textOnly ? {} : { vision: toEndpointConfig(prefs.vision, keys.vision.trim()) }),
        }
        payload.modelConfig = config
      }
      return payload
    },
    [keys.text, keys.vision, language, platform, prefs, product, skipVision, style],
  )

  const validateByok = (textOnly = skipVision): string | null => {
    if (prefs.mode !== 'byok') return null
    if (!prefs.text.model.trim()) {
      return '请先在「AI 模型设置」里填写文本模型名称。'
    }
    if (!textOnly && !prefs.vision.model.trim()) {
      return '请先在「AI 模型设置」里填写视觉模型名称，或改用「仅文字生成」。'
    }
    if (!keys.text.trim()) {
      return 'BYOK 模式需要填写文本模型的 API Key（可在下方直接填写或在设置页填写）。'
    }
    if (!textOnly && !keys.vision.trim()) {
      return 'BYOK 模式需要填写视觉模型的 API Key，或改用「仅文字生成」。'
    }
    return null
  }

  /* ------------------------------- 生成流程 ------------------------------- */
  const runGenerate = async (asDemo: boolean) => {
    if (!skipVision && !file) {
      setPageError({
        message: '请先上传一张商品图片，或改用「仅文字生成」。',
        hint: '支持 JPG / PNG / WEBP，≤ 5MB；当前文本模型不支持图片时可以只填文字信息。',
      })
      return
    }
    if (skipVision && !product.name.trim() && !product.category.trim()) {
      setPageError({
        message: '仅文字生成需要至少填写「商品名称」或「商品类别」。',
        hint: '本次不会把图片发给模型，缺少这两项会导致文案太空泛。',
      })
      return
    }
    if (!product.name.trim() && !product.category.trim()) {
      // 允许只传图，但给出提醒
      setNotice('未填写商品名称与类别，文案将主要依据图片识别结果生成，建议补充关键信息。')
    } else {
      setNotice(null)
    }

    const byokProblem = validateByok()
    if (!asDemo && byokProblem) {
      setPageError({ message: byokProblem, hint: '也可以先用「演示数据生成」查看完整输出。' })
      return
    }

    setPageError(null)
    setAnalysisStale(false)
    lastAction.current = { type: 'generate', demo: asDemo }

    if (asDemo) {
      setDemoBusy(true)
      try {
        await wait(900)
        const demoResult = buildDemoResult(buildPayload(), 900)
        setResult(demoResult)
        window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      } finally {
        setDemoBusy(false)
      }
      return
    }

    setGenerating(true)
    try {
      const response = await generateCopy({
        image: skipVision ? null : file,
        payload: buildPayload(),
      })
      setResult(response)
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } catch (err) {
      const info = describeError(err)
      const code = (err as { code?: string }).code
      if (code === 'NO_MODEL_CONFIG' && prefs.demoFallback) {
        // 平台未配置默认 API：自动降级到演示模式，并明确告知
        const demoResult = buildDemoResult(buildPayload(), 600)
        setResult(demoResult)
        setNotice(
          '当前没有可用的真实模型配置，已自动使用演示数据。配置平台默认 API 或填入自己的 API Key 后即可切换为真实生成。',
        )
      } else {
        setPageError({ message: info.message, hint: info.hint })
      }
    } finally {
      setGenerating(false)
    }
  }

  const runRegenerate = async (section: SectionKey) => {
    if (!result) return
    // 上一次是「仅文字生成」时，重新生成同样不需要图片
    const textOnly = skipVision || result.data.analysis.source === 'text-only'
    if (!file && result.mode === 'live' && !textOnly) {
      setPageError({ message: '原图已不在内存中，请重新上传图片后再生成。' })
      return
    }
    setPageError(null)
    setRegenerating(section)
    lastAction.current = { type: 'regenerate', section }

    try {
      if (result.mode === 'demo') {
        await wait(700)
        const { section: next } = buildDemoSection(buildPayload(), section, 700)
        setResult((prev) =>
          prev ? { ...prev, data: { ...prev.data, copy: mergeSection(prev.data.copy, next) } } : prev,
        )
        return
      }

      const byokProblem = validateByok(textOnly)
      if (byokProblem) throw new Error(byokProblem)

      const response = await generateCopy({
        image: textOnly ? null : file,
        payload: buildPayload({
          regenerateSection: section,
          reuseAnalysis: result.data.analysis,
          skipVision: textOnly,
        }),
      })
      const returned =
        response.data.copy.sections.find((item) => item.key === section) ?? response.data.copy.sections[0]
      if (!returned) throw new Error('模型没有返回该模块内容，请重试。')

      setResult((prev) =>
        prev
          ? {
              ...prev,
              data: { ...prev.data, copy: mergeSection(prev.data.copy, returned) },
              meta: response.meta,
              warnings: response.warnings,
            }
          : prev,
      )
    } catch (err) {
      const info = describeError(err)
      setPageError({ message: info.message, hint: info.hint })
    } finally {
      setRegenerating(null)
    }
  }

  const handleUpdateSection = (next: CopySection) => {
    setResult((prev) =>
      prev ? { ...prev, data: { ...prev.data, copy: mergeSection(prev.data.copy, next) } } : prev,
    )
  }

  const resetAll = () => {
    setFile(null)
    setPreviewUrl(null)
    setFileError(null)
    setProduct({ ...EMPTY_PRODUCT_INFO })
    setResult(null)
    setPageError(null)
    setNotice(null)
    setAnalysisStale(false)
    lastAction.current = null
  }

  const fillSampleInfo = () => {
    setProduct({
      ...EMPTY_PRODUCT_INFO,
      name: '户外运动保温杯',
      category: '保温杯 / 运动水杯',
      color: '深空灰',
      material: '316 不锈钢内胆',
      size: '高 22cm / 直径 7cm / 500ml',
      price: '79 元',
      targetCustomer: '通勤上班族、健身人群',
      scenarios: '通勤、办公室、健身房、短途户外',
      functions: '保温 6 小时、杯盖单手开合',
      features: '杯盖自带提环、磨砂杯身、适配车载杯架',
    })
  }

  const busy = generating || demoBusy
  const platformConfigured = catalog?.platformDefault.configured ?? null
  const fullTextCopied = copiedKey === 'full'

  // 当前会用于图片识别的模型（BYOK 取用户配置，平台默认取 /api/models 返回的状态）
  const visionProviderId = prefs.mode === 'byok' ? prefs.vision.provider : catalog?.platformDefault.vision?.provider
  const visionModelName = prefs.mode === 'byok' ? prefs.vision.model : catalog?.platformDefault.vision?.model ?? ''
  const visionVerdict = useMemo(() => {
    if (!visionProviderId) {
      return {
        supported: false,
        reason: '当前没有可用的视觉模型（平台默认 API 未配置视觉模型）。可以改用「仅文字生成」，或先在 AI 模型设置里配置 OpenAI / Gemini / Claude。',
      }
    }
    return judgeVision(findProvider(catalog, visionProviderId), visionModelName)
  }, [catalog, visionModelName, visionProviderId])

  const textProviderLabel = findProvider(catalog, prefs.text.provider)?.label ?? prefs.text.provider
  /** 不允许把图片发给不支持的模型：这里只给出提示，切换由用户点按钮完成 */
  const visionBlocked = !skipVision && visionVerdict.supported === false

  const analysisForView = useMemo(
    () => result?.data.analysis ?? EMPTY_ANALYSIS,
    [result],
  )

  return (
    <div className="container-page py-8 lg:py-10">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">
            <Sparkles className="h-3 w-3" />
            商品文案生成
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            上传商品图片，生成完整文案
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            所有补充信息都是选填，只上传图片也可以开始。图片无法确认的材质、尺寸、性能等属性会被标记为待补充，
            不会被模型凭空编造。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            接入模式：{prefs.mode === 'platform' ? '平台默认 API' : 'BYOK 自带 Key'}
          </span>
          {prefs.mode === 'platform' && platformConfigured !== null ? (
            <span
              className={
                platformConfigured
                  ? 'chip border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'chip border-amber-200 bg-amber-50 text-amber-700'
              }
            >
              {platformConfigured ? '平台 API 已配置' : '平台 API 未配置'}
            </span>
          ) : null}
        </div>
      </div>

      {notice ? (
        <Alert variant="warning" className="mt-5" onClose={() => setNotice(null)} title="提示">
          {notice}
        </Alert>
      ) : null}

      {pageError ? (
        <Alert
          variant="error"
          className="mt-5"
          title="生成失败"
          onClose={() => setPageError(null)}
          actions={
            lastAction.current ? (
              <button
                type="button"
                className="btn bg-white px-3 py-1.5 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                onClick={() => {
                  const action = lastAction.current
                  if (!action) return
                  if (action.type === 'generate') void runGenerate(action.demo)
                  else void runRegenerate(action.section)
                }}
              >
                <RefreshCw className="h-3 w-3" />
                重试
              </button>
            ) : null
          }
        >
          <p>{pageError.message}</p>
          {pageError.hint ? <p className="mt-1 text-xs opacity-80">{pageError.hint}</p> : null}
        </Alert>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ----------------------------- 左侧：配置 ----------------------------- */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">1. 商品图片</h2>
              {file ? <span className="chip-brand">已选择</span> : null}
            </div>
            <Uploader
              file={file}
              previewUrl={previewUrl}
              onFileChange={handleFileChange}
              onError={setFileError}
              error={fileError}
              maxBytes={MAX_UPLOAD_BYTES}
              disabled={busy}
            />

            {/* 生成方式：图片识别 or 仅文字（后者用于不支持图片的文本模型，如 DeepSeek） */}
            <div className="mt-4 border-t border-ink-100 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="label mb-0">生成方式</p>
                <span className="text-[11px] text-ink-400">
                  文本模型：{textProviderLabel}
                </span>
              </div>
              <OptionGroup
                name="生成方式"
                columns={1}
                size="sm"
                options={[
                  {
                    value: 'vision',
                    label: '图片识别 + 文案',
                    desc: '先识别图片外观，再写文案',
                  },
                  {
                    value: 'text',
                    label: '仅文字生成',
                    desc: '不调用视觉模型，只用你填写的商品信息',
                  },
                ]}
                value={skipVision ? 'text' : 'vision'}
                onChange={(next) => setSkipVision(next === 'text')}
                disabled={busy}
              />

              {visionBlocked ? (
                <Alert
                  variant="warning"
                  className="mt-3"
                  title="当前视觉模型无法读取图片"
                  actions={
                    <button
                      type="button"
                      className="btn bg-white px-3 py-1.5 text-xs text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50"
                      onClick={() => setSkipVision(true)}
                    >
                      改用仅文字生成
                    </button>
                  }
                >
                  <p className="text-xs leading-relaxed">{visionVerdict.reason}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">
                    图片不会被发送给不支持的模型。你也可以在「AI 模型设置」里把视觉模型换成 OpenAI / Gemini / Claude。
                  </p>
                </Alert>
              ) : null}

              {skipVision ? (
                <p className="mt-2 rounded-lg bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-brand-800">
                  仅文字生成：不调用视觉模型，图片不会上传给任何模型。请填写商品名称与关键特征，
                  未填写的材质、尺寸等会保留 <code className="rounded bg-white px-1">[待补充：xxx]</code> 占位。
                </p>
              ) : null}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink-900">2. 平台 / 风格 / 语言</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="label">电商平台</p>
                <OptionGroup
                  name="平台"
                  options={PLATFORM_OPTIONS}
                  value={platform}
                  onChange={setPlatform}
                  disabled={busy}
                />
              </div>
              <div>
                <p className="label">文案风格</p>
                <OptionGroup
                  name="文案风格"
                  options={STYLE_OPTIONS}
                  value={style}
                  onChange={setStyle}
                  size="sm"
                  disabled={busy}
                />
              </div>
              <div>
                <p className="label">输出语言</p>
                <OptionGroup
                  name="输出语言"
                  options={LANGUAGE_OPTIONS}
                  value={language}
                  onChange={setLanguage}
                  columns={3}
                  size="sm"
                  disabled={busy}
                />
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink-900">3. 商品信息（选填）</h2>
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-xs" onClick={fillSampleInfo} disabled={busy}>
                  填入示例
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setShowForm((value) => !value)}
                >
                  {showForm ? '收起' : '展开'}
                </button>
              </div>
            </div>

            {showForm ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PRODUCT_FIELDS.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    htmlFor={`field-${field.key}`}
                    className={field.span ? 'sm:col-span-2' : undefined}
                  >
                    {field.multiline ? (
                      <textarea
                        id={`field-${field.key}`}
                        className="input resize-y"
                        rows={2}
                        placeholder={field.placeholder}
                        value={product[field.key]}
                        disabled={busy}
                        onChange={(event) => updateField(field.key, event.target.value)}
                      />
                    ) : (
                      <input
                        id={`field-${field.key}`}
                        className="input"
                        placeholder={field.placeholder}
                        value={product[field.key]}
                        disabled={busy}
                        onChange={(event) => updateField(field.key, event.target.value)}
                      />
                    )}
                  </Field>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-400">已收起。填写材质、尺寸等信息能显著提升文案准确度。</p>
            )}
          </section>

          {prefs.mode === 'byok' ? (
            <section className="card p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                <KeyRound className="h-4 w-4 text-brand-600" />
                本次会话的 API Key
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                只保存在当前页面内存中，随请求发送给后端并即时丢弃；刷新页面即清空，不写入浏览器存储。
              </p>
              <div className="mt-3 grid gap-3">
                {!skipVision ? (
                  <Field label={`视觉模型 Key（${prefs.vision.provider}）`}>
                    <input
                      type="password"
                      autoComplete="off"
                      className="input font-mono text-xs"
                      placeholder="sk-..."
                      value={keys.vision}
                      onChange={(event) => {
                        const next = { ...keys, vision: event.target.value }
                        setKeys(next)
                        setSessionKeys(next)
                      }}
                    />
                  </Field>
                ) : null}
                <Field label={`文本模型 Key（${prefs.text.provider}）`}>
                  <input
                    type="password"
                    autoComplete="off"
                    className="input font-mono text-xs"
                    placeholder="sk-..."
                    value={keys.text}
                    onChange={(event) => {
                      const next = { ...keys, text: event.target.value }
                      setKeys(next)
                      setSessionKeys(next)
                    }}
                  />
                </Field>
              </div>
              <Link to="/models" className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:underline">
                前往 AI 模型设置调整服务商与模型 →
              </Link>
            </section>
          ) : null}

          <section className="card space-y-2 p-4">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => void runGenerate(false)}
              disabled={busy || (skipVision ? !product.name.trim() && !product.category.trim() : !file)}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? '正在生成…' : skipVision ? '仅文字生成文案' : '生成文案'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => void runGenerate(true)}
              disabled={busy || (!skipVision && !file)}
            >
              {demoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {demoBusy ? '正在准备演示数据…' : '用演示数据生成'}
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full text-xs"
              onClick={resetAll}
              disabled={busy}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              清空表单与结果
            </button>
            {skipVision ? (
              <p className="pt-1 text-center text-[11px] text-ink-400">填写商品名称或类别后即可生成</p>
            ) : !file ? (
              <p className="pt-1 text-center text-[11px] text-ink-400">上传图片后即可生成</p>
            ) : null}
          </section>
        </div>

        {/* ----------------------------- 右侧：结果 ----------------------------- */}
        <div ref={resultRef} className="min-w-0 space-y-4">
          {generating || demoBusy ? <GeneratingPanel demo={demoBusy} /> : null}

          {!generating && !demoBusy && !result ? (
            <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-base font-bold text-ink-900">结果会显示在这里</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
                左侧上传商品图片、选择平台与风格后点击「生成文案」。
                还没有配置 API Key？点「用演示数据生成」可以先看完整效果，所有演示内容都会被明确标注。
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link to="/models" className="btn-secondary btn-xs">
                  <KeyRound className="h-3.5 w-3.5" />
                  配置 AI 模型
                </Link>
                <Link to="/about" className="btn btn-ghost btn-xs">
                  <Info className="h-3.5 w-3.5" />
                  了解安全设计
                </Link>
              </div>
            </div>
          ) : null}

          {result && !generating && !demoBusy ? (
            <>
              {/* 结果概览 */}
              <section className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          result.mode === 'demo'
                            ? 'chip border-amber-200 bg-amber-50 text-amber-700'
                            : 'chip border-emerald-200 bg-emerald-50 text-emerald-700'
                        }
                      >
                        {result.mode === 'demo' ? '演示数据（非真实 AI 结果）' : '真实模型生成'}
                      </span>
                      <span className="chip">{PLATFORM_META[platform].label}</span>
                      <span className="chip">{STYLE_META[style].label}</span>
                      <span className="chip">{LANGUAGE_META[language].label}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-ink-400">
                      视觉模型：{result.meta.visionModel} · 文本模型：{result.meta.textModel} · 耗时{' '}
                      {(result.meta.latencyMs / 1000).toFixed(1)}s ·{' '}
                      {new Date(result.meta.generatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-secondary btn-xs"
                      onClick={() => void runGenerate(result.mode === 'demo')}
                      disabled={busy || regenerating !== null}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      全部重新生成
                    </button>
                    <button
                      type="button"
                      className={fullTextCopied ? 'btn-primary btn-xs bg-emerald-600 hover:bg-emerald-700' : 'btn-primary btn-xs'}
                      onClick={() => void copy(composeFullText(result), 'full')}
                    >
                      {fullTextCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {fullTextCopied ? '已复制全文' : '复制全部结果'}
                    </button>
                  </div>
                </div>

                {result.warnings.length > 0 ? (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                    {result.warnings.map((warning) => (
                      <p key={warning} className="flex gap-2 text-[11px] leading-5 text-ink-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                        <span>{warning}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>

              {analysisStale ? (
                <Alert variant="info" title="图片已更换">
                  识别结果来自上一次的图片。请点击「全部重新生成」以基于新图片更新识别与文案。
                </Alert>
              ) : null}

              <AnalysisPanel analysis={analysisForView} demo={result.mode === 'demo'} />

              <div className="grid gap-4">
                {result.data.copy.sections.map((section) => (
                  <ResultCard
                    key={section.key}
                    section={section}
                    language={language}
                    regenerating={regenerating === section.key}
                    onUpdate={handleUpdateSection}
                    onRegenerate={(key) => void runRegenerate(key)}
                  />
                ))}
              </div>

              <Alert variant="info" title="发布前请注意">
                文案中的 [待补充：…] 占位需要你替换为真实参数；请自行核对平台规则、广告法与商品实际信息，
                本站未与任何电商平台建立官方审核关系。
              </Alert>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-ink-400"
                  onClick={() => {
                    setResult(null)
                    setPageError(null)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  清空本次结果
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
