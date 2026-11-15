/**
 * Key 形态自检（纯本地规则，不发请求、不落盘）。
 * 和后端 functions/api/_lib/errors.ts 的 keyShapeWarning 保持同样的判断口径，
 * 目的是在用户点「测试连接」之前就指出「Key 与服务商不匹配」这类高发错误。
 */
export function keyShapeHint(provider: string, apiKey: string): string | undefined {
  const key = apiKey.trim()
  if (!key) return undefined

  if (provider === 'deepseek') {
    if (key.startsWith('sk-proj-')) return '这看起来是 OpenAI 的项目 Key；DeepSeek 的 Key 请在 platform.deepseek.com 创建。'
    if (key.startsWith('sk-ant-')) return '这看起来是 Anthropic 的 Key；DeepSeek 的 Key 形如 sk-xxxxxxxx。'
    if (key.startsWith('AIza')) return '这看起来是 Google Gemini 的 Key；DeepSeek 的 Key 形如 sk-xxxxxxxx。'
    if (!key.startsWith('sk-')) return 'DeepSeek 的 Key 通常以 sk- 开头，请确认没有复制错。'
    return undefined
  }
  if (provider === 'openai' && (key.startsWith('sk-ant-') || key.startsWith('AIza'))) {
    return '这看起来是 Anthropic 或 Google 的 Key；OpenAI 的 Key 以 sk- / sk-proj- 开头。'
  }
  if (provider === 'gemini' && !key.startsWith('AIza')) {
    return 'Gemini 的 Key 通常以 AIza 开头；如果用的是兼容网关，请把服务商改成「OpenAI 兼容接口」。'
  }
  if (provider === 'claude' && !key.startsWith('sk-ant-')) {
    return 'Anthropic 的 Key 通常以 sk-ant- 开头；如果用的是兼容网关，请把服务商改成「OpenAI 兼容接口」。'
  }
  return undefined
}
