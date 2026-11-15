/**
 * 本地偏好持久化
 * ----------------------------------------------------------------------------
 * 只保存"非密钥"配置：接入模式、平台、风格、语言、服务商、Base URL、模型名称、
 * 图片模型的画质与输出格式。
 *
 * API Key（文本 / 视觉 / 图片）永远不写入 localStorage / sessionStorage /
 * IndexedDB / Cookie，只存在于 React 内存状态中，请求结束后随组件状态销毁。
 */
import type {
  AccessMode,
  CopyStyleId,
  ImageEndpointConfig,
  ImageFormatId,
  ImageProviderId,
  ImageQualityId,
  LanguageMode,
  ModelEndpointConfig,
  PlatformId,
  ProviderId,
} from '@/types'

const STORAGE_KEY = 'productai:preferences:v1'

export interface StoredEndpoint {
  provider: ProviderId
  baseUrl: string
  model: string
}

export interface StoredImageEndpoint {
  provider: ImageProviderId
  baseUrl: string
  model: string
  quality: ImageQualityId
  format: ImageFormatId
}

export interface StoredPreferences {
  mode: AccessMode
  platform: PlatformId
  style: CopyStyleId
  language: LanguageMode
  vision: StoredEndpoint
  text: StoredEndpoint
  image: StoredImageEndpoint
  /** 没有配置任何真实 Key 时是否自动使用演示模式 */
  demoFallback: boolean
}

export const DEFAULT_PREFERENCES: StoredPreferences = {
  mode: 'platform',
  platform: 'taobao',
  style: 'professional',
  language: 'bilingual',
  vision: { provider: 'openai', baseUrl: '', model: 'gpt-4o-mini' },
  text: { provider: 'openai', baseUrl: '', model: 'gpt-4o-mini' },
  image: { provider: 'openai-image', baseUrl: '', model: 'gpt-image-1', quality: 'standard', format: 'png' },
  demoFallback: true,
}

export function loadPreferences(): StoredPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      vision: { ...DEFAULT_PREFERENCES.vision, ...(parsed.vision ?? {}) },
      text: { ...DEFAULT_PREFERENCES.text, ...(parsed.text ?? {}) },
      image: { ...DEFAULT_PREFERENCES.image, ...(parsed.image ?? {}) },
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePreferences(prefs: StoredPreferences): void {
  if (typeof window === 'undefined') return
  try {
    // 显式只取白名单字段，防止未来误把 apiKey 一起写进去
    const sanitized: StoredPreferences = {
      mode: prefs.mode,
      platform: prefs.platform,
      style: prefs.style,
      language: prefs.language,
      vision: {
        provider: prefs.vision.provider,
        baseUrl: prefs.vision.baseUrl,
        model: prefs.vision.model,
      },
      text: {
        provider: prefs.text.provider,
        baseUrl: prefs.text.baseUrl,
        model: prefs.text.model,
      },
      image: {
        provider: prefs.image.provider,
        baseUrl: prefs.image.baseUrl,
        model: prefs.image.model,
        quality: prefs.image.quality,
        format: prefs.image.format,
      },
      demoFallback: prefs.demoFallback,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
  } catch {
    // 隐私模式下 localStorage 可能不可写，属于可忽略的降级
  }
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** 从存储的端点 + 内存中的 key 组装成请求用的配置 */
export function toEndpointConfig(stored: StoredEndpoint, apiKey: string): ModelEndpointConfig {
  return {
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey,
    model: stored.model,
  }
}

/** 图片模型的请求配置（Key 同样只来自内存） */
export function toImageEndpointConfig(
  stored: StoredImageEndpoint,
  apiKey: string,
): ImageEndpointConfig {
  return {
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey,
    model: stored.model,
    quality: stored.quality,
    format: stored.format,
  }
}
