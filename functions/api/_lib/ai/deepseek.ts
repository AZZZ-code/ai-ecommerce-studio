import { ApiError, keyShapeWarning, mapUpstreamError, sanitize } from '../errors'
import { fetchWithTimeout, parseUpstreamJson } from './json'
import type { ProviderAdapter, ProviderCall, ProviderResult } from './types'

/**
 * DeepSeek 适配器
 * ----------------------------------------------------------------------------
 * DeepSeek 的 Chat Completions 接口与 OpenAI 格式接近，但有一些必须单独处理的差异，
 * 因此这里不做成"兼容接口"的别名，而是独立实现：
 *
 *  1. 接口路径：https://api.deepseek.com/chat/completions
 *     （官方 Base URL 就是 https://api.deepseek.com，不带 /v1；写成 /v1 也能用，
 *       所以这里不再像 OpenAI 那样补 /v1 前缀）
 *  2. 鉴权：Authorization: Bearer <API_KEY>
 *  3. 模型：deepseek-chat（V3 系列通用对话）、deepseek-reasoner（带思维链的推理模型）
 *     - deepseek-reasoner 不接受采样类参数（temperature / top_p 等），也不支持 JSON Output，
 *       因此对 reasoner 不发送 temperature 与 response_format。
 *  4. 推理模型的答案在 choices[0].message.content，思维链在 reasoning_content，
 *     这里只把 content 当作结果，reasoning_content 不返回给前端（不占上下文）。
 *  5. **DeepSeek 目前没有视觉模型**：任何带图片的请求都会被这里的守卫直接拒绝，
 *     不会把图片发给 DeepSeek，也不会假装它具备图片识别能力。
 */

/** DeepSeek API 配置（由 ModelRouter 解析后传入，仅存在于本次请求作用域） */
export interface DeepSeekConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com'

/** 常用模型（以官方文档为准，仅用于前端下拉建议，不构成能力声明） */
export const DEEPSEEK_TEXT_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const

/** 是否为推理模型（params 与输出格式都不同） */
export function isDeepSeekReasoner(model: string): boolean {
  return /reasoner/i.test(model)
}

/**
 * 拼接 DeepSeek 接口地址。
 * base 为空 → 官方默认地址；base 已带 /v1 或 /v1beta → 直接追加 path；
 * 否则按官方文档直接追加 /chat/completions（不额外补 /v1）。
 */
export function buildDeepSeekUrl(baseUrl: string): string {
  const base = (baseUrl || DEEPSEEK_DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  if (!base) return `${DEEPSEEK_DEFAULT_BASE_URL}/chat/completions`
  if (/\/v\d+[a-z0-9]*$/i.test(base)) return `${base}/chat/completions`
  return `${base}/chat/completions`
}

/** 请求体构造（纯函数，便于测试） */
export function buildDeepSeekRequestBody(input: ProviderCall): Record<string, unknown> {
  const reasoner = isDeepSeekReasoner(input.model)
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.prompt },
    ],
    stream: false,
  }
  // 推理模型不支持采样参数，发了也不生效，干脆不发
  if (!reasoner) {
    body.temperature = input.temperature ?? 0.7
    if (input.jsonMode) body.response_format = { type: 'json_object' }
  }
  return body
}

/**
 * 响应解析：只取正文。返回 { text, model, finishReason, usage }。
 * - content 为空且 finish_reason === 'length' → 说明被 max_tokens 截断，按模型输出异常处理。
 */
export function parseDeepSeekResponse(data: unknown): {
  text: string
  model?: string
  finishReason?: string
  usage?: Record<string, number>
} {
  const root = (data ?? {}) as Record<string, unknown>
  const choices = root.choices as Array<Record<string, unknown>> | undefined
  const choice = choices?.[0]
  const message = choice?.message as Record<string, unknown> | undefined
  const content = message?.content
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((part) => {
    const item = part as Record<string, unknown>
    return typeof item.text === 'string' ? item.text : ''
  }).join('') : ''

  const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined
  if (!text.trim()) {
    if (finishReason === 'length') {
      throw new ApiError('BAD_MODEL_OUTPUT', 'DeepSeek 返回内容被长度截断，没有可用的文案正文。', {
        hint: '可以减少单次生成的模块数量，或换用上下文更长的模型后重试。',
        retryable: true,
      })
    }
    throw new ApiError('UPSTREAM_ERROR', 'DeepSeek 返回了空内容。', {
      hint: '请确认模型名称（deepseek-chat / deepseek-reasoner）存在且账户余额充足。',
      retryable: true,
    })
  }

  return {
    text,
    model: typeof root.model === 'string' ? root.model : undefined,
    finishReason,
    usage: (root.usage as Record<string, number> | undefined) ?? undefined,
  }
}

