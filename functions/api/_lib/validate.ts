import {
  ACCEPTED_MIME_TYPES,
  EMPTY_PRODUCT_INFO,
  IMAGE_TYPE_META,
  MAX_UPLOAD_BYTES,
  PLATFORM_META,
  STYLE_META,
  type AspectRatioId,
  type CopyStyleId,
  type GeneratePayload,
  type ImageEndpointConfig,
  type ImageFormatId,
  type ImageGeneratePayload,
  type ImageProviderId,
  type LanguageMode,
  type ModelConfigInput,
  type ModelEndpointConfig,
  type PlatformId,
  type ProductImageTypeId,
  type ProductInfo,
  type ProviderId,
  type SectionKey,
  type SeoKeywordPayload,
  type VisionAnalysis,
} from '../../../shared/types'
import { ApiError } from './errors'
import type { UploadedImage } from './types'

const PROVIDER_IDS: ProviderId[] = ['openai', 'deepseek', 'gemini', 'claude', 'compatible']
const SECTION_KEYS: SectionKey[] = ['title', 'sellingPoints', 'description', 'marketing', 'keywords']

/** 通过文件头判断真实类型，避免仅信任 content-type / 扩展名 */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp'
  return null
}

/**
 * 校验上传图片：大小 + 类型 + 真实文件头。
 * 这里不做图片压缩（视觉模型直接接收原图），因此限制 5MB。
 */
export async function validateImage(file: File): Promise<UploadedImage> {
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError('INVALID_FILE', '没有读取到图片文件，请重新选择。')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      'FILE_TOO_LARGE',
      `图片大小为 ${(file.size / 1024 / 1024).toFixed(2)}MB，超过 5MB 限制。`,
      { hint: '请压缩图片后重试，或换一张尺寸更小的图片。' },
    )
  }
  const buffer = new Uint8Array(await file.arrayBuffer())
  const sniffed = sniffMime(buffer)
  const declared = file.type.toLowerCase()
  if (!sniffed) {
    throw new ApiError('INVALID_FILE', '无法识别该文件，仅支持 JPG / JPEG / PNG / WEBP 图片。')
  }
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(sniffed)) {
    throw new ApiError('INVALID_FILE', `不支持的图片格式：${sniffed}。`)
  }
  // content-type 与文件头不一致时以文件头为准，但如果是"明显伪装"则拒绝
  if (declared && declared !== sniffed && !(declared === 'image/jpg' && sniffed === 'image/jpeg')) {
    throw new ApiError('INVALID_FILE', '文件内容与格式不符，请重新导出为 JPG / PNG / WEBP 后重试。')
  }
  return {
    bytes: buffer,
    mimeType: sniffed,
    fileName: file.name || 'upload',
    size: file.size,
  }
}

function str(value: unknown, max = 200): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function normalizeProductInfo(raw: unknown): ProductInfo {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...EMPTY_PRODUCT_INFO }
  for (const key of Object.keys(EMPTY_PRODUCT_INFO) as (keyof ProductInfo)[]) {
    out[key] = str(obj[key], key === 'extra' ? 600 : 200)
  }
  return out
}

