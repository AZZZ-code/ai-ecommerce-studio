import { ApiError } from './errors'
import type { Env } from './types'

/**
 * 极简内存限流器。
 * ----------------------------------------------------------------------------
 * Cloudflare Pages Functions 是边缘 isolate 模型，进程内内存只对当前 isolate 生效，
 * 因此这是"尽力而为"的限流（防止单个客户端瞬间打爆额度），不是严格的全局配额。
 * 生产环境如需精确限流，建议接 Cloudflare KV / Durable Objects 或 API Gateway 限流。
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

function limitFor(env: Env, fallback: number): number {
  const parsed = Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function clientKey(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return 'local'
}

/** 命中限流时抛出 RATE_LIMITED，附带 retryAfter 秒数 */
export function enforceRateLimit(request: Request, env: Env, scope: string, fallback = 12): void {
  const limit = limitFor(env, fallback)
  const key = `${scope}:${clientKey(request)}`
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 })
    if (buckets.size > MAX_BUCKETS) {
      // 简单清理：删掉过期条目，避免 isolate 内存无限增长
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k)
      }
    }
    return
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    throw new ApiError('RATE_LIMITED', `请求过于频繁，请 ${retryAfter} 秒后再试。`, {
      hint: `当前限制：每分钟 ${limit} 次。`,
      retryable: true,
    })
  }

  bucket.count += 1
}

export function rateLimitInfo(env: Env, fallback = 12): number {
  return limitFor(env, fallback)
}
