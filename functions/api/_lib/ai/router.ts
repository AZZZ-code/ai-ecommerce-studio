import type {
  AccessMode,
  ModelConfigInput,
  ModelEndpointConfig,
  ProviderId,
} from '../../../../shared/types'
import { ApiError } from '../errors'
import { assertAllowedBaseUrl } from '../ssrf'
import { cleanApiKey } from '../validate'
import type { Env } from '../types'
import { PIXEL_PNG_BASE64 } from '../validate'
import { PROVIDER_OPTIONS, checkVisionSupport, getProvider } from './catalog'
import type { ProviderResult } from './types'

export interface ResolvedEndpoint {
  provider: ProviderId
  baseUrl: string
  apiKey: string
  model: string
}

export interface ResolvedConfig {
  /** 视觉端点：仅当平台配置了支持图片输入的服务商时存在；纯文本配置下为 null */
  vision: ResolvedEndpoint | null
  text: ResolvedEndpoint
  accessMode: AccessMode
}

/** 每个服务商在环境变量里的键名 */
const ENV_KEYS: Record<
  ProviderId,
  { apiKey: string; baseUrl: string; visionModel: string; textModel: string }
> = {
  openai: {
    apiKey: 'OPENAI_API_KEY',
    baseUrl: 'OPENAI_BASE_URL',
    visionModel: 'OPENAI_VISION_MODEL',
    textModel: 'OPENAI_TEXT_MODEL',
  },
  deepseek: {
    apiKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'DEEPSEEK_BASE_URL',
    // DeepSeek 没有视觉模型，保留键名只为兼容既有部署习惯
    visionModel: 'DEEPSEEK_VISION_MODEL',
    textModel: 'DEEPSEEK_TEXT_MODEL',
  },
  gemini: {
    apiKey: 'GEMINI_API_KEY',
    baseUrl: 'GEMINI_BASE_URL',
    visionModel: 'GEMINI_VISION_MODEL',
    textModel: 'GEMINI_TEXT_MODEL',
  },
  claude: {
    apiKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'ANTHROPIC_BASE_URL',
    visionModel: 'ANTHROPIC_VISION_MODEL',
    textModel: 'ANTHROPIC_TEXT_MODEL',
  },
  compatible: {
    apiKey: 'COMPATIBLE_API_KEY',
    baseUrl: 'COMPATIBLE_BASE_URL',
    visionModel: 'COMPATIBLE_VISION_MODEL',
    textModel: 'COMPATIBLE_TEXT_MODEL',
  },
}

const PROVIDER_ORDER: ProviderId[] = ['openai', 'deepseek', 'gemini', 'claude', 'compatible']

export function getTimeoutMs(env: Env): number {
  const parsed = Number.parseInt(env.AI_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(parsed)) return 60_000
  return Math.min(120_000, Math.max(10_000, parsed))
}

function defaultModels(provider: ProviderId): { vision: string; text: string } {
  const option = PROVIDER_OPTIONS.find((item) => item.id === provider)
  return {
    vision: option?.visionModels[0]?.id ?? '',
    text: option?.textModels[0]?.id ?? '',
  }
}

