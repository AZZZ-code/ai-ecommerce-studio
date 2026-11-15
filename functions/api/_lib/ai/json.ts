import { ApiError } from '../errors'
import type { ProviderResult } from './types'

/**
 * 健壮的 JSON 抽取。
 * 模型经常在 JSON 外包一层 ```json 代码块，或者在前后加解释性文字，
 * 因此这里先剥壳，再用括号配对找到第一个完整对象，最后才 JSON.parse。
 */
export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/```json/gi, '```')
    .trim()

  const fenced = /```([\s\S]*?)```/.exec(cleaned)
  const candidate = (fenced ? fenced[1]! : cleaned).trim()

  const direct = tryParse(candidate)
  if (direct !== undefined) return direct

  const start = candidate.indexOf('{')
  if (start === -1) {
    throw new ApiError('BAD_MODEL_OUTPUT', '模型返回的内容里没有找到 JSON 对象。', {
      hint: '可能是模型不支持结构化输出，换一个支持 JSON 的文本模型重试。',
      retryable: true,
    })
  }
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i]!
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1)
        const parsed = tryParse(slice)
        if (parsed !== undefined) return parsed
        break
      }
    }
  }

  throw new ApiError('BAD_MODEL_OUTPUT', '模型返回的 JSON 不完整或被截断。', {
    hint: '可尝试减少生成内容长度，或换用上下文更长 / 输出更稳定的模型。',
    retryable: true,
  })
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * 从 fetch 的网络异常里挖出底层原因。
 * - Workers / Node 都会把细节挂在 cause 上；
 * - Node 的 undici 在 IPv4/IPv6 双栈连接失败时会包一层 AggregateError，真正的原因在 errors[] 里，
 *   所以必须同时展开 cause 链与 errors 数组，否则 ECONNREFUSED 会被漏掉、退化成一句「fetch failed」。
 */
function collectCause(node: unknown, parts: string[], depth: number): void {
  if (!node || depth > 4) return
  const c = node as { message?: unknown; code?: unknown; errno?: unknown; cause?: unknown; errors?: unknown }
  if (typeof c.code === 'string') parts.push(c.code)
  if (typeof c.errno === 'string') parts.push(c.errno)
  if (typeof c.message === 'string' && c.message) parts.push(c.message)
  if (Array.isArray(c.errors)) {
    for (const nested of c.errors.slice(0, 4)) collectCause(nested, parts, depth + 1)
  }
  collectCause(c.cause, parts, depth + 1)
}

function networkCause(err: unknown): string {
  const parts: string[] = []
  collectCause(err, parts, 0)
  return parts.join(' | ').toLowerCase()
}

/**
 * 把网络层异常翻译成「用户能照着做」的提示，而不是一句笼统的「网络请求失败」。
 * 覆盖：DNS 解析失败、连接被拒、证书问题、连接超时、被中间设备阻断。
 */
export function classifyNetworkError(err: unknown, url: string, label: string): ApiError {
  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  const cause = networkCause(err)
  const raw = err instanceof Error ? err.message : String(err)

  if (/eai_again|temporary failure in name resolution/.test(cause)) {
    return new ApiError('UPSTREAM_ERROR', `${label} DNS 暂时失败：${host}`, {
      hint: '这是本地或运营商 DNS 的瞬时故障，通常重试即可。',
      retryable: true,
    })
  }

  if (/enotfound|nxdomain|getaddrinfo|name not resolved/.test(cause)) {
    return new ApiError('UPSTREAM_ERROR', `${label} 域名无法解析：${host}`, {
      hint: '请检查 Base URL 拼写、本机 DNS 或代理设置；公司/校园网常会拦截境外域名。',
      retryable: true,
    })
  }
  if (/bad port|invalid port|ports? (are|is) not allowed/.test(cause)) {
    return new ApiError('UPSTREAM_ERROR', `${label} 端口不可用：${host}`, {
      hint: '按 Fetch 规范，一批低位端口（如 1、7、9、11 等）禁止被请求，本地自建网关请改用 1024 以上的端口。',
      retryable: false,
    })
  }
  if (/econnrefused|connection refused|econnreset|socket hang up/.test(cause)) {
    return new ApiError('UPSTREAM_ERROR', `${label} 连接被拒绝或被中断：${host}`, {
      hint: '目标端口没在监听，或网关/防火墙直接断开。自建网关请确认服务已启动且地址端口正确。',
      retryable: true,
    })
  }
  if (/cert|tls|ssl|self.signed|unable to verify/.test(cause)) {
    return new ApiError('UPSTREAM_ERROR', `${label} TLS/证书校验失败：${host}`, {
      hint: '自签名证书或中间代理证书不被信任。请改用受信任证书，或换成官方 https 地址。',
      retryable: false,
    })
  }
  if (/etimedout|timeout|und_err_connect_timeout/.test(cause)) {
    return new ApiError('UPSTREAM_TIMEOUT', `${label} 建立连接超时：${host}`, {
      hint: '网络到该域名不通（常见于需要代理才能访问的境外服务）。请检查代理/出口，或换一个可直连的服务商。',
      retryable: true,
    })
  }

  return new ApiError('UPSTREAM_ERROR', `${label} 无法连接：${host}（${raw.slice(0, 120)}）`, {
    hint: '请确认 Base URL 可访问、端口正确；如需代理才能访问境外服务，请在服务端配置出口代理。',
    retryable: true,
  })
}

/**
 * 带超时的 fetch，并把网络层异常统一成 ApiError。
 * 注意：超时/失败信息里不包含任何密钥。
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<{ response: Response; text: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(5000, timeoutMs))
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    return { response, text }
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      throw new ApiError('UPSTREAM_TIMEOUT', `${label} 调用超时（${Math.round(timeoutMs / 1000)} 秒）。`, {
        hint: '可换用更快的模型，或稍后重试。',
        retryable: true,
      })
    }
    throw classifyNetworkError(err, url, label)
  } finally {
    clearTimeout(timer)
  }
}

/** 读取上游 JSON 响应；非 JSON 时抛出可读错误 */
export async function parseUpstreamJson(
  text: string,
  status: number,
  label: string,
): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const snippet = text.slice(0, 240).replace(/\s+/g, ' ')
    throw new ApiError('UPSTREAM_ERROR', `${label} 返回了非 JSON 响应（HTTP ${status}）：${snippet}`, {
      hint: '通常是 Base URL 指错了路径，或中间网关返回了 HTML 错误页。',
      retryable: true,
    })
  }
}

export type { ProviderResult }
