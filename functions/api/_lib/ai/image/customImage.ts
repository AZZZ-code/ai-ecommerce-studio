import type { ImageFormatId } from '../../../../../shared/types'
import { ApiError, mapUpstreamError, sanitize } from '../../errors'
import { fetchWithTimeout, parseUpstreamJson } from '../json'
import { joinEndpoint } from '../types'
import { pickSizePreset, type ImageCallInput, type ImageCallResult, type ImageProviderAdapter } from './types'

/**
 * 自定义图片生成接口（仅在接口兼容时使用）
 * ----------------------------------------------------------------------------
 * 约定：兼容 OpenAI Images API 的自建网关 / 第三方服务
 *   纯文生图  POST {base}/images/generations   JSON
 *   带原图    POST {base}/images/edits         multipart
 * 响应兼容三种写法：
 *   { data: [{ b64_json }] } / { data: [{ url }] } / { data: [{ b64 }] }
 *
 * 由于是"自定义"服务，字段差异无法穷举：解析失败时给出明确的错误原因，
 * 而不是伪造一张图返回。
 */
function qualityToOpenAI(quality: ImageCallInput['quality']): string {
  return quality === 'high' ? 'high' : 'standard'
}

function formatForOpenAI(format: ImageFormatId): string {
  return format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png'
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export const customImageProvider: ImageProviderAdapter = {
  id: 'custom-image',
  label: '自定义图片接口',
  defaultBaseUrl: '',
  supportsImageEditing: true,

  async generate(input: ImageCallInput): Promise<ImageCallResult> {
    if (!input.baseUrl) {
      throw new ApiError('INVALID_MODEL_CONFIG', '自定义图片接口需要填写 API Base URL。')
    }
    const started = Date.now()
    const count = Math.min(4, Math.max(1, input.count ?? 1))
    const headers: Record<string, string> = { authorization: `Bearer ${input.apiKey}` }

    let url: string
    let init: RequestInit
    if (input.imageDataUrl) {
      const match = /^data:([^;,]+);base64,(.+)$/s.exec(input.imageDataUrl)
      if (!match) throw new ApiError('BAD_REQUEST', '商品原图格式不正确，无法发送给图片模型。')
      const form = new FormData()
      form.append('model', input.model)
      form.append('prompt', input.prompt)
      form.append('n', String(count))
      form.append('size', pickSizePreset(input.width, input.height))
      form.append('quality', qualityToOpenAI(input.quality))
      form.append('response_format', 'b64_json')
      form.append('image', base64ToBlob(match[2]!, match[1]!), 'product.png')
      url = joinEndpoint(input.baseUrl, 'images/edits')
      init = { method: 'POST', headers, body: form }
    } else {
      url = joinEndpoint(input.baseUrl, 'images/generations')
      init = {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: input.model,
          prompt: input.prompt,
          n: count,
          size: pickSizePreset(input.width, input.height),
          quality: qualityToOpenAI(input.quality),
          output_format: formatForOpenAI(input.format),
          response_format: 'b64_json',
        }),
      }
    }

    const { response, text } = await fetchWithTimeout(url, init, input.timeoutMs, '图片模型')
    if (!response.ok) {
      throw mapUpstreamError(response.status, sanitize(text, input.apiKey))
    }
    const body = await parseUpstreamJson(text, response.status, '图片模型')
    const data = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : []
    const images = data
      .map((item) => {
        const b64 =
          typeof item.b64_json === 'string'
            ? item.b64_json
            : typeof item.b64 === 'string'
              ? item.b64
              : undefined
        const remote = typeof item.url === 'string' ? item.url : undefined
        return { base64: b64, url: remote, mimeType: `image/${formatForOpenAI(input.format)}` }
      })
      .filter((item) => item.base64 || item.url)

    if (images.length === 0) {
      throw new ApiError('BAD_MODEL_OUTPUT', '自定义图片接口没有返回可识别的图片数据。', {
        hint: '该接口的响应格式可能与 OpenAI Images API 不一致，请把响应示例贴到接口文档里再适配。',
      })
    }
    return { images, latencyMs: Date.now() - started, model: input.model, raw: text.slice(0, 600) }
  },
}
