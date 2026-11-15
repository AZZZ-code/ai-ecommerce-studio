import type { ApiErrorCode } from '../../../shared/types'

/**
 * 统一业务异常。
 * 所有 handler 只允许抛出 ApiError，其他异常由 http.ts 兜底转成 INTERNAL_ERROR。
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly hint?: string
  readonly retryable: boolean

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number; hint?: string; retryable?: boolean } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = options.status ?? defaultStatus(code)
    this.hint = options.hint
    this.retryable = options.retryable ?? false
  }
}

function defaultStatus(code: ApiErrorCode): number {
  switch (code) {
    case 'BAD_REQUEST':
    case 'INVALID_FILE':
    case 'INVALID_MODEL_CONFIG':
    case 'NO_MODEL_CONFIG':
    case 'NO_VISION_MODEL':
      return 400
    case 'FILE_TOO_LARGE':
      return 413
    case 'RATE_LIMITED':
      return 429
    case 'BLOCKED_BASE_URL':
      return 400
    case 'UPSTREAM_UNAUTHORIZED':
      return 401
    case 'UPSTREAM_INSUFFICIENT_BALANCE':
      return 402
    case 'UPSTREAM_RATE_LIMIT':
      return 429
    case 'MODEL_NOT_FOUND':
      return 404
    case 'UPSTREAM_TIMEOUT':
      return 504
    case 'UPSTREAM_ERROR':
    case 'BAD_MODEL_OUTPUT':
      return 502
    default:
      return 500
  }
}

/** 上游报文里可能是"模型不存在"的关键词（各家措辞不同，统一归一到 MODEL_NOT_FOUND） */
const MODEL_NOT_FOUND_PATTERN = /model[\s_-]*not[\s_-]*(exist|found)|no such model|invalid model|unknown model|模型不存在|模型名称有误/i

/**
 * 上游模型接口的 HTTP 状态映射。
 * 注意：错误信息里绝不能出现 apiKey，调用方需先 sanitize。
 * 这里对 DeepSeek 的 402（余额不足）与"模型不存在"做了专门归一，方便前端给出可执行提示。
 */
export function mapUpstreamError(status: number, detail: string): ApiError {
  if (status === 401 || status === 403) {
    // 把上游原文带上：多数服务商会在里面说明「Key 无效 / 已于某处被撤销」，比笼统一句有用得多
    const suffix = detail ? `：${detail}` : ''
    return new ApiError('UPSTREAM_UNAUTHORIZED', `模型服务鉴权失败（HTTP ${status}）${suffix}`, {
      hint: '最常见原因是 Key 复制不完整、Key 已被删除/重置、或把别家服务商的 Key 填到了这里。请到服务商控制台重新复制一次，再用「测试连接」验证。',
      retryable: false,
    })
  }
  if (status === 402) {
    return new ApiError('UPSTREAM_INSUFFICIENT_BALANCE', '模型服务余额不足（HTTP 402）', {
      hint: '请在服务商控制台充值，或换用其它有额度的 API Key。余额不足时不会产生任何文案，请不要把它当成生成成功。',
      retryable: false,
    })
  }
  if (MODEL_NOT_FOUND_PATTERN.test(detail)) {
    return new ApiError('MODEL_NOT_FOUND', '模型不存在或当前账号无权访问该模型', {
      hint: '请核对模型名称（如 deepseek-chat / deepseek-reasoner），并在服务商控制台确认账号权限。',
      retryable: false,
    })
  }
  if (status === 404) {
    return new ApiError('UPSTREAM_ERROR', '模型或接口地址不存在（HTTP 404）', {
      hint: '请确认 Base URL 与模型名称是否匹配，例如 Gemini 需要 /v1beta，OpenAI 需要 /v1。',
      retryable: false,
    })
  }
  if (status === 429) {
    return new ApiError('UPSTREAM_RATE_LIMIT', '模型服务返回限流（HTTP 429）', {
      hint: '请稍后重试，或更换模型 / 提高账户配额。',
      retryable: true,
    })
  }
  if (status === 400 || status === 422) {
    return new ApiError('UPSTREAM_ERROR', `模型调用失败（HTTP ${status}）${detail ? '：' + detail : ''}`, {
      hint: '参数或模型能力不被接受。请检查模型名称，以及该模型是否支持图片输入（DeepSeek 文本模型不支持图片）。',
      retryable: false,
    })
  }
  if (status >= 500) {
    return new ApiError('UPSTREAM_ERROR', `模型服务异常（HTTP ${status}）`, {
      hint: '上游服务暂时不可用，请稍后重试。',
      retryable: true,
    })
  }
  return new ApiError('UPSTREAM_ERROR', `模型调用失败（HTTP ${status}）${detail ? '：' + detail : ''}`, {
    retryable: true,
  })
}