function visionAllowlist(env: Env): string[] {
  return (env.VISION_MODEL_ALLOWLIST ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 模式 A：读取后端环境变量里的平台默认配置。
 * 返回 null 表示管理员还未配置任何 Key —— 此时代码层应引导用户使用演示模式或 BYOK。
 *
 * 视觉端与文本端可以来自不同服务商（例如视觉用 OpenAI、文案用 DeepSeek）：
 *  - DEFAULT_VISION_PROVIDER / DEFAULT_TEXT_PROVIDER 分别指定；
 *  - 未指定时回落到 DEFAULT_PROVIDER；
 *  - 视觉端只会选中"存在视觉模型"的服务商，DeepSeek 这类纯文本服务商不会被选为视觉端。
 */
export function resolvePlatformConfig(env: Env): ResolvedConfig | null {
  const orderFrom = (preferredRaw?: string): ProviderId[] => {
    const preferred = (preferredRaw ?? '').trim() as ProviderId
    return PROVIDER_ORDER.includes(preferred)
      ? [preferred, ...PROVIDER_ORDER.filter((id) => id !== preferred)]
      : PROVIDER_ORDER
  }

  const hasKey = (provider: ProviderId) => Boolean((env[ENV_KEYS[provider].apiKey] ?? '').trim())
  const hasVisionModel = (provider: ProviderId) =>
    (PROVIDER_OPTIONS.find((item) => item.id === provider)?.visionModels.length ?? 0) > 0

  const visionProvider =
    orderFrom(env.DEFAULT_VISION_PROVIDER || env.DEFAULT_PROVIDER).find(
      (provider) => hasKey(provider) && hasVisionModel(provider),
    ) ?? null
  const textProvider =
    orderFrom(env.DEFAULT_TEXT_PROVIDER || env.DEFAULT_PROVIDER).find((provider) => hasKey(provider)) ?? null

  if (!textProvider) return null

  const buildEndpoint = (provider: ProviderId, role: 'vision' | 'text'): ResolvedEndpoint => {
    const keys = ENV_KEYS[provider]
    const defaults = defaultModels(provider)
    const baseUrl = (env[keys.baseUrl] ?? '').trim()
    // 平台默认地址也走一次白名单校验，避免运维误配到内网
    const safeBase = assertAllowedBaseUrl(baseUrl, env) || getProvider(provider).defaultBaseUrl
    const model = role === 'vision'
      ? (env[keys.visionModel] ?? '').trim() || defaults.vision
      : (env[keys.textModel] ?? '').trim() || defaults.text
    return { provider, baseUrl: safeBase, apiKey: (env[keys.apiKey] ?? '').trim(), model }
  }

  return {
    accessMode: 'platform',
    vision: visionProvider ? buildEndpoint(visionProvider, 'vision') : null,
    text: buildEndpoint(textProvider, 'text'),
  }
}

/** 校验并解析单个 BYOK 端点 */
export function resolveEndpoint(
  endpoint: ModelEndpointConfig,
  env: Env,
  label: '视觉模型' | '文本模型',
): ResolvedEndpoint {
  const provider = endpoint.provider
  if (!PROVIDER_ORDER.includes(provider)) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：服务商无效。`)
  }
  const apiKey = cleanApiKey(endpoint.apiKey, `${label}的 API Key`)
  if (!apiKey) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：请填写 API Key。`, {
      hint: '密钥只在本次请求中使用，服务端处理完立即丢弃。',
    })
  }
  const model = endpoint.model?.trim() ?? ''
  if (!model) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：请填写模型名称。`)
  }

  const option = PROVIDER_OPTIONS.find((item) => item.id === provider)
  if (provider === 'compatible' && !(endpoint.baseUrl ?? '').trim()) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：OpenAI 兼容接口必须填写 Base URL。`, {
      hint: '例如 https://api.deepseek.com/v1',
    })
  }
  const safeBase = assertAllowedBaseUrl(endpoint.baseUrl ?? '', env) || option?.defaultBaseUrl || ''

  if (label === '视觉模型') {
    if (provider === 'deepseek') {
      throw new ApiError(
        'NO_VISION_MODEL',
        `DeepSeek 的 ${model} 是纯文本模型，不支持图片输入，不能作为视觉模型使用。`,
        {
          hint: 'DeepSeek 只提供文本模型。请把视觉模型换成 OpenAI / Gemini / Claude 等支持图片的模型，或改用「仅文字生成」。',
        },
      )
    }
    const verdict = checkVisionSupport(provider, model, visionAllowlist(env))
    if (!verdict.supported) {
      throw new ApiError('INVALID_MODEL_CONFIG', verdict.reason ?? '该模型不支持图片输入。')
    }
  }

  return { provider, baseUrl: safeBase, apiKey, model }
}

