import type { GeneratedImage, ImageGenerateResponse } from '../../shared/types'
import { IMAGE_FORMAT_META, IMAGE_TYPE_META } from '../../shared/types'
import {
  generateImages,
  getImageProvider,
  resolveImageByokConfig,
  resolveImagePlatformConfig,
  type ResolvedImageConfig,
} from './_lib/ai/image'
import { ApiError } from './_lib/errors'
import { jsonOk, withErrorHandling } from './_lib/http'
import { buildImagePrompt } from './_lib/imagePrompts'
import { enforceRateLimit } from './_lib/ratelimit'
import type { Env } from './_lib/types'
import { toDataUrl, validateImage, validateImagePayload } from './_lib/validate'

/**
 * POST /api/generate-image
 * ----------------------------------------------------------------------------
 * multipart/form-data:
 *   image   : File（商品原图，JPG/PNG/WEBP，≤5MB）
 *   payload : JSON 字符串（ImageGeneratePayload）
 *
 * 职责：把「平台规范 + 图片类型 + 保真模式 + 商品信息」组装成提示词，
 * 交给图片模型生成效果图，并把结果以 data URL 返回给前端展示 / 下载。
 *
 * 安全：
 *  - BYOK 的图片 Key 只在本次请求的作用域内存在，用完即丢弃；
 *  - 自定义 Base URL 走与文本模型相同的 SSRF 白名单校验；
 *  - 响应与日志里不出现任何 Key（上游错误信息会先脱敏）。
 */
export const onRequestPost = withErrorHandling(async (request: Request, env: Env) => {
  enforceRateLimit(request, env, 'generate-image', 6)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new ApiError('BAD_REQUEST', '请求格式错误：需要使用 multipart/form-data 上传。')
  }

  const payloadRaw = form.get('payload')
  if (typeof payloadRaw !== 'string' || !payloadRaw.trim()) {
    throw new ApiError('BAD_REQUEST', '缺少请求参数 payload。')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadRaw)
  } catch {
    throw new ApiError('BAD_REQUEST', 'payload 不是合法的 JSON。')
  }

  const payload = validateImagePayload(parsed)

  const imageEntry = form.get('image')
  const hasImage = imageEntry !== null && typeof imageEntry !== 'string'
  // 保真模式必须有原图：没有原图就无法"保留商品真实外观"
  if (!hasImage && payload.fidelity === 'fidelity') {
    throw new ApiError('BAD_REQUEST', '商品保真模式需要上传商品原图，否则无法保证商品外观一致。', {
      hint: '上传一张清晰的商品图，或切换到「创意营销模式」做纯文生图。',
    })
  }
  const image = hasImage ? await validateImage(imageEntry as File) : null

  let config: ResolvedImageConfig | null = null
  if (payload.mode === 'byok') {
    if (!payload.modelConfig) {
      throw new ApiError('INVALID_MODEL_CONFIG', '缺少图片模型配置（modelConfig）。')
    }
    config = resolveImageByokConfig(payload.modelConfig, env)
  } else {
    config = resolveImagePlatformConfig(env)
    if (!config) {
      throw new ApiError('NO_IMAGE_MODEL', '平台尚未配置图片生成模型，暂时无法真实生成图片。', {
        hint: '可在「AI 模型设置」里填写自己的图片模型 Key，或先使用演示模式查看效果。',
        retryable: false,
      })
    }
  }

  const { prompt, negativePrompt, warnings } = buildImagePrompt({
    platform: payload.platform,
    imageType: payload.imageType,
    fidelity: payload.fidelity,
    product: payload.product,
    analysis: payload.analysis ?? null,
    userPrompt: payload.prompt,
    width: payload.width,
    height: payload.height,
  })

  const adapter = getImageProvider(config.provider)
  if (image && !adapter.supportsImageEditing) {
    warnings.push(`${adapter.label} 不支持传入原图，本次是按文字描述生成的图片，商品细节可能与原图不同。`)
  }

  const started = Date.now()
  const result = await generateImages(
    config,
    {
      prompt,
      negativePrompt,
      imageDataUrl: image ? toDataUrl(image) : undefined,
      width: payload.width,
      height: payload.height,
      count: payload.count ?? 1,
    },
    env,
  )

  const format = IMAGE_FORMAT_META[config.format]
  const images: GeneratedImage[] = result.images.map((item, index) => ({
    id: `img-${Date.now()}-${index}`,
    url: item.base64 ? `data:${item.mimeType};base64,${item.base64}` : (item.url ?? ''),
    demo: false,
    width: payload.width,
    height: payload.height,
    format: config!.format,
    prompt,
    createdAt: new Date().toISOString(),
  }))

  if (images.some((item) => !item.url)) {
    throw new ApiError('IMAGE_GENERATION_FAILED', '图片模型返回了空数据，请重试或换一个模型。')
  }

  warnings.push(
    `生成参数：${payload.width}×${payload.height}，${IMAGE_TYPE_META[payload.imageType].label}，${
      payload.fidelity === 'fidelity' ? '商品保真模式' : '创意营销模式'
    }，输出 ${format.label}。`,
  )

  // 有的图片服务商一次只返回一张图，这里如实说明，避免"要 4 张只给 1 张"的困惑
  if (images.length < (payload.count ?? 1)) {
    warnings.push(
      `本次请求 ${payload.count ?? 1} 张，模型只返回了 ${images.length} 张（部分服务商不支持一次多图，可再次生成）。`,
    )
  }

  const body: ImageGenerateResponse = {
    ok: true,
    mode: 'live',
    platform: payload.platform,
    imageType: payload.imageType,
    fidelity: payload.fidelity,
    images,
    prompt,
    negativePrompt,
    meta: {
      provider: config.provider,
      model: result.model ?? config.model,
      quality: config.quality,
      format: config.format,
      width: payload.width,
      height: payload.height,
      latencyMs: result.latencyMs || Date.now() - started,
      accessMode: payload.mode,
    },
    warnings,
  }
  return jsonOk(body)
})
