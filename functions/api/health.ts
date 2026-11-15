import type { Env, PagesContext } from './_lib/types'
import { jsonOk, withErrorHandling } from './_lib/http'
import { describeAllowedHosts } from './_lib/ssrf'

/**
 * GET /api/health
 * ----------------------------------------------------------------------------
 * 用途：前端在「测试模型」之前先确认这件事 —— **本站后端接口到底通不通**。
 * 这样一旦出现网络问题，用户能立刻区分是「页面连不上自己的后端」还是
 * 「后端连不上模型服务商」，而不是笼统地看到一句「网络请求失败」。
 *
 * 只暴露能力开关与运行环境，绝不返回任何 Key。
 */
export const onRequestGet = withErrorHandling(async (_request: Request, env: Env): Promise<Response> => {
  const available = {
    text: Boolean(env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY || env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY || env.COMPATIBLE_API_KEY),
    vision: Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY || env.COMPATIBLE_API_KEY),
    image: Boolean(env.OPENAI_IMAGE_API_KEY || env.GEMINI_IMAGE_API_KEY || env.DEEPSEEK_IMAGE_API_KEY || env.CUSTOM_IMAGE_API_KEY),
  }

  return jsonOk({
    ok: true,
    runtime: 'pages-functions',
    env: 'dev-or-production',
    platformDefaultConfigured: Object.values(available).some(Boolean),
    available,
    rateLimitPerMinute: Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? '', 10) || 12,
    allowedHostsHint: describeAllowedHosts(env),
    time: new Date().toISOString(),
  })
})

export type { PagesContext }
