import {
  Download,
  ImageIcon,
  Images,
  Info,
  RefreshCw,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Field } from '@/components/Field'
import { GeneratingPanel } from '@/components/GeneratingPanel'
import { OptionGroup } from '@/components/OptionGroup'
import { Spinner } from '@/components/Spinner'
import { TextOverlayEditor } from '@/components/TextOverlayEditor'
import { Uploader } from '@/components/Uploader'
import { useModelCatalog } from '@/hooks/useModelCatalog'
import { useCopy } from '@/hooks/useCopy'
import { createFileFromImageUrl } from '@/lib/image'
import { cn, fileToDataUrl } from '@/lib/utils'
import { describeError, generateProductImage } from '@/services/api'
import { buildDemoImageResult } from '@/services/demoStudio'
import { takePendingFile, takePendingSample } from '@/services/pending'
import { getSessionKeys, setSessionKeys } from '@/services/sessionKeys'
import { loadPreferences, toImageEndpointConfig, type StoredPreferences } from '@/services/storage'
import {
  ASPECT_RATIO_META,
  IMAGE_FORMAT_META,
  IMAGE_QUALITY_META,
  IMAGE_TYPE_META,
  EMPTY_PRODUCT_INFO,
  MAX_UPLOAD_BYTES,
  PLATFORM_IMAGE_SPEC,
  PLATFORM_META,
  type AspectRatioId,
  type GeneratedImage,
  type ImageGeneratePayload,
  type ImageFidelityMode,
  type ImageGenerateResponse,
  type PlatformId,
  type ProductImageTypeId,
} from '@/types'

const IMAGE_TYPE_OPTIONS = (Object.keys(IMAGE_TYPE_META) as ProductImageTypeId[]).map((id) => ({
  value: id,
  label: IMAGE_TYPE_META[id].label,
  description: IMAGE_TYPE_META[id].desc,
}))

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_IMAGE_SPEC) as PlatformId[]).map((id) => ({
  value: id,
  label: PLATFORM_META[id].label,
  description: PLATFORM_IMAGE_SPEC[id].stylePreset,
  badge: PLATFORM_META[id].region,
}))

const RATIO_OPTIONS = (Object.keys(ASPECT_RATIO_META) as AspectRatioId[]).map((id) => ({
  value: id,
  label: ASPECT_RATIO_META[id].label,
  description:
    id === 'custom'
      ? '自己填宽度与高度'
      : `${ASPECT_RATIO_META[id].baseWidth} × ${ASPECT_RATIO_META[id].baseHeight}`,
}))

const FIDELITY_OPTIONS: { value: ImageFidelityMode; label: string; description: string }[] = [
  {
    value: 'fidelity',
    label: '商品保真模式',
    description: '严格保留原商品外形、颜色、结构与配件，只更换背景与光线',
  },
  {
    value: 'creative',
    label: '创意营销模式',
    description: '构图与环境更自由，但不会把商品改造成其他产品',
  },
]

