import type { ImageFormatId } from '../../../../../shared/types'
import { ApiError, mapUpstreamError, sanitize } from '../../errors'
import { fetchWithTimeout, parseUpstreamJson } from '../json'
import { pickSizePreset, type ImageCallInput, type ImageCallResult, type ImageProviderAdapter } from './types'

/**
 * DeepSeek 图片模型接入
 * ----------------------------------------------------------------------------
 * 事实说明（写进代码和文档，避免误导使用者）：
 *   DeepSeek 官方 API（https://api.deepseek.com）目前只提供文本模型
 *   （deepseek-chat / deepseek-reasoner），**没有公开的图片生成模型**。
 *
 * 那这里为什么还要接？
 *   1. 业务方要求「生图模型同样接入 DeepSeek」，因此按 DeepSeek 的
 *      OpenAI 兼容协议预留了图片生成通道：POST {base}/images/generations
 *      + Authorization: Bearer <key>，返回体按 OpenAI Images 规范解析
 *      （data[].b64_json / data[].url）。
 *   2. 一旦 DeepSeek 开放图片模型，或使用者通过自建/第三方兼容网关
 *      （Base URL 指向网关，Key 仍是 DeepSeek 的 Key）代理出图接口，
 *      前端配置里直接选 DeepSeek + 填模型名即可使用，无需改代码。
 *   3. 未开放之前，调用会如实失败：模型不存在 → MODEL_NOT_FOUND，
 *      鉴权失败 → UPSTREAM_UNAUTHORIZED，绝不会返回伪造的图片。
 *
 * 不支持的能力：
 *   - 图片编辑（图生图）：官方没有任何 edits 接口，这里 supportsImageEditing=false，
 *     保真模式传原图时会由 ModelRouter 直接抛 IMAGE_UNSUPPORTED，不会静默丢图。
 */

export const DEEPSEEK_IMAGE_DEFAULT_BASE_URL = 'https://api.deepseek.com'

/** DeepSeek 官方当前没有任何图片模型；保留数组是为了将来开放时集中维护。 */
export const DEEPSEEK_IMAGE_MODELS: string[] = []

/**
 * DeepSeek 的官方 Base URL 是 https://api.deepseek.com（不带 /v1），
 * 其 OpenAI 兼容路径直接挂在根上：/chat/completions、/images/generations。
 * 因此这里不能套用 joinEndpoint（它会自动补 /v1）；带 /v1 的写法也兼容，直接沿用。
 */
export function buildDeepSeekImageUrl(baseUrl: string): string {
  const base = (baseUrl || DEEPSEEK_IMAGE_DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  if (/\/v\d+$/i.test(base) || /\/api\/v\d+$/i.test(base)) return `${base}/images/generations`
  return `${base}/images/generations`
}

function formatForDeepSeek(format: ImageFormatId): string {
  return format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png'
}

export const deepseekImageProvider: ImageProviderAdapter = {
  id: 'deepseek-image',
  label: 'DeepSeek 图片',
  defaultBaseUrl: DEEPSEEK_IMAGE_DEFAULT_BASE_URL,
  supportsImageEditing: false,

  async generate(input: ImageCallInput): Promise<ImageCallResult> {
    const started = Date.now()

    // 双保险：即使上层漏判，也绝不把原图发给 DeepSeek（它没有 edits 接口）
    if (input.imageDataUrl) {
      throw new ApiError(
        'IMAGE_UNSUPPORTED',
        'DeepSeek 目前没有图片编辑接口，因此没有把商品原图发送给它。',
        { hint: '请改用「创意营销模式」或换成支持图生图的模型（gpt-image-1 / gemini-2.5-flash-image）。' },
      )
    }

    const model = input.model.trim()
    if (!model) {
      throw new ApiError('INVALID_MODEL_CONFIG', '图片模型：请填写 DeepSeek 可用的图片模型名称。', {
        hint: 'DeepSeek 官方尚未提供图片生成模型；如需现在出图，请填兼容网关里的图片模型名，或改用 OpenAI / Gemini 图片模型。',
      })
    }

    const url = buildDeepSeekImageUrl(input.baseUrl)
    const count = Math.min(4, Math.max(1, input.count ?? 1))

    const init: RequestInit = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        n: count,
        size: pickSizePreset(input.width, input.height),
        response_format: 'b64_json',
        output_format: formatForDeepSeek(input.format),
      }),
    }

    const { response, text } = await fetchWithTimeout(url, init, input.timeoutMs, 'DeepSeek 图片模型')
    if (!response.ok) {
      throw mapUpstreamError(response.status, sanitize(text, input.apiKey))
    }

    const body = await parseUpstreamJson(text, response.status, 'DeepSeek 图片模型')
    const data = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : []
    const images = data
      .map((item) => {
        const b64 = typeof item.b64_json === 'string' ? item.b64_json : undefined
        const remote = typeof item.url === 'string' ? item.url : undefined
        return { base64: b64, url: remote, mimeType: `image/${formatForDeepSeek(input.format)}` }
      })
      .filter((item) => item.base64 || item.url)

    if (images.length === 0) {
      throw new ApiError('BAD_MODEL_OUTPUT', 'DeepSeek 没有返回任何图片数据。', {
        hint: 'DeepSeek 官方目前不提供图片生成模型。如果这是兼容网关，请确认模型名正确且该模型支持出图。',
        retryable: true,
      })
    }

    return { images, latencyMs: Date.now() - started, model, raw: text.slice(0, 600) }
  },
}
