import type { ProviderId, ProviderOption } from '../../../../shared/types'
import { claudeProvider } from './claude'
import { deepseekProvider } from './deepseek'
import { geminiProvider } from './gemini'
import { createOpenAICompatibleProvider } from './openai'
import type { ProviderAdapter } from './types'

/** Provider 注册表：新增服务商时只需在这里加一行 */
export const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  openai: createOpenAICompatibleProvider('openai', 'OpenAI'),
  deepseek: deepseekProvider,
  gemini: geminiProvider,
  claude: claudeProvider,
  compatible: createOpenAICompatibleProvider('compatible', 'OpenAI 兼容接口'),
}

export function getProvider(id: ProviderId): ProviderAdapter {
  const provider = PROVIDERS[id]
  if (!provider) throw new Error(`未注册的服务商：${id}`)
  return provider
}

/**
 * 服务商能力清单，供 /api/models 与前端模型管理页使用。
 * 模型列表为"常用示例"，用户可以填任意模型名，这里不作为强制约束。
 */
export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    requestFormat: 'POST /v1/chat/completions，Authorization: Bearer <key>，图片用 image_url',
    visionModels: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini', supportsVision: true, notes: '便宜、速度快，适合批量识别' },
      { id: 'gpt-4o', label: 'gpt-4o', supportsVision: true, notes: '识别质量更稳' },
      { id: 'gpt-4.1', label: 'gpt-4.1', supportsVision: true },
      { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', supportsVision: true },
    ],
    textModels: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini', supportsVision: true },
      { id: 'gpt-4o', label: 'gpt-4o', supportsVision: true },
      { id: 'gpt-4.1', label: 'gpt-4.1', supportsVision: true },
      { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', supportsVision: true },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    docsUrl: 'https://ai.google.dev/api/generate-content',
    requestFormat: 'POST /v1beta/models/{model}:generateContent?key=<key>，图片用 inlineData',
    visionModels: [
      { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash', supportsVision: true, notes: '免费额度友好' },
      { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite', supportsVision: true },
      { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash', supportsVision: true },
      { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', supportsVision: true },
    ],
    textModels: [
      { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash', supportsVision: true },
      { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite', supportsVision: true },
      { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro', supportsVision: true },
    ],
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.anthropic.com',
    docsUrl: 'https://docs.anthropic.com/en/api/messages',
    requestFormat: 'POST /v1/messages，x-api-key + anthropic-version，图片用 base64 content block',
    visionModels: [
      { id: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest', supportsVision: true },
      { id: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest', supportsVision: true },
      { id: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest', supportsVision: true },
    ],
    textModels: [
      { id: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest', supportsVision: true },
      { id: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest', supportsVision: true },
      { id: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest', supportsVision: true },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.deepseek.com',
    docsUrl: 'https://api-docs.deepseek.com/api/create-chat-completion',
    requestFormat:
      'POST /chat/completions，Authorization: Bearer <key>。DeepSeek 目前只提供文本模型，不支持图片输入，只能作为「文本模型」使用。',
    // DeepSeek 官方没有视觉模型，这里保持为空数组，前端据此禁用"当作视觉模型"
    visionModels: [],
    textModels: [
      { id: 'deepseek-chat', label: 'deepseek-chat', supportsVision: false, notes: '通用对话模型，速度快、成本低' },
      {
        id: 'deepseek-reasoner',
        label: 'deepseek-reasoner',
        supportsVision: false,
        notes: '推理模型，先思考再作答，不支持 JSON Output 与采样参数',
      },
    ],
  },
  {
    id: 'compatible',
    label: 'OpenAI 兼容接口',
    requiresBaseUrl: true,
    defaultBaseUrl: '',
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    requestFormat:
      '复用 OpenAI Chat Completions 格式（不带 response_format）。适用于 DeepSeek、通义千问、智谱、Moonshot、自建网关等。',
    visionModels: [
      { id: 'qwen-vl-max', label: 'qwen-vl-max（通义）', supportsVision: true },
      { id: 'glm-4v-plus', label: 'glm-4v-plus（智谱）', supportsVision: true },
      { id: 'moonshot-v1-8k-vision-preview', label: 'moonshot-v1-8k-vision-preview', supportsVision: true },
      { id: 'doubao-vision-pro-32k', label: 'doubao-vision-pro-32k（火山）', supportsVision: true },
    ],
    textModels: [
      { id: 'deepseek-chat', label: 'deepseek-chat', supportsVision: false },
      { id: 'qwen-plus', label: 'qwen-plus', supportsVision: false },
      { id: 'glm-4-plus', label: 'glm-4-plus', supportsVision: false },
      { id: 'moonshot-v1-8k', label: 'moonshot-v1-8k', supportsVision: false },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*                        视觉模型能力判断（硬约束）                          */
/* -------------------------------------------------------------------------- */

/** 明确不支持图片输入的模型特征（命中即禁止作为视觉模型） */
const NON_VISION_PATTERNS = [
  /embedding/i,
  /tts/i,
  /whisper/i,
  /moderation/i,
  /^o1-mini/i,
  /^o1-preview/i,
  /^o3-mini/i,
  /deepseek-chat/i,
  /deepseek-reasoner/i,
  /deepseek-coder/i,
  /^glm-4-plus/i,
  /^glm-4-flash/i,
  /^moonshot-v1-\d+k$/i,
  /^qwen-(plus|turbo|max)$/i,
  /^gpt-3\.5/i,
  /^text-/i,
]

/** 明确支持图片输入的模型特征 */
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

export interface VisionSupportVerdict {
  supported: boolean
  reason?: string
}

/**
 * 判断某个模型能否作为「视觉模型」使用。
 * 规则：先看显式允许名单（环境变量），再看明确不支持名单，
 * 最后：官方三家服务商默认允许，OpenAI 兼容接口必须命中视觉模型特征。
 */
export function checkVisionSupport(
  provider: ProviderId,
  model: string,
  allowlist: string[] = [],
): VisionSupportVerdict {
  const name = model.trim()
  if (!name) return { supported: false, reason: '请填写视觉模型名称。' }

  // 硬约束：DeepSeek 只提供文本模型，即使被写进允许名单也不放行
  if (provider === 'deepseek') {
    return {
      supported: false,
      reason: `DeepSeek 的 ${name} 是纯文本模型，不支持图片输入，不能作为视觉模型使用。`,
    }
  }

  if (allowlist.some((item) => item && (name === item || name.startsWith(item)))) {
    return { supported: true }
  }
  if (NON_VISION_PATTERNS.some((pattern) => pattern.test(name))) {
    return {
      supported: false,
      reason: `模型 ${name} 属于纯文本 / 非视觉模型，不能用于图片识别。请换用支持图片输入的模型。`,
    }
  }
  if (VISION_PATTERNS.some((pattern) => pattern.test(name))) {
    return { supported: true }
  }
  if (provider === 'openai' || provider === 'gemini' || provider === 'claude') {
    // 官方服务商的新模型命名无法穷举，默认放行，由真实调用结果兜底
    return { supported: true }
  }
  return {
    supported: false,
    reason: `无法确认 ${name} 是否支持图片输入。请使用名称中带 vision / vl 的模型，或在服务端 VISION_MODEL_ALLOWLIST 中加入该模型。`,
  }
}

/**
 * 统一接口：返回所有服务商与其可用模型（供 /api/models 与前端使用）。
 * 只返回模型名称与能力标记，不涉及任何 Key。
 */
export function getAvailableModels(): ProviderOption[] {
  return PROVIDER_OPTIONS
}
