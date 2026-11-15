import { ApiError } from './errors'
import type { Env } from './types'

/**
 * SSRF 防护
 * ----------------------------------------------------------------------------
 * 用户自带 API（BYOK）需要填 Base URL，这是典型的 SSRF 入口。
 * 策略（严格白名单 + 结构校验）：
 *   1. 只允许 https（http 仅在本机回环地址 + 显式开启 ALLOW_LOOPBACK_BASE_URL=true 时放行，用于本地自建网关调试）；
 *   2. 禁止 URL 内嵌账号密码；
 *   3. 禁止 IP 字面量、私有网段、.local / .internal / .localhost 等内网域名；
 *   4. 域名必须命中内置服务商白名单，或命中环境变量 ALLOW_CUSTOM_BASE_URL_HOSTS 追加的白名单；
 *   5. 禁止非标准端口（只允许 443，本机回环调试例外）。
 * 这样即便前端被篡改，后端也不会被用于请求内网或任意外部地址。
 */

const BUILTIN_ALLOWED_HOSTS = [
  // OpenAI
  'api.openai.com',
  // Anthropic
  'api.anthropic.com',
  // Google Gemini
  'generativelanguage.googleapis.com',
  'aiplatform.googleapis.com',
  // 常见 OpenAI 兼容服务商
  'api.deepseek.com',
  'dashscope.aliyuncs.com',
  'dashscope-intl.aliyuncs.com',
  'open.bigmodel.cn',
  'api.moonshot.cn',
  'api.siliconflow.cn',
  'api.lingyiwanwu.com',
  'api.baichuan-ai.com',
  'api.stepfun.com',
  'api.minimax.chat',
  'api.mistral.ai',
  'api.groq.com',
  'api.together.xyz',
  'api.x.ai',
  'openrouter.ai',
  'ark.cn-beijing.volces.com',
  'qianfan.baidubce.com',
  'api.302.ai',
]

const BLOCKED_SUFFIXES = [
  '.local',
  '.internal',
  '.localhost',
  '.home.arpa',
  '.lan',
  '.intranet',
  '.corp',
]

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fd/i,
  /^\[?fe80:/i,
]

export function assertAllowedBaseUrl(rawBaseUrl: string, env: Env): string {
  const raw = rawBaseUrl.trim()
  if (!raw) {
    // 由调用方决定是否回落到服务商默认地址；这里给出空串表示"使用默认值"
    return ''
  }
  if (raw.length > 300) {
    throw new ApiError('BLOCKED_BASE_URL', 'API 地址过长。')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ApiError('BLOCKED_BASE_URL', 'API 地址不是合法的 URL。', {
      hint: '示例：https://api.openai.com/v1',
    })
  }

  if (url.username || url.password) {
    throw new ApiError('BLOCKED_BASE_URL', 'API 地址中不允许包含账号密码。')
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  const loopbackHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
  // 本地自建网关只在显式开启 ALLOW_LOOPBACK_BASE_URL=true 时放行（默认关闭，避免线上被用作内网探测入口）
  const loopbackAllowed = loopbackHost && (env.ALLOW_LOOPBACK_BASE_URL ?? '').toLowerCase() === 'true'

  if (url.protocol !== 'https:') {
    if (!(url.protocol === 'http:' && loopbackAllowed)) {
      throw new ApiError('BLOCKED_BASE_URL', '为了保障密钥安全，API 地址必须使用 https://', {
        hint: loopbackHost
          ? '如需在本机调试自建网关，请在服务端变量中设置 ALLOW_LOOPBACK_BASE_URL=true 后再使用 http://127.0.0.1。'
          : '示例：https://api.openai.com/v1',
      })
    }
  }

  if (!loopbackAllowed) {
    if (loopbackHost) {
      throw new ApiError('BLOCKED_BASE_URL', 'API 地址不能指向本机地址。', {
        hint: '本地调试自建网关需要服务端显式开启 ALLOW_LOOPBACK_BASE_URL=true。',
      })
    }
    for (const pattern of PRIVATE_HOST_PATTERNS) {
      if (pattern.test(host)) {
        throw new ApiError('BLOCKED_BASE_URL', '不允许访问内网或私有地址。')
      }
    }
    for (const suffix of BLOCKED_SUFFIXES) {
      if (host.endsWith(suffix)) {
        throw new ApiError('BLOCKED_BASE_URL', '不允许访问内部域名。')
      }
    }
    // 纯 IP 字面量一律拒绝（含 IPv6）
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
      throw new ApiError('BLOCKED_BASE_URL', '不允许直接使用 IP 地址作为 API 域名。')
    }
    if (url.port && url.port !== '443') {
      throw new ApiError('BLOCKED_BASE_URL', `不允许使用非标准端口：${url.port}`)
    }
  }

  const allowed = buildAllowedHosts(env)
  // 本机回环地址在显式开启调试开关时无需命中域名白名单
  const matched = loopbackAllowed || allowed.some((item) => host === item || host.endsWith('.' + item))
  if (!matched) {
    throw new ApiError('BLOCKED_BASE_URL', `该域名不在允许列表中：${host}`, {
      hint: '如需接入自建网关，请在服务端环境变量 ALLOW_CUSTOM_BASE_URL_HOSTS 中加入该域名。',
    })
  }

  // 去掉 query / hash，只保留 origin + pathname
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

function buildAllowedHosts(env: Env): string[] {
  const extra = (env.ALLOW_CUSTOM_BASE_URL_HOSTS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return [...BUILTIN_ALLOWED_HOSTS, ...extra]
}

/** 供 /api/models 展示"哪些域名被允许"，不泄露环境变量里的 Key */
export function describeAllowedHosts(env: Env): string[] {
  return buildAllowedHosts(env)
}
