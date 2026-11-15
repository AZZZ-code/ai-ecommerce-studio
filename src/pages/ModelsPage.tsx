import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Images,
  KeyRound,
  Loader2,
  Lock,
  PlugZap,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import type {
  ImageEndpointConfig,
  ImageFormatId,
  ImageProviderOption,
  ImageQualityId,
  ModelEndpointConfig,
  ProviderOption,
  TestConnectionResponse,
  TestConnectionTargetResult,
} from '@/types'
import {
  IMAGE_FORMAT_META,
  IMAGE_QUALITY_META,
  PLATFORM_META,
  type ImageProviderId,
} from '@/types'
import { Alert } from '@/components/Alert'
import { Field } from '@/components/Field'
import { OptionGroup } from '@/components/OptionGroup'
import { Spinner } from '@/components/Spinner'
import { useModelCatalog } from '@/hooks/useModelCatalog'
import { keyShapeHint } from '@/lib/keyShape'
import { checkHealth, describeError, testConnection } from '@/services/api'
import { clearSessionKeys, getSessionKeys, setSessionKeys } from '@/services/sessionKeys'
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type StoredEndpoint,
  type StoredPreferences,
} from '@/services/storage'

type Role = 'vision' | 'text'
type EndpointRole = Role | 'image'

const ROLE_META: Record<Role, { title: string; desc: string; placeholderModel: string }> = {
  vision: {
    title: '视觉模型（图片识别）',
    desc: '必须支持图片输入，负责识别商品类别、颜色、外观与可见特征。',
    placeholderModel: '如：gpt-4o-mini / gemini-1.5-flash（需支持图片）',
  },
  text: {
    title: '文本模型（文案生成）',
    desc: '负责标题、卖点、介绍与营销文案，只需支持文本生成。',
    placeholderModel: '如：gpt-4o-mini / claude-3-5-sonnet',
  },
}

function StatusBadge({ result }: { result?: TestConnectionTargetResult }) {
  if (!result) return null
  return result.ok ? (
    <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      连接成功 · {result.latencyMs}ms
    </span>
  ) : (
    <span className="chip border-red-200 bg-red-50 text-red-700">
      <AlertCircle className="h-3 w-3" />
      连接失败
    </span>
  )
}

