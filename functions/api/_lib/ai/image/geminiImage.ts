import { ApiError, mapUpstreamError, sanitize } from '../../errors'
import { fetchWithTimeout, parseUpstreamJson } from '../json'
import type { ImageCallInput, ImageCallResult, ImageProviderAdapter } from './types'

/**
 * Google Gemini 图片生成（gemini-2.5-flash-image / *-image-preview）
 * ----------------------------------------------------------------------------
 * 官方规范：
 *   POST /v1beta/models/{model}:generateContent?key=API_KEY
 *   body.contents[0].parts = [{ text }, { inline_data: { mime_type, data } }]
 *   generationConfig.responseModalities = ['TEXT', 'IMAGE']
 * 图片从 candidates[0].content.parts[].inlineData 里取（base64）。
 *
 * 注意：Gemini 的图片接口不接受 width/height 参数，宽高只能通过提示词约束，
 * 因此这里会把「目标画幅」写进提示词，并在返回后如实记录实际尺寸未知。
 */
export const GEMINI_IMAGE_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function buildEndpoint(baseUrl: string, model: string, apiKey: string): string {
  const base = (baseUrl || GEMINI_IMAGE_DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  const host = /\/v\d+[a-z0-9]*$/i.test(base) ? base : `${base}/v1beta`
  const modelPath = model.startsWith('models/') ? model : `models/${model}`
  return `${host}/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`
}

export const geminiImageProvider: ImageProviderAdapter = {
  id: 'gemini-image',
  label: 'Google Gemini Image',
  defaultBaseUrl: GEMINI_IMAGE_DEFAULT_BASE_URL,
  supportsImageEditing: true,

  async generate(input: ImageCallInput): Promise<ImageCallResult> {
    const started = Date.now()
    const url = buildEndpoint(input.baseUrl, input.model, input.apiKey)
    const parts: Record<string, unknown>[] = [{ text: input.prompt }]

    if (input.imageDataUrl) {
      const match = /^data:([^;,]+);base64,(.+)$/s.exec(input.imageDataUrl)
      if (!match) throw new ApiError('BAD_REQUEST', '商品原图格式不正确，无法发送给图片模型。')
      parts.push({ inline_data: { mime_type: match[1]!, data: match[2]! } })
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        // 图片模型不接受 temperature 之外的采样控制，这里保持默认以免被拒
      },
    }

    const { response, text } = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      input.timeoutMs,
      '图片模型',
    )

    if (!response.ok) {
      throw mapUpstreamError(response.status, sanitize(text, input.apiKey))
    }
    const parsed = await parseUpstreamJson(text, response.status, '图片模型')
    const candidates = Array.isArray(parsed.candidates) ? (parsed.candidates as Record<string, unknown>[]) : []
    const first = candidates[0]
    const content = first && typeof first.content === 'object' ? (first.content as Record<string, unknown>) : null
    const partsOut = content && Array.isArray(content.parts) ? (content.parts as Record<string, unknown>[]) : []

    const images: ImageCallResult['images'] = []
    for (const part of partsOut) {
      const inline = part.inlineData ?? part.inline_data
      if (!inline || typeof inline !== 'object') continue
      const data = (inline as Record<string, unknown>).data
      const mimeType = (inline as Record<string, unknown>).mimeType ?? (inline as Record<string, unknown>).mime_type
      if (typeof data === 'string' && data.length > 0) {
        images.push({ base64: data, mimeType: typeof mimeType === 'string' ? mimeType : 'image/png' })
      }
    }

    if (images.length === 0) {
      const blocked = typeof first?.finishReason === 'string' ? first.finishReason : ''
      throw new ApiError(
        'BAD_MODEL_OUTPUT',
        `图片模型没有返回图片${blocked ? `（finishReason: ${blocked}）` : ''}。`,
        {
          hint: '确认所选模型是图片生成模型（名称通常包含 image），以及账号已开通该模型。',
          retryable: true,
        },
      )
    }

    return { images, latencyMs: Date.now() - started, model: input.model, raw: text.slice(0, 600) }
  },
}
