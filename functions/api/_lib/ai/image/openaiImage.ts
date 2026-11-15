import type { ImageFormatId } from '../../../../../shared/types'
import { ApiError, mapUpstreamError, sanitize } from '../../errors'
import { fetchWithTimeout, parseUpstreamJson } from '../json'
import { joinEndpoint } from '../types'
import { pickSizePreset, type ImageCallInput, type ImageCallResult, type ImageProviderAdapter } from './types'

/**
 * OpenAI 图片模型（GPT Image / DALL·E）
 * ----------------------------------------------------------------------------
 * 官方规范：
 *   纯文生图  POST {base}/images/generations   JSON
 *   带原图    POST {base}/images/edits         multipart/form-data
 * 返回体统一为 { data: [{ b64_json }] }（gpt-image-1 默认返回 b64_json）。
 *
 * 注意：dall-e-3 不支持 edits，也不支持全部尺寸；这里会在提示词里保留宽高描述，
 * 真实尺寸由 size 参数决定（服务商只接受固定尺寸时无法做到任意宽高）。
 */
function qualityToOpenAI(quality: ImageCallInput['quality']): string {
  return quality === 'high' ? 'high' : 'medium'
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

export const openAIImageProvider: ImageProviderAdapter = {
  id: 'openai-image',
  label: 'OpenAI GPT Image',
  defaultBaseUrl: 'https://api.openai.com/v1',
  supportsImageEditing: true,

  async generate(input: ImageCallInput): Promise<ImageCallResult> {
    const started = Date.now()
    const base = input.baseUrl || this.defaultBaseUrl
    const size = pickSizePreset(input.width, input.height)
    const count = Math.min(4, Math.max(1, input.count ?? 1))
    const headers: Record<string, string> = { authorization: `Bearer ${input.apiKey}` }

    let url: string
    let init: RequestInit

    if (input.imageDataUrl) {
      // 图生图：multipart/form-data，字段名必须是 image
      url = joinEndpoint(base, 'images/edits')
      const match = /^data:([^;,]+);base64,(.+)$/s.exec(input.imageDataUrl)
      if (!match) throw new ApiError('BAD_REQUEST', '商品原图格式不正确，无法发送给图片模型。')
      const form = new FormData()
      form.append('model', input.model)
      form.append('prompt', input.prompt)
      form.append('n', String(count))
      form.append('size', size)
      form.append('quality', qualityToOpenAI(input.quality))
      form.append('output_format', formatForOpenAI(input.format))
      form.append('image', base64ToBlob(match[2]!, match[1]!), 'product.png')
      init = { method: 'POST', headers, body: form }
    } else {
      url = joinEndpoint(base, 'images/generations')
      init = {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: input.model,
          prompt: input.prompt,
          n: count,
          size,
          quality: qualityToOpenAI(input.quality),
          output_format: formatForOpenAI(input.format),
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
        const b64 = typeof item.b64_json === 'string' ? item.b64_json : undefined
        const remote = typeof item.url === 'string' ? item.url : undefined
        return { base64: b64, url: remote, mimeType: `image/${formatForOpenAI(input.format)}` }
      })
      .filter((item) => item.base64 || item.url)

    if (images.length === 0) {
      throw new ApiError('BAD_MODEL_OUTPUT', '图片模型没有返回任何图片数据。', {
        hint: '可能是模型名不支持图片生成，或账号缺少该模型的权限。',
        retryable: true,
      })
    }
    return { images, latencyMs: Date.now() - started, model: input.model, raw: text.slice(0, 600) }
  },
}