export function ModelsPage() {
  const { catalog, loading: catalogLoading, error: catalogError, reload } = useModelCatalog()
  const [prefs, setPrefs] = useState<StoredPreferences>(() => loadPreferences())
  const [draft, setDraft] = useState<StoredPreferences>(() => loadPreferences())
  const [keys, setKeys] = useState(() => getSessionKeys())
  const [showKey, setShowKey] = useState<Record<EndpointRole, boolean>>({ vision: false, text: false, image: false })
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<'vision' | 'text' | 'image' | 'all' | null>(null)
  const [testResults, setTestResults] = useState<TestConnectionResponse['results']>({})
  const [testError, setTestError] = useState<string | null>(null)
  /** 本站后端（/api）可达性：与「模型服务商连不上」是两件事，必须分开显示 */
  const [backendIssue, setBackendIssue] = useState<{ message: string; hint?: string } | null>(null)
  const [probingBackend, setProbingBackend] = useState(false)

  const providers = useMemo<ProviderOption[]>(() => catalog?.providers ?? [], [catalog])
  const providerMap = useMemo(() => {
    const map = new Map<string, ProviderOption>()
    for (const provider of providers) map.set(provider.id, provider)
    return map
  }, [providers])

  /**
   * 探测本站后端是否可达（GET /api/health）。
   * 失败说明问题在「浏览器 → 本站」，而不是「后端 → 模型服务商」，
   * 这样用户点「测试连接」时不会再看到一句无从下手的「网络请求失败」。
   */
  const probeBackend = useCallback(async (): Promise<boolean> => {
    setProbingBackend(true)
    try {
      await checkHealth()
      setBackendIssue(null)
      // 健康检查恢复后，清掉此前「后端不可达」的过期提示，避免用户以为还没好
      setTestError((prev) => (prev && prev.includes('本站后端接口不可达') ? null : prev))
      return true
    } catch (err) {
      const detail = describeError(err)
      setBackendIssue({ message: detail.message, hint: detail.hint })
      return false
    } finally {
      setProbingBackend(false)
    }
  }, [])

  useEffect(() => {
    void probeBackend()
  }, [probeBackend])

  const markDirty = () => {
    setSaved(false)
    setTestResults({})
    setTestError(null)
  }

  const updateEndpoint = (role: Role, patch: Partial<StoredEndpoint>) => {
    setDraft((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }))
    markDirty()
  }

  const changeProvider = (role: Role, providerId: string) => {
    const provider = providerMap.get(providerId)
    const models = role === 'vision' ? provider?.visionModels : provider?.textModels
    updateEndpoint(role, {
      provider: providerId as StoredEndpoint['provider'],
      baseUrl: '',
      model: models?.[0]?.id ?? '',
    })
  }

  const buildEndpoint = (role: Role): ModelEndpointConfig => ({
    provider: draft[role].provider,
    baseUrl: draft[role].baseUrl.trim(),
    apiKey: keys[role].trim(),
    model: draft[role].model.trim(),
  })

  const buildImageEndpoint = (): ImageEndpointConfig => ({
    provider: draft.image.provider,
    baseUrl: draft.image.baseUrl.trim(),
    apiKey: keys.image.trim(),
    model: draft.image.model.trim(),
    quality: draft.image.quality,
    format: draft.image.format,
  })

  const runTest = async (target: 'vision' | 'text' | 'image' | 'all') => {
    setTesting(target)
    setTestError(null)
    try {
      // 先确认「本站后端可达」，否则后面的失败会被误读成模型服务商的问题
      const reachable = await probeBackend()
      if (!reachable) {
        setTestError('本站后端接口不可达，测试没有发出。请先按上方提示修复本地服务或代理配置。')
        return
      }

      const payload =
        target === 'vision'
          ? { target: 'vision' as const, vision: buildEndpoint('vision') }
          : target === 'text'
            ? { target: 'text' as const, text: buildEndpoint('text') }
            : target === 'image'
              ? { target: 'image' as const, image: buildImageEndpoint() }
              : {
                  target: 'all' as const,
                  vision: buildEndpoint('vision'),
                  text: buildEndpoint('text'),
                  image: buildImageEndpoint(),
                }

      const response = await testConnection(payload)
      setTestResults(response.results ?? {})
      if (response.error) setTestError(response.error.message)
    } catch (err) {
      setTestError(describeError(err).message)
    } finally {
      setTesting(null)
    }
  }

  const handleSave = () => {
    const next: StoredPreferences = {
      ...draft,
      vision: { ...draft.vision, baseUrl: draft.vision.baseUrl.trim(), model: draft.vision.model.trim() },
      text: { ...draft.text, baseUrl: draft.text.baseUrl.trim(), model: draft.text.model.trim() },
      image: {
        ...draft.image,
        baseUrl: draft.image.baseUrl.trim(),
        model: draft.image.model.trim(),
      },
    }
    savePreferences(next)
    setPrefs(next)
    setDraft(next)
    // Key 只放在内存里，供生成页复用；不写 localStorage
    setSessionKeys({ vision: keys.vision.trim(), text: keys.text.trim(), image: keys.image.trim() })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2600)
  }

  const handleDelete = () => {
    const reset = { ...DEFAULT_PREFERENCES }
    savePreferences(reset)
    clearSessionKeys()
    setPrefs(reset)
    setDraft(reset)
    setKeys({ vision: '', text: '', image: '' })
    setTestResults({})
    setTestError(null)
    setSaved(false)
  }

  /**
   * 图片模型配置卡
   * --------------------------------------------------------------------------
   * 图片模型（效果图生成）与文本 / 视觉模型完全独立：
   *  - 服务商：Gemini 图片生成 / OpenAI GPT Image / 自定义兼容接口；
   *  - 额外参数：生成质量、输出格式；
   *  - 测试连接会实际发一次最小尺寸生成请求，不会伪造成功。
   * Key 同样只存在于内存，不写 localStorage。
   */
  const renderImageEndpoint = () => {
    const imageProviders: ImageProviderOption[] = catalog?.imageProviders ?? []
    const provider = imageProviders.find((item) => item.id === draft.image.provider) ?? imageProviders[0]
    const models = provider?.models ?? []
    const result = testResults.image
    return (
      <section className="card p-5 lg:col-span-2">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Images className="h-4 w-4 text-brand-600" />
              图片模型（效果图生成）
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              只用它生成商品效果图，与文案模型互不影响。图片模型需要「支持图片输入」才能保留商品原样；
              不支持编辑的模型只能用创意模式从零生成。
            </p>
          </div>
          {result ? <StatusBadge result={result} /> : null}
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="服务商" optional={false}>
            <select
              className="input"
              value={draft.image.provider}
              onChange={(event) => {
                const nextProvider = imageProviders.find((item) => item.id === event.target.value)
                setDraft((prev) => ({
                  ...prev,
                  image: {
                    ...prev.image,
                    provider: event.target.value as ImageProviderId,
                    baseUrl: '',
                    model: nextProvider?.models[0]?.id ?? '',
                  },
                }))
                markDirty()
              }}
            >
              {imageProviders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="API Base URL" hint="留空使用官方默认地址；自定义地址会做白名单校验（防 SSRF）">
            <input
              className="input"
              value={draft.image.baseUrl}
              placeholder={provider?.defaultBaseUrl || 'https://your-image-api.example.com/v1'}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, image: { ...prev.image, baseUrl: event.target.value } }))
                markDirty()
              }}
            />
          </Field>

          <Field label="API Key" hint="仅保存在当前页面内存，请求结束后后端立即丢弃">
            <div className="flex gap-2">
              <input
                className="input"
                type={showKey.image ? 'text' : 'password'}
                value={keys.image}
                placeholder="sk-..."
                autoComplete="off"
                onChange={(event) => {
                  setKeys((prev) => ({ ...prev, image: event.target.value }))
                  markDirty()
                }}
              />
              <button
                type="button"
                className="btn btn-xs btn-ghost shrink-0"
                onClick={() => setShowKey((prev) => ({ ...prev, image: !prev.image }))}
                title={showKey.image ? '隐藏' : '显示'}
              >
                {showKey.image ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {keyShapeHint(draft.image.provider, keys.image) ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-600">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              {keyShapeHint(draft.image.provider, keys.image)}
            </p>
          ) : null}

          <Field label="图片模型名称" optional={false} hint="可手填；不在推荐列表里的模型也会按该服务商的协议调用">
            <input
              className="input"
              value={draft.image.model}
              placeholder={
                models[0]?.id ??
                (provider?.id === 'deepseek-image' ? '请填 DeepSeek 可用的图片模型名' : 'gpt-image-1')
              }
              list="image-model-options"
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, image: { ...prev.image, model: event.target.value } }))
                markDirty()
              }}
            />
            <datalist id="image-model-options">
              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.supportsImageEditing ? ' · 支持改图' : ' · 仅文生图'}
                </option>
              ))}
            </datalist>
          </Field>

          <Field label="生成质量">
            <select
              className="input"
              value={draft.image.quality}
              onChange={(event) => {
                setDraft((prev) => ({
                  ...prev,
                  image: { ...prev.image, quality: event.target.value as ImageQualityId },
                }))
                markDirty()
              }}
            >
              {(Object.keys(IMAGE_QUALITY_META) as ImageQualityId[]).map((id) => (
                <option key={id} value={id}>
                  {IMAGE_QUALITY_META[id].label} — {IMAGE_QUALITY_META[id].desc}
                </option>
              ))}
            </select>
          </Field>

          <Field label="输出格式">
            <select
              className="input"
              value={draft.image.format}
              onChange={(event) => {
                setDraft((prev) => ({
                  ...prev,
                  image: { ...prev.image, format: event.target.value as ImageFormatId },
                }))
                markDirty()
              }}
            >
              {(Object.keys(IMAGE_FORMAT_META) as ImageFormatId[]).map((id) => (
                <option key={id} value={id}>
                  {IMAGE_FORMAT_META[id].label}（.{IMAGE_FORMAT_META[id].ext}）
                </option>
              ))}
            </select>
          </Field>
        </div>

        {provider?.notes ? (
          <Alert
            variant={provider.id === 'deepseek-image' ? 'warning' : 'info'}
            className="mt-3"
            title={provider.id === 'deepseek-image' ? '关于 DeepSeek 出图：现阶段没有官方图片模型' : undefined}
          >
            <p className="text-xs leading-relaxed">{provider.notes}</p>
            {provider.id === 'deepseek-image' ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                因此这里的 DeepSeek 图片通道是按 OpenAI Images 兼容协议预留的：Key 仍然只给后端使用，
                模型名需要你填账户或兼容网关里真实可用的名称；官方未开放前调用会如实报错（模型不存在 / 鉴权失败），
                不会返回任何伪造的图片。现在要稳定出图，建议选 OpenAI GPT Image 或 Google Gemini Image。
              </p>
            ) : null}
          </Alert>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-xs btn-secondary"
            onClick={() => void runTest('image')}
            disabled={testing !== null}
          >
            {testing === 'image' ? <Spinner /> : <PlugZap className="h-3.5 w-3.5" />}
            测试图片模型
          </button>
          {provider ? (
            <span className="text-[11px] text-ink-400">
              {provider.requestFormat} · 默认地址 {provider.defaultBaseUrl || '（需自行填写）'}
              {provider.supportsImageEditing ? ' · 支持传入原图' : ' · 不支持传入原图（只能创意模式）'}
            </span>
          ) : null}
        </div>

        {result && !result.ok ? (
          <Alert variant="error" className="mt-3">
            <p>{result.message}</p>
            {result.sample ? <p className="mt-1 text-xs text-ink-500">{result.sample}</p> : null}
          </Alert>
        ) : null}
      </section>
    )
  }

  const renderEndpoint = (role: Role) => {
    const meta = ROLE_META[role]
    const provider = providerMap.get(draft[role].provider)
    const models = role === 'vision' ? provider?.visionModels : provider?.textModels
    const result = testResults[role]
    const datalistId = `model-options-${role}`

    return (
      <section className="card p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink-900">{meta.title}</h2>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-ink-400">{meta.desc}</p>
          </div>
          <StatusBadge result={result} />
        </header>

        <div className="mt-4 grid gap-3">
          <Field label="API 服务商" optional={false}>
            <select
              className="input"
              value={draft[role].provider}
              onChange={(event) => changeProvider(role, event.target.value)}
              disabled={providers.length === 0}
            >
              {providers.length === 0 ? <option value={draft[role].provider}>加载中…</option> : null}
              {providers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.requiresBaseUrl ? '（需填 Base URL）' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="API Base URL"
            hint={
              provider
                ? `留空则使用默认地址：${provider.defaultBaseUrl}。自定义地址会经过服务商白名单校验（防 SSRF）。`
                : '留空使用服务商默认地址。'
            }
          >
            <input
              className="input font-mono text-xs"
              placeholder={provider?.defaultBaseUrl ?? 'https://…'}
              value={draft[role].baseUrl}
              onChange={(event) => updateEndpoint(role, { baseUrl: event.target.value })}
              spellCheck={false}
            />
          </Field>

          <Field label="API Key" hint="仅保存在当前页面内存中，随请求发送后即丢弃，不写入浏览器存储。">
            <div className="relative">
              <input
                type={showKey[role] ? 'text' : 'password'}
                className="input pr-10 font-mono text-xs"
                placeholder="sk-..."
                autoComplete="off"
                value={keys[role]}
                onChange={(event) => {
                  const next = { ...keys, [role]: event.target.value }
                  setKeys(next)
                  markDirty()
                }}
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 hover:bg-slate-100 hover:text-ink-700"
                onClick={() => setShowKey((prev) => ({ ...prev, [role]: !prev[role] }))}
                aria-label={showKey[role] ? '隐藏 Key' : '显示 Key'}
              >
                {showKey[role] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>
          {keyShapeHint(draft[role].provider, keys[role]) ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-600">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              {keyShapeHint(draft[role].provider, keys[role])}
            </p>
          ) : null}

          <Field label={role === 'vision' ? '视觉模型名称' : '文本模型名称'} optional={false}>
            <input
              className="input font-mono text-xs"
              list={datalistId}
              placeholder={meta.placeholderModel}
              value={draft[role].model}
              onChange={(event) => updateEndpoint(role, { model: event.target.value })}
              spellCheck={false}
            />
            <datalist id={datalistId}>
              {(models ?? []).map((model) => (
                <option key={model.id} value={model.id} />
              ))}
            </datalist>
          </Field>

          {models && models.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-ink-400">推荐：</span>
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className="chip text-[10px] transition hover:border-brand-300 hover:text-brand-700"
                  onClick={() => updateEndpoint(role, { model: model.id })}
                >
                  {model.label}
                  {model.supportsVision ? ' · 支持图片' : ''}
                </button>
              ))}
            </div>
          ) : null}

          {role === 'vision' && provider?.id === 'deepseek' ? (
            <Alert variant="error" title="DeepSeek 不能作为视觉模型">
              DeepSeek 目前只提供文本模型（deepseek-chat / deepseek-reasoner），不支持图片输入。
              请把它用在右侧的「文本模型」上；视觉识别请选择 OpenAI、Gemini 或 Claude，
              或者生成时使用「仅文字生成」，只根据你填写的商品信息写文案。
            </Alert>
          ) : null}

          {role === 'vision' && provider?.id === 'compatible' ? (
            <Alert variant="warning">
              兼容接口无法自动判断模型能力，请确认该模型能接收图片输入（image_url / inlineData 格式），
              否则后端会拒绝把它当作视觉模型。
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary btn-xs"
              onClick={() => void runTest(role)}
              disabled={testing !== null}
            >
              {testing === role ? <Spinner /> : <PlugZap className="h-3.5 w-3.5" />}
              测试连接
            </button>
            {result?.sample ? (
              <details className="text-[11px] text-ink-400">
                <summary className="cursor-pointer select-none hover:text-ink-700">查看返回原文</summary>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] leading-4 text-ink-500">
                  {result.sample}
                </pre>
              </details>
            ) : null}
          </div>

          {result && !result.ok ? (
            <Alert variant="error" title={`模型 ${result.model || '（未填写）'} 调用失败`}>
              {result.message}
            </Alert>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="max-w-3xl">
        <span className="eyebrow">
          <Server className="h-3 w-3" />
          AI 模型设置
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          选择接入模式与模型
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          视觉模型与文本模型分开配置，可以来自不同服务商。没有配置时也可以先使用演示模式完整体验流程。
        </p>
      </div>

      {backendIssue ? (
        <Alert
          variant="error"
          className="mt-5"
          title="本站后端接口不可达（连不上自己的 /api）"
          actions={
            <button
              type="button"
              className="btn-secondary btn-xs"
              onClick={() => void probeBackend()}
              disabled={probingBackend}
            >
              {probingBackend ? <Spinner className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
              重新检测
            </button>
          }
        >
          <p className="font-medium text-ink-800">{backendIssue.message}</p>
          {backendIssue.hint ? <p className="mt-1.5 text-ink-600">{backendIssue.hint}</p> : null}
          <p className="mt-2 text-[11px] text-ink-500">
            说明：这只是「浏览器访问本站 /api」这一跳失败，与模型服务商是否连通无关，此时你的 API Key 还没有被使用。
            排查路径：① 项目根目录执行 <code className="rounded bg-ink-100 px-1">npm run dev</code>（或部署地址是否把
            /api/* 转发到 Pages Functions）；② 不要用 file:// 直接打开 dist/index.html；③ 用{' '}
            <code className="rounded bg-ink-100 px-1">curl 本机地址/api/health</code> 单独确认后端是否活着。
          </p>
        </Alert>
      ) : null}

      {catalogError ? (
        <Alert
          variant="error"
          className="mt-5"
          title="模型清单加载失败"
          actions={
            <button type="button" className="btn-secondary btn-xs" onClick={() => void reload()}>
              <RefreshCw className="h-3 w-3" />
              重试
            </button>
          }
        >
          {catalogError}
        </Alert>
      ) : null}

      {/* 接入模式 */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-bold text-ink-900">接入模式</h2>
        <p className="mt-1 text-[11px] text-ink-400">
          模式 A 由站点管理员在后端配置 Key；模式 B 由你自己提供 Key（BYOK），更灵活但需要自行承担调用费用。
        </p>
        <div className="mt-3">
          <OptionGroup
            name="接入模式"
            columns={2}
            value={draft.mode}
            onChange={(mode) => {
              setDraft((prev) => ({ ...prev, mode }))
              markDirty()
            }}
            options={[
              {
                value: 'platform',
                label: 'A · 平台默认 API',
                desc: '普通用户无需填写 Key，上传图片即可使用（需要管理员已配置）',
              },
              {
                value: 'byok',
                label: 'B · 用户自带 API（BYOK）',
                desc: '自行填写服务商、Base URL、Key 与模型名称',
              },
            ]}
          />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <Lock className="h-3.5 w-3.5 text-brand-600" />
              平台默认 API 状态
            </p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => void reload()}>
              {catalogLoading ? <Spinner /> : <RefreshCw className="h-3 w-3" />}
              刷新状态
            </button>
          </div>
          {catalog ? (
            catalog.platformDefault.configured ? (
              <div className="mt-2 space-y-1 text-[11px] text-ink-500">
                <p className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  已配置（后端环境变量读取，前端不会拿到 Key）
                </p>
                <p>
                  视觉：{catalog.platformDefault.vision?.provider} / {catalog.platformDefault.vision?.model}
                </p>
                <p>
                  文本：{catalog.platformDefault.text?.provider} / {catalog.platformDefault.text?.model}
                </p>
              </div>
            ) : (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-amber-700">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                未配置。管理员需在 Cloudflare Pages 环境变量（或本地 .dev.vars）中设置服务商 Key，例如
                OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY。未配置时生成请求会提示切换到演示模式。
              </p>
            )
          ) : (
            <p className="mt-2 text-[11px] text-ink-400">{catalogLoading ? '正在读取状态…' : '暂无数据'}</p>
          )}
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs text-ink-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
            checked={draft.demoFallback}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, demoFallback: event.target.checked }))
              markDirty()
            }}
          />
          <span>
            没有可用真实配置时，自动使用演示数据（演示结果会显著标注，不会伪装成真实 AI 输出）
          </span>
        </label>
      </section>

      {/* 双端点配置 */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {renderEndpoint('vision')}
        {renderEndpoint('text')}
        {renderImageEndpoint()}
      </div>

      {/* 操作按钮 */}
      <section className="card mt-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Save className="h-4 w-4" />
            保存配置
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void runTest('all')}
            disabled={testing !== null}
          >
            {testing === 'all' ? <Spinner /> : <PlugZap className="h-4 w-4" />}
            测试全部模型
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setKeys({ vision: '', text: '', image: '' })
              clearSessionKeys()
              setTestResults({})
            }}
          >
            <KeyRound className="h-4 w-4" />
            清除内存中的 Key
          </button>
          <button
            type="button"
            className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            删除配置
          </button>
          {saved ? (
            <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              已保存（Key 未落盘）
            </span>
          ) : null}
        </div>

        {testError ? (
          <Alert variant="error" className="mt-3">
            {testError}
          </Alert>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-400">
          <span className="chip">
            <ShieldCheck className="h-3 w-3 text-brand-500" />
            Key 不写入 localStorage
          </span>
          <span className="chip">
            <ShieldCheck className="h-3 w-3 text-brand-500" />
            后端用完即丢弃
          </span>
          <span className="chip">
            <ShieldCheck className="h-3 w-3 text-brand-500" />
            自定义 Base URL 走白名单
          </span>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-ink-400">
          当前已保存的偏好：{prefs.mode === 'platform' ? '平台默认 API' : 'BYOK'} · 平台{' '}
          {PLATFORM_META[prefs.platform].label} · 视觉 {prefs.vision.provider}/{prefs.vision.model || '未填写'} · 文本{' '}
          {prefs.text.provider}/{prefs.text.model || '未填写'} · 图片 {prefs.image.provider}/{prefs.image.model || '未填写'}
        </p>
        <p className="mt-1 text-[11px] text-ink-400">
          保存后可直接前往{' '}
          <Link to="/generate" className="font-semibold text-brand-700 hover:underline">
            开始创作
          </Link>
          ；本页刷新会清空 Key，需要重新输入。
        </p>
      </section>

      {/* 能力说明 */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-bold text-ink-900">服务商适配与模型能力</h2>
        <p className="mt-1 text-[11px] text-ink-400">
          不同服务商的请求格式不同，后端分别适配；视觉模型必须支持图片输入，否则不允许被选为视觉模型。
        </p>

        {catalogLoading && providers.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在加载服务商信息…
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {providers.map((provider) => (
              <article key={provider.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900">{provider.label}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-400">{provider.id}</p>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[11px] font-semibold text-brand-700 hover:underline"
                  >
                    官方文档 ↗
                  </a>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-ink-500">{provider.requestFormat}</p>
                <p className="mt-2 text-[11px] text-ink-400">
                  默认地址：<span className="font-mono">{provider.defaultBaseUrl}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {provider.visionModels.length > 0 ? (
                    <span className="chip-brand text-[10px]">
                      视觉 {provider.visionModels.length} 个
                    </span>
                  ) : (
                    <span className="chip border-slate-200 bg-slate-50 text-[10px] text-ink-500">
                      不支持图片输入
                    </span>
                  )}
                  <span className="chip text-[10px]">文本 {provider.textModels.length} 个</span>
                  {provider.requiresBaseUrl ? (
                    <span className="chip border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      需填 Base URL
                    </span>
                  ) : null}
                </div>
                {provider.visionModels.length === 0 ? (
                  <p className="mt-2 text-[11px] leading-5 text-amber-700">
                    只能作为文本模型：生成时不会把图片发送给它，请用「仅文字生成」或另配视觉模型。
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <Alert variant="info" className="mt-4" title="关于密钥安全">
          平台默认 API 的 Key 只存在于后端环境变量 / Secrets 中，接口返回值里不会包含 Key。
          BYOK 的 Key 由浏览器通过 HTTPS 发送到后端，仅用于当次请求，后端处理完成后立即丢弃，也不会写日志。
        </Alert>
      </section>
    </div>
  )
}