/**
 * 模式 B：用户自带 Key（BYOK）。视觉与文本可以是不同服务商。
 * - 正常路径：视觉 + 文本都必须配置；
 * - 「仅文字生成」（skipVision）：只需要文本模型，视觉可以留空。
 */
export function resolveByokConfig(
  input: ModelConfigInput,
  env: Env,
  options: { requireVision?: boolean } = {},
): ResolvedConfig {
  const requireVision = options.requireVision ?? true
  if (!input?.text) {
    throw new ApiError('INVALID_MODEL_CONFIG', '请配置文本模型。')
  }
  if (requireVision && !input.vision) {
    throw new ApiError('INVALID_MODEL_CONFIG', '请分别配置视觉模型和文本模型。')
  }
  return {
    accessMode: 'byok',
    vision: requireVision && input.vision ? resolveEndpoint(input.vision, env, '视觉模型') : null,
    text: resolveEndpoint(input.text, env, '文本模型'),
  }
}

/** 调用视觉模型：要求返回 JSON */
export async function runVision(
  endpoint: ResolvedEndpoint,
  args: { system: string; prompt: string; imageDataUrl: string; env: Env; temperature?: number },
): Promise<ProviderResult> {
  const adapter = getProvider(endpoint.provider)
  return adapter.call({
    baseUrl: endpoint.baseUrl,
    apiKey: endpoint.apiKey,
    model: endpoint.model,
    system: args.system,
    prompt: args.prompt,
    imageDataUrl: args.imageDataUrl,
    temperature: args.temperature ?? 0.2,
    jsonMode: true,
    timeoutMs: getTimeoutMs(args.env),
  })
}

/** 调用文本模型：要求返回 JSON */
export async function runText(
  endpoint: ResolvedEndpoint,
  args: { system: string; prompt: string; env: Env; temperature?: number; jsonMode?: boolean },
): Promise<ProviderResult> {
  const adapter = getProvider(endpoint.provider)
  return adapter.call({
    baseUrl: endpoint.baseUrl,
    apiKey: endpoint.apiKey,
    model: endpoint.model,
    system: args.system,
    prompt: args.prompt,
    temperature: args.temperature ?? 0.8,
    jsonMode: args.jsonMode ?? true,
    timeoutMs: getTimeoutMs(args.env),
  })
}

/** 语义化别名：统一接口里的「文本生成」 */
export const generateText = runText

/**
 * 统一接口里的「测试连接」：只发一句话（视觉端发 1x1 占位图）验证鉴权与地址是否可用。
 * 不解析业务字段，也不留存任何 Key。
 */
export async function testConnection(
  endpoint: ResolvedEndpoint,
  kind: 'vision' | 'text',
  env: Env,
): Promise<{ ok: boolean; latencyMs: number; message: string; sample?: string }> {
  const startedAt = Date.now()
  const adapter = getProvider(endpoint.provider)
  try {
    const result = await adapter.call({
      baseUrl: endpoint.baseUrl,
      apiKey: endpoint.apiKey,
      model: endpoint.model,
      system: '你是连接测试助手，收到请求后简短回复即可。',
      prompt:
        kind === 'vision'
          ? '这是一张 1x1 的测试图片。请用一句话说明你能看到它，并回复"视觉连接成功"。'
          : '这是一次 API 连接测试。请只回复"连接成功"四个字。',
      imageDataUrl: kind === 'vision' ? `data:image/png;base64,${PIXEL_PNG_BASE64}` : undefined,
      temperature: 0,
      jsonMode: false,
      timeoutMs: Math.min(getTimeoutMs(env), 30_000),
    })
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: kind === 'vision' ? '视觉模型连接成功。' : '文本模型连接成功。',
      sample: result.text.slice(0, 200),
    }
  } catch (err) {
    const isApiError = err instanceof ApiError
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: isApiError ? err.message : `调用失败：${err instanceof Error ? err.message : String(err)}`,
      sample: isApiError && err.hint ? err.hint : undefined,
    }
  }
}
