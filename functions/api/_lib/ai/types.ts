import type { ProviderId } from '../../../../shared/types'

/**
 * 统一 AI 适配层接口
 * ----------------------------------------------------------------------------
 * 每家服务商的请求/响应格式都不同，因此每个 Provider 各自实现 call()，
 * 上层（ModelRouter / handler）只依赖这个统一契约：
 *   输入：system + prompt（+ 可选图片 data URL）
 *   输出：纯文本（约定为 JSON 字符串）
 * 任何厂商差异（鉴权头、字段名、图片编码方式）都被封在 Provider 内部。
 */
export interface ProviderCall {
  /** 已通过 SSRF 白名单校验的 Base URL；空字符串表示使用服务商默认地址 */
  baseUrl: string
  apiKey: string
  model: string
  system: string
  prompt: string
  /** data:image/jpeg;base64,... ；文本调用时为空 */
  imageDataUrl?: string
  temperature?: number
  /** 是否要求模型返回 JSON（不同厂商支持度不同，内部会做降级） */
  jsonMode?: boolean
  timeoutMs: number
}

export interface ProviderResult {
  text: string
  latencyMs: number
  /** 上游返回的模型名（可能与我们请求的不同，例如带日期后缀） */
  model?: string
  usage?: Record<string, number>
}

export interface ProviderAdapter {
  id: ProviderId
  label: string
  /** 该服务商是否有支持图片输入的模型（具体模型能力由前端在 /api/models 里查看） */
  supportsVision: boolean
  /** 服务商默认 Base URL */
  defaultBaseUrl: string
  call(input: ProviderCall): Promise<ProviderResult>
}

/** 从 data URL 拆出 mimeType 与 base64 数据 */
export function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) {
    throw new Error('图片 data URL 格式错误')
  }
  return { mimeType: match[1]!, base64: match[2]! }
}

/**
 * 拼接接口地址：如果 Base URL 已带版本号（/v1、/v1beta、/api/v3 等）则不重复追加。
 */
export function joinEndpoint(baseUrl: string, path: string, version = 'v1'): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  if (!base) throw new Error('Base URL 为空')
  if (/\/v\d+[a-z0-9]*$/i.test(base) || /\/api\/v\d+$/i.test(base)) {
    return `${base}/${path.replace(/^\/+/, '')}`
  }
  return `${base}/${version}/${path.replace(/^\/+/, '')}`
}
