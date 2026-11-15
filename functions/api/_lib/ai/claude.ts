import { ApiError, mapUpstreamError, sanitize } from '../errors'
import { fetchWithTimeout, parseUpstreamJson } from './json'
import {
  joinEndpoint,
  parseDataUrl,
  type ProviderAdapter,
  type ProviderCall,
  type ProviderResult,
} from './types'

export const CLAUDE_DEFAULT_BASE_URL = 'https://api.anthropic.com'

/**
 * Anthropic Claude Messages API 适配器
 * 与其他家最大的不同：
 *  - 鉴权头是 x-api-key + anthropic-version（不是 Bearer）；
 *  - 图片是 content block：{ type:'image', source:{ type:'base64', media_type, data } }；
 *  - system 是顶层字段，不是 messages 里的一条；
 *  - max_tokens 必填。
 */
export const claudeProvider: ProviderAdapter = {
  id: 'claude',
  label: 'Anthropic Claude',
  supportsVision: true,
  defaultBaseUrl: CLAUDE_DEFAULT_BASE_URL,

  async call(input: ProviderCall): Promise<ProviderResult> {
    const startedAt = Date.now()
    const base = input.baseUrl || CLAUDE_DEFAULT_BASE_URL
    const url = joinEndpoint(base, 'messages', 'v1')

    const content: Record<string, unknown>[] = []
    if (input.imageDataUrl) {
      const { mimeType, base64 } = parseDataUrl(input.imageDataUrl)
      content.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } })
    }
    content.push({ type: 'text', text: input.prompt })

    const body: Record<string, unknown> = {
      model: input.model,
      max_tokens: 4096,
      temperature: input.temperature ?? 0.7,
      system: input.system,
      messages: [{ role: 'user', content }],
    }

    const { response, text } = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': input.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      },
      input.timeoutMs,
      'Claude',
    )

    if (!response.ok) {
      throw mapUpstreamError(response.status, sanitize(extractClaudeError(text), input.apiKey))
    }

    const data = await parseUpstreamJson(text, response.status, 'Claude')
    const blocks = data.content as Array<Record<string, unknown>> | undefined
    const output = (blocks ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('')
      .trim()

    if (!output) {
      throw new ApiError('UPSTREAM_ERROR', 'Claude 返回了空内容。', { retryable: true })
    }
    if (data.stop_reason === 'max_tokens') {
      throw new ApiError('BAD_MODEL_OUTPUT', 'Claude 输出被 max_tokens 截断。', {
        hint: '请减少生成模块数量或换用输出上限更高的模型。',
        retryable: true,
      })
    }

    return {
      text: output,
      latencyMs: Date.now() - startedAt,
      model: typeof data.model === 'string' ? data.model : undefined,
    }
  },
}

function extractClaudeError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const error = parsed.error as Record<string, unknown> | undefined
    if (error && typeof error.message === 'string') return error.message
  } catch {
    // ignore
  }
  return raw.replace(/\s+/g, ' ').slice(0, 240)
}
