import type {
  ImageEndpointConfig,
  ImageFormatId,
  ImageProviderId,
  ImageQualityId,
} from '../../../../../shared/types'
import { ApiError, mapUpstreamError } from '../../errors'
import { assertAllowedBaseUrl } from '../../ssrf'
import type { Env } from '../../types'
import { getImageProvider } from './catalog'
import type { ImageCallResult } from './types'

/**
 * 图片模型路由
 * ----------------------------------------------------------------------------
 * 与文本模型路由分开：
 *   - 文本 / 视觉模型由 ai/router.ts 解析（DEFAULT_PROVIDER 等）
 *   - 图片模型由 IMAGE_PROVIDER 解析（IMAGE_* 环境变量）
 * 两者允许来自不同服务商，互不影响。
 */

interface ImageEnvKeys {
  apiKey: string
  baseUrl: string
  model: string
}

const IMAGE_ENV_KEYS: Record<ImageProviderId, ImageEnvKeys> = {
  'openai-image': {
    apiKey: 'OPENAI_IMAGE_API_KEY',
    baseUrl: 'OPENAI_IMAGE_BASE_URL',
    model: 'OPENAI_IMAGE_MODEL',
  },
  'gemini-image': {
    apiKey: 'GEMINI_IMAGE_API_KEY',
    baseUrl: 'GEMINI_IMAGE_BASE_URL',
    model: 'GEMINI_IMAGE_MODEL',
  },
  'deepseek-image': {
    apiKey: 'DEEPSEEK_IMAGE_API_KEY',
    baseUrl: 'DEEPSEEK_IMAGE_BASE_URL',
    model: 'DEEPSEEK_IMAGE_MODEL',
  },
  'custom-image': {
    apiKey: 'CUSTOM_IMAGE_API_KEY',
    baseUrl: 'CUSTOM_IMAGE_BASE_URL',
    model: 'CUSTOM_IMAGE_MODEL',
  },
}

const IMAGE_PROVIDER_ORDER: ImageProviderId[] = ['openai-image', 'gemini-image', 'deepseek-image', 'custom-image']

const DEFAULT_IMAGE_MODELS: Record<ImageProviderId, string> = {
  'openai-image': 'gpt-image-1',
  'gemini-image': 'gemini-2.5-flash-image',
  // DeepSeek 官方目前没有图片模型，默认模型留空：必须显式填写可用的模型名
  'deepseek-image': '',
  'custom-image': '',
}

export function getImageTimeoutMs(env: Env): number {
  const raw = Number.parseInt(env.IMAGE_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw)) return 120_000
  return Math.min(180_000, Math.max(15_000, raw))
}

function readQuality(env: Env): ImageQualityId {
  const raw = (env.IMAGE_QUALITY ?? '').toLowerCase()
  return raw === 'high' ? 'high' : 'standard'
}

function readFormat(env: Env): ImageFormatId {
  const raw = (env.IMAGE_FORMAT ?? '').toLowerCase()
  return raw === 'jpeg' || raw === 'webp' ? (raw as ImageFormatId) : 'png'
}

export interface ResolvedImageConfig {
  provider: ImageProviderId
  baseUrl: string
  apiKey: string
  model: string
  quality: ImageQualityId
  format: ImageFormatId
}

function pickProviderFromEnv(env: Env): ImageProviderId | null {
  const forced = (env.IMAGE_PROVIDER ?? '').trim() as ImageProviderId
  if (forced && IMAGE_PROVIDER_ORDER.includes(forced)) {
    const keys = IMAGE_ENV_KEYS[forced]
    if ((env[keys.apiKey] ?? '').trim()) return forced
  }
  for (const id of IMAGE_PROVIDER_ORDER) {
    const keys = IMAGE_ENV_KEYS[id]
    if ((env[keys.apiKey] ?? '').trim()) return id
  }
  return null
}