/** 把上游响应里的敏感信息（Key）擦掉，避免回显到前端或日志 */
export function sanitize(text: string, secret?: string): string {
  let out = text
  if (secret && secret.length >= 6) {
    out = out.split(secret).join('***')
  }
  // 兜底：把形如 sk-xxxx / AIza... 的串打码
  out = out.replace(/\b(sk-[A-Za-z0-9_-]{8,})/g, 'sk-***').replace(/\b(AIza[0-9A-Za-z_-]{10,})/g, 'AIza***')
  return out.slice(0, 600)
}

/**
 * 写日志前的最后一道脱敏。
 *
 * 用于 `console.error` 这类「会真的落到 Cloudflare 日志里」的地方：
 * 未知异常有可能把完整请求 URL 带进 message，而 Gemini 走的是 `?key=...` 鉴权、
 * 其他服务商走 `Authorization: Bearer ...`，所以这里把两类凭证形态都打掉。
 */
export function redactForLog(text: string): string {
  return sanitize(
    text
      .replace(/([?&]key=)[^&\s"']+/gi, '$1***')
      .replace(/(Bearer\s+)[A-Za-z0-9._\-]{6,}/gi, '$1***')
      .replace(/(x-api-key["':\s=]+)[A-Za-z0-9._\-]{6,}/gi, '$1***'),
  )
}

/**
 * Key 形态自检（纯本地判断，不发网络请求、不打印 Key）。
 * 用途：把「把别家服务商的 Key 填进来」这类最常见的人为错误提前指出来。
 */
export function keyShapeWarning(provider: string, apiKey: string): string | undefined {
  const key = apiKey.trim()
  if (!key) return undefined

  const looksLike = (prefix: string, label: string) =>
    key.startsWith(prefix) ? `这个 Key 以 ${prefix} 开头，看起来是 ${label} 的 Key。` : ''

  if (provider === 'deepseek') {
    const wrong = [
      looksLike('sk-proj-', 'OpenAI（项目 Key）'),
      looksLike('sk-ant-', 'Anthropic Claude'),
      looksLike('AIza', 'Google Gemini'),
    ].find(Boolean)
    if (wrong) return `${wrong} DeepSeek 的 Key 请在 https://platform.deepseek.com/api_keys 创建，形如 sk-xxxxxxxx。`
    if (!key.startsWith('sk-')) {
      return 'DeepSeek 的 Key 通常以 sk- 开头，当前这个不像 DeepSeek 的 Key，请确认是否复制错了。'
    }
    return undefined
  }
  if (provider === 'openai' && (key.startsWith('sk-ant-') || key.startsWith('AIza'))) {
    return '这看起来是 Anthropic 或 Google 的 Key，OpenAI 的 Key 以 sk- 或 sk-proj- 开头。'
  }
  if (provider === 'gemini' && !key.startsWith('AIza')) {
    return 'Google Gemini 的 Key 通常以 AIza 开头；如果用的是兼容网关，请把服务商改成「OpenAI 兼容接口」。'
  }
  if (provider === 'claude' && !key.startsWith('sk-ant-')) {
    return 'Anthropic 的 Key 通常以 sk-ant- 开头；如果用的是兼容网关，请把服务商改成「OpenAI 兼容接口」。'
  }
  return undefined
}
