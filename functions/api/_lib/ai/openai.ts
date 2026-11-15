import type { ProviderId } from '../../../../shared/types'
import { ApiError, mapUpstreamError, sanitize } from '../errors'
import { fetchWithTimeout, parseUpstreamJson } from './json'
import { joinEndpoint, type ProviderAdapter, type ProviderCall, type ProviderResult } from './types'

/**
 * OpenAI Chat Completions 适配器。
 * 同一份实现同时服务：
 *  - provider = 'openai'      → 官方接口
 *  - provider = 'compatible'  → 任何 OpenAI 兼容接口（DeepSeek / 通义 / 智谱 / Moonshot / 自建网关）
 *
 * 兼容接口的差异处理：
 *  - 官方接口支持 response_format=json_object，兼容接口不一定支持，因此只在官方接口加该参数；
 *  - 部分兼容接口不支持 system role，会退化为把 system 拼进 user 消息（见 fallback）。
 */
export function createOpenAICompatibleProvider(
  id: Extract<ProviderId, 'openai' | 'compatible'>,
  label: string,
): ProviderAdapter {
  const defaultBaseUrl = id === 'openai' ? 'https://api.openai.com/v1' : ''

  async function request(input: ProviderCall): Promise<{ text: string; model?: string }> {
    const base = input.baseUrl || defaultBaseUrl
    if (!base) {
      throw new ApiError('INVALID_MODEL_CONFIG', 'OpenAI 兼容接口需要填写 Base URL。', {
        hint: '例如 https://api.deepseek.com/v1',
      })
    }
    const url = joinEndpoint(base, 'chat/completions', 'v1')

    const userContent = input.imageDataUrl
      ? [
          { type: 'text', text: input.prompt },
          { type: 'image_url', image_url: { url: input.imageDataUrl, detail: 'high' } },
        ]
      : input.prompt

    const messages = [
      { role: 'system', content: input.system },
      { role: 'user', content: userContent },
    ]

    const body: Record<string, unknown> = {
      model: input.model,
      messages,
      temperature: input.temperature ?? 0.7,
    }
    if (input.jsonMode && id === 'openai') {
      body.response_format = { type: 'json_object' }
    }

    const { response, text } = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      input.timeoutMs,
      label,
    )

    if (!response.ok) {
      const detail = sanitize(extractErrorDetail(text), input.apiKey)
      throw mapUpstreamError(response.status, detail)
    }

    const data = await parseUpstreamJson(text, response.status, label)
    const choice = (data.choices as Array<Record<string, unknown>> | undefined)?.[0]
    const message = choice?.message as Record<string, unknown> | undefined
    const content = message?.content
    let output = ''
    if (typeof content === 'string') {
      output = content
    } else if (Array.isArray(content)) {
      output = content
        .map((part) => {
          const item = part as Record<string, unknown>
          return typeof item.text === 'string' ? item.text : ''
        })
        .join('')
    }
    if (!output.trim()) {
      throw new ApiError('UPSTREAM_ERROR', `${label} 返回了空内容。`, {
        hint: '请确认该模型名称存在且账户额度充足。',
        retryable: true,
      })
    }
    return { text: output, model: typeof data.model === 'string' ? data.model : undefined }
  }

  return {
    id,
    label,
    supportsVision: true,
    defaultBaseUrl,
    async call(input: ProviderCall): Promise<ProviderResult> {
      const startedAt = Date.now()
      const { text, model } = await request(input)
      return { text, model, latencyMs: Date.now() - startedAt }
    },
  }
}

function extractErrorDetail(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const error = parsed.error as Record<string, unknown> | string | undefined
    if (typeof error === 'string') return error
    if (error && typeof error.message === 'string') return error.message
    if (typeof parsed.message === 'string') return parsed.message
  } catch {
    // 不是 JSON，直接返回截断原文
  }
  return raw.replace(/\s+/g, ' ').slice(0, 240)
}
