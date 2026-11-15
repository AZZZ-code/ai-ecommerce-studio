import type { ImageFormatId, ImageProviderId } from '../../../../../shared/types'

/**
 * 图片生成适配层统一契约
 * ----------------------------------------------------------------------------
 * 与文本适配层（ai/types.ts）刻意分开：图片模型和文本模型是两套完全不同的
 * 请求/响应格式，混在一个接口里会让差异泄漏到上层。
 *
 *   ImageCallInput  → 各 Provider 自己的 HTTP 请求
 *   ImageCallResult → 统一的 base64 / url 列表
 */
export interface ImageCallInput {
  /** 已通过 SSRF 白名单校验的 Base URL */
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
  /** 负向提示（部分服务商不支持，由各适配器决定如何处理） */
  negativePrompt?: string
  /** 商品原图 data URL；为空表示纯文生图 */
  imageDataUrl?: string
  width: number
  height: number
  quality: 'standard' | 'high'
  format: ImageFormatId
  timeoutMs: number
  /** 本次需要生成的图片数量 */
  count?: number
}

export interface ImageCallResult {
  images: { base64?: string; url?: string; mimeType: string }[]
  latencyMs: number
  model?: string
  /** 上游返回原文（截断后，便于排查） */
  raw?: string
}

export interface ImageProviderAdapter {
  id: ImageProviderId
  label: string
  /** 服务商默认 Base URL */
  defaultBaseUrl: string
  /** 是否支持把原图作为输入（图生图 / 编辑） */
  supportsImageEditing: boolean
  generate(input: ImageCallInput): Promise<ImageCallResult>
}

/** 把任意宽高映射成 3 种常见尺寸（部分服务商只接受固定尺寸） */
export function pickSizePreset(width: number, height: number): '1024x1024' | '1024x1536' | '1536x1024' {
  const ratio = width / Math.max(1, height)
  if (ratio > 1.15) return '1536x1024'
  if (ratio < 0.87) return '1024x1536'
  return '1024x1024'
}

/** 统一从 data URL 里取 mimeType，取不到时给 png */
export function mimeFromDataUrl(dataUrl: string | undefined): string {
  if (!dataUrl) return 'image/png'
  const match = /^data:([^;,]+);base64,/.exec(dataUrl)
  return match?.[1] ?? 'image/png'
}