/** 平台默认图片模型（模式 A）。没配置时返回 null，由前端走演示模式。 */
export function resolveImagePlatformConfig(env: Env): ResolvedImageConfig | null {
  const providerId = pickProviderFromEnv(env)
  if (!providerId) return null
  const keys = IMAGE_ENV_KEYS[providerId]
  const adapter = getImageProvider(providerId)
  const apiKey = (env[keys.apiKey] ?? '').trim()
  const model = (env[keys.model] ?? '').trim() || DEFAULT_IMAGE_MODELS[providerId]
  if (!apiKey || !model) return null

  let baseUrl = adapter.defaultBaseUrl
  try {
    const checked = assertAllowedBaseUrl((env[keys.baseUrl] ?? '').trim(), env)
    if (checked) baseUrl = checked
  } catch {
    // 环境变量里的地址非法时，退回服务商默认地址，避免整站不可用
    baseUrl = adapter.defaultBaseUrl
  }

  return {
    provider: providerId,
    baseUrl,
    apiKey,
    model,
    quality: readQuality(env),
    format: readFormat(env),
  }
}

/** 自定义图片地址（模式 B）。密钥只在这一个请求里使用，处理完即丢弃。 */
export function resolveImageByokConfig(input: ImageEndpointConfig, env: Env): ResolvedImageConfig {
  const provider = input.provider
  if (!IMAGE_PROVIDER_ORDER.includes(provider)) {
    throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：服务商无效。')
  }
  const adapter = getImageProvider(provider)
  const model = input.model.trim()
  const apiKey = input.apiKey.trim()
  if (!model) throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：请填写模型名称。')
  if (!apiKey) {
    throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：请填写 API Key。', {
      hint: '密钥只在本次请求中使用，服务端处理完立即丢弃。',
    })
  }
  if (adapter.defaultBaseUrl === '' && !input.baseUrl.trim()) {
    throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：自定义接口必须填写 API Base URL。')
  }

  const baseUrl = assertAllowedBaseUrl(input.baseUrl.trim(), env) || adapter.defaultBaseUrl
  return {
    provider,
    baseUrl,
    apiKey,
    model,
    quality: input.quality === 'high' ? 'high' : 'standard',
    format: input.format === 'jpeg' || input.format === 'webp' ? (input.format as ImageFormatId) : 'png',
  }
}

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  imageDataUrl?: string
  width: number
  height: number
  count?: number
}

/** 统一调用入口：适配器差异全部封在 Provider 内部 */
export async function generateImages(
  config: ResolvedImageConfig,
  options: GenerateImageOptions,
  env: Env,
): Promise<ImageCallResult> {
  const adapter = getImageProvider(config.provider)
  if (options.imageDataUrl && !adapter.supportsImageEditing) {
    throw new ApiError(
      'IMAGE_UNSUPPORTED',
      `${adapter.label} 不支持传入商品原图，无法做「图生图」保留原商品外观。`,
      { hint: '请换成支持图片编辑的模型（如 gpt-image-1 / gemini-2.5-flash-image），或选择不传原图。' },
    )
  }
  return adapter.generate({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    prompt: options.prompt,
    negativePrompt: options.negativePrompt,
    imageDataUrl: options.imageDataUrl,
    width: options.width,
    height: options.height,
    quality: config.quality,
    format: config.format,
    timeoutMs: getImageTimeoutMs(env),
    count: options.count,
  })
}

/** 图片模型连接测试：真实发一次最小请求 */
export async function testImageConnection(
  config: ResolvedImageConfig,
  env: Env,
): Promise<{ ok: boolean; latencyMs: number; message: string; sample?: string }> {
  const started = Date.now()
  try {
    const result = await generateImages(
      config,
      {
        prompt: 'A single soft blue circle centered on a white background, minimal product mockup test image.',
        width: 512,
        height: 512,
        count: 1,
      },
      env,
    )
    const first = result.images[0]
    return {
      ok: true,
      latencyMs: result.latencyMs,
      message: `图片连接成功：返回 ${result.images.length} 张图片。`,
      sample: first?.base64
        ? `[base64 image ${first.mimeType}, ${Math.round((first.base64.length * 3) / 4 / 1024)} KB]`
        : first?.url,
    }
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: err.message,
        sample: err.hint,
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, latencyMs: Date.now() - started, message: mapUpstreamError(0, message).message }
  }
}