/** 从错误响应里提取可读信息（DeepSeek 形如 {error:{message,type,code}}） */
export function extractDeepSeekErrorDetail(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const error = parsed.error as Record<string, unknown> | string | undefined
    if (typeof error === 'string') return error
    if (error && typeof error.message === 'string') return error.message
    if (typeof parsed.message === 'string') return parsed.message
  } catch {
    // 非 JSON，落到截断原文
  }
  return raw.replace(/\s+/g, ' ').slice(0, 240)
}

/** DeepSeek 错误处理：统一交给 mapUpstreamError，Key 先脱敏 */
export function mapDeepSeekError(status: number, rawBody: string, apiKey: string): ApiError {
  const detail = sanitize(extractDeepSeekErrorDetail(rawBody), apiKey)
  const mapped = mapUpstreamError(status, detail)

  if (mapped.code === 'UPSTREAM_UNAUTHORIZED') {
    // 401 的排查顺序：Key 形态不对 → 平台/地址不匹配 → Key 本身失效
    const shape = keyShapeWarning('deepseek', apiKey)
    const hints: string[] = []
    if (shape) hints.push(shape)
    hints.push(
      'DeepSeek 的 Key 在 https://platform.deepseek.com/api_keys 创建；Base URL 用 https://api.deepseek.com（不要填成 openai 的地址）。',
    )
    hints.push('如果这个 Key 是刚删掉/重置的，请重新生成一个再填。')
    if (detail) hints.push(`服务商原文：${detail}`)
    return new ApiError('UPSTREAM_UNAUTHORIZED', `DeepSeek 鉴权失败（HTTP ${status}）`, {
      hint: hints.join(' '),
      retryable: false,
    })
  }
  return mapped
}

async function requestDeepSeek(input: ProviderCall): Promise<ProviderResult> {
  // 硬约束：DeepSeek 没有视觉模型，绝不把图片发过去
  if (input.imageDataUrl) {
    throw new ApiError(
      'NO_VISION_MODEL',
      `DeepSeek 的 ${input.model} 是纯文本模型，不支持图片输入，因此没有把图片发送给它。`,
      {
        hint: '请填写商品名称与商品特征后用「仅文字生成」，或把视觉模型换成 OpenAI / Gemini / Claude 等支持图片的模型。',
      },
    )
  }
  if (!input.apiKey.trim()) {
    throw new ApiError('INVALID_MODEL_CONFIG', 'DeepSeek 需要填写 API Key。')
  }

  const url = buildDeepSeekUrl(input.baseUrl)
  const startedAt = Date.now()
  const { response, text } = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(buildDeepSeekRequestBody(input)),
    },
    input.timeoutMs,
    'DeepSeek',
  )

  if (!response.ok) {
    throw mapDeepSeekError(response.status, text, input.apiKey)
  }

  const data = await parseUpstreamJson(text, response.status, 'DeepSeek')
  const parsed = parseDeepSeekResponse(data)
  return {
    text: parsed.text,
    model: parsed.model,
    latencyMs: Date.now() - startedAt,
    usage: parsed.usage,
  }
}

/** 暴露给 ModelRouter 的统一适配器 */
export const deepseekProvider: ProviderAdapter = {
  id: 'deepseek',
  label: 'DeepSeek',
  // DeepSeek 官方目前只有文本模型
  supportsVision: false,
  defaultBaseUrl: DEEPSEEK_DEFAULT_BASE_URL,
  async call(input: ProviderCall): Promise<ProviderResult> {
    return requestDeepSeek(input)
  },
}

/** 供「统一接口」使用的语义化封装：文本生成 */
export async function generateText(input: ProviderCall): Promise<ProviderResult> {
  return deepseekProvider.call(input)
}
