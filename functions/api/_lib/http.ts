import type { ApiErrorBody } from '../../../shared/types'
import { ApiError, redactForLog } from './errors'

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
}

export function jsonOk<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: BASE_HEADERS })
}

export function jsonError(error: ApiError): Response {
  const body: ApiErrorBody = {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      hint: error.hint,
      retryable: error.retryable,
    },
  }
  return new Response(JSON.stringify(body), { status: error.status, headers: BASE_HEADERS })
}

/**
 * 统一的 handler 包装：把已知异常转成 JSON，未知异常脱敏成 INTERNAL_ERROR。
 * 这样 Cloudflare 上不会返回 HTML 错误页，前端永远拿到可解析的 JSON。
 */
export function withErrorHandling(
  handler: (request: Request, env: Record<string, string | undefined>) => Promise<Response>,
): (context: { request: Request; env: Record<string, string | undefined> }) => Promise<Response> {
  return async (context) => {
    try {
      return await handler(context.request, context.env)
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err)
      const message = err instanceof Error ? err.message : String(err)
      // 打印到 Cloudflare 日志前先脱敏：未知异常可能把带 key 的 URL 带进 message
      console.error('[productai] unhandled error:', redactForLog(message))
      return jsonError(
        new ApiError('INTERNAL_ERROR', '服务器处理请求时出现异常，请稍后重试。', {
          retryable: true,
        }),
      )
    }
  }
}

/** 只允许 POST 的接口使用；其他方法返回 405 */
export function methodNotAllowed(allowed: string[]): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: `不支持的请求方法，请使用 ${allowed.join(' / ')}。`,
        retryable: false,
      },
    }),
    { status: 405, headers: { ...BASE_HEADERS, allow: allowed.join(', ') } },
  )
}

/** 解析 JSON body，格式错误时抛出可读的 ApiError */
export async function readJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError('BAD_REQUEST', '请求格式错误：Content-Type 必须是 application/json。')
  }
  const text = await request.text()
  if (!text.trim()) {
    throw new ApiError('BAD_REQUEST', '请求体为空。')
  }
  if (text.length > 1024 * 1024) {
    throw new ApiError('BAD_REQUEST', '请求体过大。')
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('BAD_REQUEST', '请求体不是合法的 JSON。')
  }
}
