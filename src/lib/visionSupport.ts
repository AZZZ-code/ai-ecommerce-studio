import type { ModelCatalog, ProviderId, ProviderOption } from '@/types'

/**
 * 前端侧"模型能不能看图"的判断
 * ----------------------------------------------------------------------------
 * 与后端 checkVisionSupport 保持同一结论，用于在用户点"生成"之前就给出提示，
 * 避免出现"图片发出去了但模型根本不支持"的情况。
 *
 * 重要：DeepSeek 只有文本模型，永远不能作为视觉模型 —— 这里不留任何余地，
 * 即使模型名里带 vision 也一律拒绝。
 */
export interface VisionVerdict {
  supported: boolean
  /** 不支持时的原因（中文，可直接展示） */
  reason?: string
}

/** 明确不支持图片的模型特征（与后端规则保持一致） */
const NON_VISION_PATTERNS = [
  /embedding/i,
  /tts/i,
  /whisper/i,
  /moderation/i,
  /^o1-mini/i,
  /^o1-preview/i,
  /^o3-mini/i,
  /deepseek/i,
  /^deepseek/i,
  /^glm-4-plus/i,
  /^glm-4-flash/i,
  /^moonshot-v1-\d+k$/i,
  /^qwen-(plus|turbo|max)$/i,
  /^gpt-3\.5/i,
  /^text-/i,
]

const VISION_PATTERNS = [
  /gpt-4o/i,
  /gpt-4\.1/i,
  /gpt-4-turbo/i,
  /gpt-4-vision/i,
  /^gemini-/i,
  /^claude-3/i,
  /^claude-4/i,
  /-vl/i,
  /vl-/i,
  /vision/i,
  /^glm-4v/i,
  /^llava/i,
  /^pixtral/i,
  /^internvl/i,
  /^step-1v/i,
]

export function findProvider(catalog: ModelCatalog | null, id: ProviderId | string) {
  return catalog?.providers.find((item) => item.id === id)
}

/** 判断某服务商的某个模型能否作为视觉模型 */
export function judgeVision(provider: ProviderOption | undefined, model: string): VisionVerdict {
  const name = model.trim()
  if (!provider) return { supported: false, reason: '未知服务商，无法判断模型能力。' }
  if (provider.id === 'deepseek') {
    return {
      supported: false,
      reason: 'DeepSeek 只提供文本模型（deepseek-chat / deepseek-reasoner），不支持图片输入，不能作为视觉模型。',
    }
  }
  if (!name) return { supported: false, reason: '请先在「AI 模型设置」里填写视觉模型名称。' }
  if (provider.visionModels.length === 0) {
    return { supported: false, reason: `${provider.label} 没有可用的视觉模型，不能做图片识别。` }
  }
  if (provider.visionModels.some((item) => item.id === name)) return { supported: true }
  if (NON_VISION_PATTERNS.some((pattern) => pattern.test(name))) {
    return { supported: false, reason: `模型 ${name} 是纯文本模型，不能接收图片输入。` }
  }
  if (VISION_PATTERNS.some((pattern) => pattern.test(name))) return { supported: true }
  if (provider.id === 'compatible') {
    return {
      supported: false,
      reason: `无法确认 ${name} 是否支持图片输入。请使用名称中带 vision / vl 的模型，或换用 OpenAI / Gemini / Claude。`,
    }
  }
  // 官方服务商的新模型命名无法穷举，默认放行，由后端真实调用兜底
  return { supported: true }
}

/** 该服务商是否提供任何视觉模型 */
export function providerHasVision(provider: ProviderOption | undefined): boolean {
  return Boolean(provider && provider.id !== 'deepseek' && provider.visionModels.length > 0)
}
