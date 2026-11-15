import { ApiError, mapUpstreamError, sanitize } from '../errors'
import { fetchWithTimeout, parseUpstreamJson } from './json'
import {
  joinEndpoint,
  parseDataUrl,
  type ProviderAdapter,
  type ProviderCall,
  type ProviderResult,
} from './types'

export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Google Gemini 适配器（generateContent REST）
 * 与其他家最大的不同：
 *  - 鉴权用 ?key= 查询参数，而不是 Authorization 头；
 *  - 图片用 inlineData { mimeType, data }；
 *  - 系统提示走 systemInstruction；
 *  - JSON 输出用 generationConfig.responseMimeType。
 */
export const geminiProvider: ProviderAdapter = {
  id: 'gemini',
  label: 'Google Gemini',
  supportsVision: true,
  defaultBaseUrl: GEMINI_DEFAULT_BASE_URL,

  async call(input: ProviderCall): Promise<ProviderResult> {
    const startedAt = Date.now()
    const base = input.baseUrl || GEMINI_DEFAULT_BASE_URL
    const url = `${joinEndpoint(base, `models/${encodeURIComponent(input.model)}:generateContent`, 'v1beta')}?key=${encodeURIComponent(input.apiKey)}`

    const parts: Record<string, unknown>[] = [{ text: input.prompt }]
    if (input.imageDataUrl) {
      const { mimeType, base64 } = parseDataUrl(input.imageDataUrl)
      parts.push({ inlineData: { mimeType, data: base64 } })
    }

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: 4096,
        ...(input.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }

    const { response, text } = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      input.timeoutMs,
      'Gemini',
    )

    if (!response.ok) {
      throw mapUpstreamError(response.status, sanitize(extractGeminiError(text), input.apiKey))
    }

    const data = await parseUpstreamJson(text, response.status, 'Gemini')
    const candidates = data.candidates as Array<Record<string, unknown>> | undefined
    const candidate = candidates?.[0]
    const content = candidate?.content as Record<string, unknown> | undefined
    const parts2 = content?.parts as Array<Record<string, unknown>> | undefined
    const output = (parts2 ?? [])
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim()

    if (!output) {
      const blockReason = (data.promptFeedback as Record<string, unknown> | undefined)?.blockReason
      throw new ApiError(
        'UPSTREAM_ERROR',
        blockReason ? `Gemini 拒绝了该请求（${String(blockReason)}）。` : 'Gemini 返回了空内容。',
        { retryable: true, hint: '可尝试更换模型或调整图片内容。' },
      )
    }

    return {
      text: output,
      latencyMs: Date.now() - startedAt,
      model: typeof data.modelVersion === 'string' ? data.modelVersion : undefined,
    }
  },
}

function extractGeminiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const error = parsed.error as Record<string, unknown> | undefined
    if (error && typeof error.message === 'string') return error.message
  } catch {
    // ignore
  }
  return raw.replace(/\s+/g, ' ').slice(0, 240)
}
