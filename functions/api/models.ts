import type { ModelCatalog } from '../../shared/types'
import { MAX_UPLOAD_BYTES, ACCEPTED_MIME_TYPES } from '../../shared/types'
import { PROVIDER_OPTIONS, resolvePlatformConfig } from './_lib/ai'
import { getImageProviderOptions, resolveImagePlatformConfig } from './_lib/ai/image'
import { jsonOk, withErrorHandling } from './_lib/http'
import { rateLimitInfo } from './_lib/ratelimit'
import type { Env } from './_lib/types'

/**
 * GET /api/models
 * ----------------------------------------------------------------------------
 * 返回服务商 / 模型能力清单 + 平台默认 API 是否就绪（文本模型与图片模型分开）。
 * 永远不会返回任何 API Key，只返回"是否已配置"以及模型名。
 */
export const onRequestGet = withErrorHandling(async (_request: Request, env: Env) => {
  const platform = resolvePlatformConfig(env)
  const image = resolveImagePlatformConfig(env)

  const catalog: ModelCatalog = {
    providers: PROVIDER_OPTIONS,
    imageProviders: getImageProviderOptions(),
    platformDefault: {
      configured: Boolean(platform),
      vision: platform?.vision ? { provider: platform.vision.provider, model: platform.vision.model } : null,
      text: platform ? { provider: platform.text.provider, model: platform.text.model } : null,
    },
    imagePlatformDefault: {
      configured: Boolean(image),
      provider: image ? image.provider : null,
      model: image ? image.model : null,
    },
    demoMode: true,
    limits: {
      maxUploadBytes: MAX_UPLOAD_BYTES,
      acceptedMimeTypes: [...ACCEPTED_MIME_TYPES],
      rateLimitPerMinute: rateLimitInfo(env),
    },
  }

  return jsonOk(catalog)
})