export function StudioPage() {
  const { catalog } = useModelCatalog()
  const [prefs] = useState<StoredPreferences>(() => loadPreferences())
  const [keys, setKeys] = useState(() => getSessionKeys())

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const [imageType, setImageType] = useState<ProductImageTypeId>('white-bg')
  const [platform, setPlatform] = useState<PlatformId>('taobao')
  const [fidelity, setFidelity] = useState<ImageFidelityMode>('fidelity')
  const [ratio, setRatio] = useState<AspectRatioId>('1:1')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(1)
  const [product, setProduct] = useState({
    name: '',
    category: '',
    material: '',
    size: '',
    color: '',
    functions: '',
  })

  const [result, setResult] = useState<ImageGenerateResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [pageError, setPageError] = useState<{ message: string; hint?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [overlayId, setOverlayId] = useState<string | null>(null)

  const resultRef = useRef<HTMLDivElement | null>(null)
  const lastAction = useRef<{ payload: ImageGeneratePayload; withImage: boolean } | null>(null)

  const spec = PLATFORM_IMAGE_SPEC[platform]
  const typeMeta = IMAGE_TYPE_META[imageType]

  /* ---------------- 示例图 / 首页带过来的图片 ---------------- */
  useEffect(() => {
    let cancelled = false
    const pending = takePendingFile()
    if (pending) {
      setFile(pending)
      void fileToDataUrl(pending).then((url) => {
        if (!cancelled) setPreviewUrl(url)
      })
      return () => {
        cancelled = true
      }
    }
    const sample = takePendingSample()
    if (sample) {
      void createFileFromImageUrl(sample, 'sample-product.png').then((created) => {
        if (cancelled) return
        setFile(created)
        setProduct((prev) => ({
          ...prev,
          name: prev.name || '户外运动保温杯',
          category: prev.category || '保温杯',
        }))
        void fileToDataUrl(created).then((url) => {
          if (!cancelled) setPreviewUrl(url)
        })
      })
    }
    return () => {
      cancelled = true
    }
  }, [])

  /* ---------------- 画幅联动 ---------------- */
  useEffect(() => {
    if (ratio === 'custom') return
    const meta = ASPECT_RATIO_META[ratio]
    setWidth(meta.baseWidth)
    setHeight(meta.baseHeight)
  }, [ratio])

  const imageProvider = useMemo(() => {
    const byokId = prefs.mode === 'byok' ? prefs.image.provider : null
    const list = catalog?.imageProviders ?? []
    if (byokId) return list.find((item) => item.id === byokId) ?? null
    const defaultId = catalog?.imagePlatformDefault?.provider
    return defaultId ? (list.find((item) => item.id === defaultId) ?? null) : null
  }, [catalog, prefs.image.provider, prefs.mode])

  const buildPayload = (extra: Partial<ImageGeneratePayload> = {}) => {
    const payload: ImageGeneratePayload = {
      mode: prefs.mode,
      platform,
      imageType,
      fidelity,
      ratio,
      width,
      height,
      prompt: prompt.trim() || undefined,
      product: { ...EMPTY_PRODUCT_INFO, ...product, name: product.name.trim(), category: product.category.trim() },
      count,
      ...extra,
    }
    if (prefs.mode === 'byok') {
      payload.modelConfig = toImageEndpointConfig(prefs.image, keys.image)
    }
    return payload
  }

  const validateByok = () => {
    if (prefs.mode !== 'byok') return null
    if (!prefs.image.model.trim()) return '请先在「AI 模型设置」里为图片模型填写模型名称。'
    if (!keys.image.trim()) return 'BYOK 模式需要填写图片模型的 API Key（可在下方直接填写）。'
    return null
  }

  const runGenerate = async (asDemo = false) => {
    setPageError(null)
    setNotice(null)
    if (fidelity === 'fidelity' && !file && !asDemo) {
      setPageError({
        message: '商品保真模式需要上传商品原图。',
        hint: '上传商品图后重试，或切换到「创意营销模式」做纯文字生图。',
      })
      return
    }
    if (!asDemo) {
      const byokError = validateByok()
      if (byokError) {
        setPageError({ message: byokError, hint: '也可以直接点「用演示数据生成」查看效果。' })
        return
      }
    }

    const payload = buildPayload()
    lastAction.current = { payload, withImage: Boolean(file) }

    if (asDemo) {
      setDemoBusy(true)
      await wait(900)
      setResult(buildDemoImageResult(payload, 900))
      setDemoBusy(false)
      scrollToResult()
      return
    }

    setGenerating(true)
    try {
      const response = await generateProductImage({ image: file, payload })
      setResult(response)
      scrollToResult()
    } catch (err) {
      const info = describeError(err)
      if (info.message.includes('图片生成模型') && prefs.demoFallback) {
        setResult(buildDemoImageResult(payload, 700))
        setNotice('平台还没有配置图片模型，已自动改用演示数据（画面上的标注说明它不是真实生成结果）。')
        scrollToResult()
      } else {
        setPageError({ message: info.message, hint: info.hint })
      }
    } finally {
      setGenerating(false)
    }
  }

  const regenerate = async () => {
    const snapshot = lastAction.current
    if (!snapshot) {
      await runGenerate(false)
      return
    }
    setPageError(null)
    setNotice(null)
    setGenerating(true)
    try {
      const response = await generateProductImage({
        image: snapshot.withImage ? file : null,
        payload: snapshot.payload,
      })
      setResult(response)
      scrollToResult()
    } catch (err) {
      const info = describeError(err)
      setPageError({ message: info.message, hint: info.hint })
    } finally {
      setGenerating(false)
    }
  }

  const scrollToResult = () => {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const removeImage = (id: string) => {
    setResult((prev) =>
      prev ? { ...prev, images: prev.images.filter((image) => image.id !== id) } : prev,
    )
    if (overlayId === id) setOverlayId(null)
  }

  const reset = () => {
    setFile(null)
    setPreviewUrl(null)
    setFileError(null)
    setPrompt('')
    setProduct({ name: '', category: '', material: '', size: '', color: '', functions: '' })
    setResult(null)
    setPageError(null)
    setNotice(null)
    setOverlayId(null)
    lastAction.current = null
  }

  const busy = generating || demoBusy

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="max-w-3xl">
        <span className="eyebrow">
          <Sparkles className="h-3 w-3" />
          AI 图片创作
        </span>
        <h1 className="section-title mt-3">把一张商品图，变成可上架的效果图</h1>
        <p className="section-desc">
          选择平台与图片类型，AI 只负责更换背景、光线、构图与使用场景；
          商品本身的外形、颜色、结构由「商品保真模式」约束。画面里的文字用 Canvas 叠加，
          避免模型写出错别字或错误参数。
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ---------------- 左侧配置面板 ---------------- */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="card p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">1. 商品原图</h2>
              {file ? <span className="chip text-[11px] text-emerald-700">已选择</span> : null}
            </header>
            <Uploader
              file={file}
              previewUrl={previewUrl}
              onFileChange={(next) => {
                setFile(next)
                setFileError(null)
                if (!next) setPreviewUrl(null)
                else void fileToDataUrl(next).then(setPreviewUrl)
              }}
              onError={setFileError}
              error={fileError}
              disabled={busy}
              maxBytes={MAX_UPLOAD_BYTES}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              建议使用清晰、商品占画面主体的实拍图；保真模式下的生成质量与原图清晰度直接相关。
            </p>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">2. 图片类型</h2>
            <OptionGroup
              name="image-type"
              options={IMAGE_TYPE_OPTIONS}
              value={imageType}
              onChange={(value) => setImageType(value as ProductImageTypeId)}
              columns={1}
              size="sm"
              disabled={busy}
            />
            {typeMeta.needsTextOverlay ? (
              <Alert variant="info" className="mt-3">
                这个类型通常需要文字（卖点 / 规格）。建议先生成画面，再用「文字叠加」把确认过的文案加上去。
              </Alert>
            ) : null}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">3. 平台与画幅</h2>
            <OptionGroup
              name="image-platform"
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={(value) => setPlatform(value as PlatformId)}
              columns={2}
              size="sm"
              disabled={busy}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              推荐尺寸：{spec.recommended.map((item) => `${item.label} ${item.width}×${item.height}`).join('、')}
              。这些是通用建议，不是平台强制规范，可自行改画幅。
            </p>
            <div className="mt-3">
              <OptionGroup
                name="image-ratio"
                options={RATIO_OPTIONS}
                value={ratio}
                onChange={(value) => setRatio(value as AspectRatioId)}
                columns={3}
                size="sm"
                disabled={busy}
              />
            </div>
            {ratio === 'custom' ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="宽度（px）" optional={false}>
                  <input
                    className="input"
                    type="number"
                    min={128}
                    max={4096}
                    value={width}
                    onChange={(event) => setWidth(Number(event.target.value))}
                  />
                </Field>
                <Field label="高度（px）" optional={false}>
                  <input
                    className="input"
                    type="number"
                    min={128}
                    max={4096}
                    value={height}
                    onChange={(event) => setHeight(Number(event.target.value))}
                  />
                </Field>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-400">
                当前画幅：{width}×{height}px
              </p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">4. 生成模式</h2>
            <OptionGroup
              name="image-fidelity"
              options={FIDELITY_OPTIONS}
              value={fidelity}
              onChange={(value) => setFidelity(value as ImageFidelityMode)}
              columns={1}
              size="sm"
              disabled={busy}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              即使使用保真模式，图像模型仍可能轻微改动细节（纹理、反光、配件位置）。发布前请人工核对。
            </p>
            {imageProvider && !imageProvider.supportsImageEditing && fidelity === 'fidelity' ? (
              <Alert variant="warning" className="mt-3" title={`${imageProvider.label} 不支持传入商品原图`}>
                <p className="text-xs leading-relaxed">
                  保真模式需要把原图发给模型做「图生图」，而当前图片模型只能纯文字生成，
                  直接生成会被后端拒绝（不会静默丢掉原图）。
                </p>
                <button
                  type="button"
                  className="mt-2 btn btn-xs btn-secondary"
                  onClick={() => setFidelity('creative')}
                >
                  改用创意营销模式
                </button>
              </Alert>
            ) : null}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">5. 商品信息（选填但建议填）</h2>
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
              <Field label="材质 / 尺寸">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    value={product.material}
                    placeholder="316 不锈钢"
                    onChange={(event) => setProduct((prev) => ({ ...prev, material: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.size}
                    placeholder="高 22cm / 500ml"
                    onChange={(event) => setProduct((prev) => ({ ...prev, size: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="颜色 / 功能">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    value={product.color}
                    placeholder="雾蓝"
                    onChange={(event) => setProduct((prev) => ({ ...prev, color: event.target.value }))}
                  />
                  <input
                    className="input"
                    value={product.functions}
                    placeholder="保温 12 小时"
                    onChange={(event) => setProduct((prev) => ({ ...prev, functions: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="补充提示词（可选）" hint="例如：放在木质桌面上，旁边有一杯咖啡">
                <textarea
                  className="input min-h-[64px] resize-y"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="想强调的场景、光线或构图"
                  maxLength={800}
                />
              </Field>
              <Field label="本次生成张数">
                <select
                  className="input"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                >
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      {value} 张（不同构图变体）
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {prefs.mode === 'byok' ? (
            <section className="card p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <ImageIcon className="h-4 w-4 text-brand-600" />
                本次会话的图片模型 Key
              </h2>
              <p className="mb-2 text-xs leading-relaxed text-ink-500">
                图片模型与文本模型分开配置。Key 只保存在本页内存，刷新即失效，不写入浏览器存储。
              </p>
              <input
                className="input"
                type="password"
                value={keys.image}
                placeholder={`${prefs.image.provider} 的 API Key`}
                onChange={(event) => {
                  const next = { ...keys, image: event.target.value }
                  setKeys(next)
                  setSessionKeys(next)
                }}
                autoComplete="off"
              />
              {imageProvider?.id === 'deepseek-image' ? (
                <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                  DeepSeek 官方目前不提供图片生成模型，这条通道是按 OpenAI Images 兼容协议预留的。
                  模型名请填你账户或兼容网关里真实可用的名称，否则调用会如实报「模型不存在」，不会返回伪造图片。
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span className="chip text-[11px]">
                  {imageProvider ? imageProvider.label : prefs.image.provider}
                </span>
                <span className="chip text-[11px]">{prefs.image.model || '未填模型'}</span>
                <Link className="link-underline text-brand-700" to="/models">
                  去模型设置
                </Link>
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-2">
            <button type="button" className="btn-primary" onClick={() => void runGenerate(false)} disabled={busy}>
              {generating ? <Spinner /> : <Images className="h-4 w-4" />}
              {generating ? '正在生成图片…' : '生成商品效果图'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void runGenerate(true)} disabled={busy}>
              {demoBusy ? <Spinner /> : <Upload className="h-4 w-4" />}
              用演示数据生成
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              清空图片与结果
            </button>
          </div>
        </div>

        {/* ---------------- 右侧结果区 ---------------- */}
        <div className="space-y-4" ref={resultRef}>
          {pageError ? (
            <Alert
              variant="error"
              title="生成失败"
              actions={
                <button type="button" className="btn btn-xs btn-secondary" onClick={() => void regenerate()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  重试
                </button>
              }
              onClose={() => setPageError(null)}
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

          {busy ? (
            <GeneratingPanel demo={demoBusy} />
          ) : !result ? (
            <EmptyStudio />
          ) : (
            <>
              <section className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {result.mode === 'demo' ? (
                        <span className="chip border-amber-300 bg-amber-50 text-amber-800">
                          演示数据（非真实 AI 生成）
                        </span>
                      ) : (
                        <span className="chip border-emerald-300 bg-emerald-50 text-emerald-700">
                          真实模型生成
                        </span>
                      )}
                      <span className="chip">{PLATFORM_META[result.platform].label}</span>
                      <span className="chip">{IMAGE_TYPE_META[result.imageType].label}</span>
                      <span className="chip">
                        {result.fidelity === 'fidelity' ? '商品保真' : '创意营销'}
                      </span>
                      <span className="chip">
                        {result.meta.width}×{result.meta.height}
                      </span>
                      <span className="chip">{IMAGE_FORMAT_META[result.meta.format].label}</span>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      图片模型：{result.meta.provider} / {result.meta.model} · 质量{' '}
                      {IMAGE_QUALITY_META[result.meta.quality].label} · 耗时{' '}
                      {(result.meta.latencyMs / 1000).toFixed(1)}s ·{' '}
                      {new Date().toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => void regenerate()}
                      disabled={busy}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      重新生成
                    </button>
                  </div>
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

                <details className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  <summary className="cursor-pointer select-none font-medium text-ink-700">
                    查看本次提示词与参数
                  </summary>
                  <div className="mt-2 space-y-2">
                    <p className="whitespace-pre-wrap break-words">{result.prompt}</p>
                    <p className="text-ink-400">反向提示词：{result.negativePrompt}</p>
                  </div>
                </details>
              </section>

              <div className={cn('grid gap-4', result.images.length > 1 ? 'sm:grid-cols-2' : '')}>
                {result.images.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    needsText={IMAGE_TYPE_META[result.imageType].needsTextOverlay}
                    defaultText={product.name ? `${product.name}\n${product.functions}` : ''}
                    overlayOpen={overlayId === image.id}
                    onToggleOverlay={() => setOverlayId(overlayId === image.id ? null : image.id)}
                    onDelete={() => removeImage(image.id)}
                  />
                ))}
              </div>

              <p className="text-xs leading-relaxed text-ink-500">
                发布前请人工核对：生成的场景与光影可以和原图不同，但商品本身的形状、颜色、结构与配件应与实物一致。
                若发现偏差，建议降低创意程度或改用保真模式重新生成。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ImageCardProps {
  image: GeneratedImage
  index: number
  needsText: boolean
  defaultText: string
  overlayOpen: boolean
  onToggleOverlay: () => void
  onDelete: () => void
}

function ImageCard({
  image,
  index,
  needsText,
  defaultText,
  overlayOpen,
  onToggleOverlay,
  onDelete,
}: ImageCardProps) {
  const { copiedKey, copy } = useCopy()

  const download = () => {
    const anchor = document.createElement('a')
    anchor.href = image.url
    anchor.download = `productai-${image.id}.${IMAGE_FORMAT_META[image.format].ext}`
    anchor.click()
  }

  return (
    <section className="card overflow-hidden">
      <div className="relative bg-ink-50">
        <img src={image.url} alt={`效果图 ${index + 1}`} className="w-full object-cover" />
        <span className="absolute left-2 top-2 chip text-[11px]">变体 {index + 1}</span>
        {image.demo ? (
          <span className="absolute right-2 top-2 chip border-amber-300 bg-amber-50 text-[11px] text-amber-800">
            演示
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button type="button" className="btn btn-xs btn-secondary" onClick={download}>
          <Download className="h-3.5 w-3.5" />
          下载
        </button>
        <button type="button" className="btn btn-xs btn-ghost" onClick={onToggleOverlay}>
          <Type className="h-3.5 w-3.5" />
          {overlayOpen ? '收起文字' : needsText ? '加文字（建议）' : '加文字'}
        </button>
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={() => void copy(image.prompt, `prompt-${image.id}`)}
        >
          {copiedKey === `prompt-${image.id}` ? '已复制' : '复制提示词'}
        </button>
        <button type="button" className="btn btn-xs btn-ghost ml-auto text-rose-600" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {overlayOpen ? (
        <div className="px-3 pb-3">
          <TextOverlayEditor
            imageUrl={image.url}
            width={image.width}
            height={image.height}
            fileName={`productai-${image.id}`}
            defaultText={defaultText}
          />
        </div>
      ) : null}
    </section>
  )
}

function EmptyStudio() {
  return (
    <section className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Images className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink-900">效果图会显示在这里</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        左侧上传商品图、选择图片类型与平台后点「生成商品效果图」；
        还没有配置图片模型时，可以先点「用演示数据生成」看完整流程（画面会明确标注演示）。
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link className="btn btn-xs btn-secondary" to="/models">
          配置图片模型
        </Link>
        <Link className="btn btn-xs btn-ghost" to="/generate">
          先写文案
        </Link>
      </div>
    </section>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
