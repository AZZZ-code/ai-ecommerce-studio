/**
 * 统一模型适配层出口。
 * 上层只从这里导入，不直接依赖具体厂商实现。
 */
export type { ProviderAdapter, ProviderCall, ProviderResult } from './types'
export {
  PROVIDERS,
  PROVIDER_OPTIONS,
  getAvailableModels,
  getProvider,
  checkVisionSupport,
} from './catalog'
export {
  DEEPSEEK_DEFAULT_BASE_URL,
  DEEPSEEK_TEXT_MODELS,
  buildDeepSeekRequestBody,
  buildDeepSeekUrl,
  deepseekProvider,
  isDeepSeekReasoner,
  mapDeepSeekError,
  parseDeepSeekResponse,
} from './deepseek'
export { extractJsonObject } from './json'
export {
  generateText,
  resolvePlatformConfig,
  resolveByokConfig,
  resolveEndpoint,
  runVision,
  runText,
  testConnection,
  type ResolvedConfig,
  type ResolvedEndpoint,
} from './router'