export function normalizeEndpoint(raw: unknown, label: string): ModelEndpointConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const provider = str(obj.provider, 32) as ProviderId
  const model = str(obj.model, 120)
  const apiKey = cleanApiKey(obj.apiKey, `${label} 的 API Key`)
  const baseUrl = str(obj.baseUrl, 300)

  if (!PROVIDER_IDS.includes(provider)) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：服务商无效。`)
  }
  if (!model) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：请填写模型名称。`)
  }
  if (!apiKey) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label}：请填写 API Key。`, {
      hint: '密钥只在本次请求中使用，服务端处理完立即丢弃。',
    })
  }
  return { provider, baseUrl, apiKey, model }
}

/**
 * 校验 /api/generate 的 payload。
 * 所有枚举值都走白名单，防止把用户输入拼进 prompt 之外的地方。
 */
export function validateGeneratePayload(raw: unknown): GeneratePayload {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('BAD_REQUEST', '缺少请求参数 payload。')
  }
  const obj = raw as Record<string, unknown>
  const mode = str(obj.mode, 16) === 'byok' ? 'byok' : 'platform'

  const platform = str(obj.platform, 32) as PlatformId
  if (!(platform in PLATFORM_META)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的电商平台。')
  }
  const style = (str(obj.style, 32) || 'professional') as CopyStyleId
  if (!(style in STYLE_META)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的文案风格。')
  }
  const language = (str(obj.language, 16) || 'bilingual') as LanguageMode
  if (!['zh', 'en', 'bilingual'].includes(language)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的语言模式。')
  }

  const regenerateSection = str(obj.regenerateSection, 32) as SectionKey | ''
  if (regenerateSection && !SECTION_KEYS.includes(regenerateSection)) {
    throw new ApiError('BAD_REQUEST', '需要重新生成的模块无效。')
  }

  // 「仅文字生成」：不调用视觉模型，因此 BYOK 下只需要文本模型配置
  const skipVision = obj.skipVision === true

  let modelConfig: ModelEndpointConfig | undefined
  let textConfig: ModelEndpointConfig | undefined
  if (mode === 'byok') {
    const raw = obj.modelConfig as Record<string, unknown> | undefined
    if (!skipVision) {
      modelConfig = normalizeEndpoint(raw?.vision, '视觉模型')
    }
    textConfig = normalizeEndpoint(raw?.text, '文本模型')
  }

  return {
    mode,
    platform,
    style,
    language,
    product: normalizeProductInfo(obj.product),
    ...(mode === 'byok' && textConfig
      ? {
          modelConfig: {
            ...(modelConfig ? { vision: modelConfig } : {}),
            text: textConfig,
          },
        }
      : {}),
    regenerateSection: (regenerateSection || undefined) as SectionKey | undefined,
    reuseAnalysis: obj.reuseAnalysis && typeof obj.reuseAnalysis === 'object' ? (obj.reuseAnalysis as GeneratePayload['reuseAnalysis']) : null,
    skipVision,
  }
}

/** 上传图片转 data URL，供各家视觉模型使用 */
export function toDataUrl(image: UploadedImage): string {
  return `data:${image.mimeType};base64,${bytesToBase64(image.bytes)}`
}

/* ======================================================================== */
/*                  图片生成 / SEO 关键词 请求体校验                        */
/* ======================================================================== */

const IMAGE_PROVIDER_IDS: ImageProviderId[] = ['openai-image', 'gemini-image', 'deepseek-image', 'custom-image']
const IMAGE_TYPE_IDS: ProductImageTypeId[] = [
  'white-bg',
  'scene',
  'selling-point',
  'detail',
  'usage',
  'detail-page',
  'social',
]
const ASPECT_RATIO_IDS: AspectRatioId[] = ['1:1', '4:5', '3:4', '16:9', '9:16', 'custom']

/** 校验图片模型端点（BYOK）。Key 只在这个请求里使用。 */
export function normalizeImageEndpoint(raw: unknown): ImageEndpointConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const provider = str(obj.provider, 32) as ImageProviderId
  const model = str(obj.model, 160)
  const apiKey = str(obj.apiKey, 400)
  const baseUrl = str(obj.baseUrl, 300)
  const quality = str(obj.quality, 16) === 'high' ? 'high' : 'standard'
  const formatRaw = str(obj.format, 16)
  const format: ImageFormatId = formatRaw === 'jpeg' || formatRaw === 'webp' ? (formatRaw as ImageFormatId) : 'png'

  if (!IMAGE_PROVIDER_IDS.includes(provider)) {
    throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：服务商无效。')
  }
  if (!model) throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：请填写模型名称。')
  if (!apiKey) {
    throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：请填写 API Key。', {
      hint: '密钥只在本次请求中使用，服务端处理完立即丢弃。',
    })
  }
  return { provider, baseUrl, apiKey, model, quality, format }
}

function clampSize(value: unknown, fallback: number, label: string): number {
  const num = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(num)) return fallback
  if (num < 128 || num > 4096) {
    throw new ApiError('BAD_REQUEST', `${label}需在 128–4096 像素之间（当前 ${num}）。`)
  }
  return Math.round(num)
}

/** /api/generate-image 的 payload 校验 */
export function validateImagePayload(raw: unknown): ImageGeneratePayload {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('BAD_REQUEST', '缺少请求参数 payload。')
  }
  const obj = raw as Record<string, unknown>
  const mode = str(obj.mode, 16) === 'byok' ? 'byok' : 'platform'

  const platform = str(obj.platform, 32) as PlatformId
  if (!(platform in PLATFORM_META)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的电商平台。')
  }
  const imageType = str(obj.imageType, 32) as ProductImageTypeId
  if (!IMAGE_TYPE_IDS.includes(imageType)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的图片类型。')
  }
  const fidelity = str(obj.fidelity, 16) === 'creative' ? 'creative' : 'fidelity'
  const ratioRaw = str(obj.ratio, 16)
  const ratio: AspectRatioId = ASPECT_RATIO_IDS.includes(ratioRaw as AspectRatioId)
    ? (ratioRaw as AspectRatioId)
    : IMAGE_TYPE_META[imageType].defaultRatio

  const width = clampSize(obj.width, 1200, '图片宽度')
  const height = clampSize(obj.height, 1200, '图片高度')

  const countRaw = typeof obj.count === 'number' ? obj.count : Number.parseInt(String(obj.count ?? '1'), 10)
  const count = Number.isFinite(countRaw) ? Math.min(4, Math.max(1, Math.round(countRaw))) : 1

  const modelConfig =
    mode === 'byok' ? normalizeImageEndpoint(obj.modelConfig) : (undefined as ImageEndpointConfig | undefined)

  return {
    mode,
    platform,
    imageType,
    fidelity,
    ratio,
    width,
    height,
    prompt: str(obj.prompt, 1200),
    product: normalizeProductInfo(obj.product),
    analysis: obj.analysis && typeof obj.analysis === 'object' ? (obj.analysis as VisionAnalysis) : null,
    count,
    ...(modelConfig ? { modelConfig } : {}),
  }
}

/** /api/seo-keywords 的 payload 校验 */
export function validateSeoPayload(raw: unknown): SeoKeywordPayload {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('BAD_REQUEST', '缺少请求参数。')
  }
  const obj = raw as Record<string, unknown>
  const mode = str(obj.mode, 16) === 'byok' ? 'byok' : 'platform'
  const platform = str(obj.platform, 32) as PlatformId
  if (!(platform in PLATFORM_META)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的电商平台。')
  }
  const style = (str(obj.style, 32) || 'professional') as CopyStyleId
  if (!(style in STYLE_META)) throw new ApiError('BAD_REQUEST', '请选择有效的文案风格。')
  const language = (str(obj.language, 16) || 'bilingual') as LanguageMode
  if (!['zh', 'en', 'bilingual'].includes(language)) {
    throw new ApiError('BAD_REQUEST', '请选择有效的语言模式。')
  }

  let modelConfig: ModelConfigInput | undefined
  if (mode === 'byok') {
    const rawConfig = obj.modelConfig as Record<string, unknown> | undefined
    modelConfig = { text: normalizeEndpoint(rawConfig?.text, '文本模型') }
  }

  return {
    mode,
    platform,
    style,
    language,
    product: normalizeProductInfo(obj.product),
    analysis: obj.analysis && typeof obj.analysis === 'object' ? (obj.analysis as VisionAnalysis) : null,
    competitorInfo: str(obj.competitorInfo, 400),
    ...(modelConfig ? { modelConfig } : {}),
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode.apply(null, Array.from(slice))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 1x1 透明 PNG，用于"测试视觉模型连接"时最小化 token 消耗 */
export const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * API Key 清洗：
 *  - 去掉首尾空白/换行（从控制台复制时最容易带上）；
 *  - 拒绝夹带空白、全角字符、零宽字符（这类 Key 一定 401，提前说清楚，别浪费一次请求）。
 */
export function cleanApiKey(raw: unknown, label = 'API Key'): string {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/\s/.test(trimmed)) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label} 中间夹带了空格或换行，请重新复制一次。`, {
      hint: '多数服务商的 Key 是连续字符串，中间不应出现空白字符。',
    })
  }
  if (/[^\x21-\x7e]/.test(trimmed)) {
    throw new ApiError('INVALID_MODEL_CONFIG', `${label} 含非 ASCII 字符（可能是全角或零宽字符），请重新复制一次。`, {
      hint: '在中文输入法或某些终端里复制 Key 容易混入全角字符，建议先粘到记事本确认。',
    })
  }
  return trimmed
}
