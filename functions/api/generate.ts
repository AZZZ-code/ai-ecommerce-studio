import type { GenerateResponse, VisionAnalysis } from '../../shared/types'
import {
  PROVIDER_OPTIONS,
  resolveByokConfig,
  resolvePlatformConfig,
  runText,
  runVision,
  type ResolvedConfig,
} from './_lib/ai'
import { extractJsonObject } from './_lib/ai/json'
import { ApiError } from './_lib/errors'
import { jsonOk, withErrorHandling } from './_lib/http'
import {
  COPY_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
  buildCopyPrompt,
  buildSectionPrompt,
  buildTextOnlyAnalysis,
  buildVisionPrompt,
  normalizeAnalysis,
  normalizeCopyResult,
} from './_lib/prompts'
import { enforceRateLimit } from './_lib/ratelimit'
import type { Env, UploadedImage } from './_lib/types'
import { toDataUrl, validateGeneratePayload, validateImage } from './_lib/validate'

/**
 * POST /api/generate
 * ----------------------------------------------------------------------------
 * multipart/form-data:
 *   image   : File（JPG/PNG/WEBP，≤5MB）——「仅文字生成」时可省略
 *   payload : JSON 字符串（GeneratePayload，必填）
 *
 * 流程：校验参数 → 校验文件（如有）→ 解析模型配置（A/B 模式）→ 视觉识别 → 文案生成
 * 安全：BYOK 的 apiKey 只在本函数作用域内存在，函数返回即被 GC，不写日志、不进响应。
 *
 * 两种生成方式：
 *  - 默认（图片识别 + 文案）：先调用视觉模型，再把识别结果交给文本模型；
 *  - skipVision=true（仅文字生成）：不调用视觉模型，也不把图片发送给任何模型，
 *    适用于文本模型不支持图片输入的场景（如 DeepSeek）。
 */
export const onRequestPost = withErrorHandling(async (request: Request, env: Env) => {
  enforceRateLimit(request, env, 'generate', 12)

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('BAD_REQUEST', '请求必须使用 multipart/form-data 上传图片和参数。')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new ApiError('BAD_REQUEST', '表单解析失败，请重新上传图片。')
  }

  const rawPayload = form.get('payload')
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) {
    throw new ApiError('BAD_REQUEST', '缺少 payload 参数。')
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(rawPayload)
  } catch {
    throw new ApiError('BAD_REQUEST', 'payload 不是合法的 JSON。')
  }

  const payload = validateGeneratePayload(parsedPayload)
  const skipVision = payload.skipVision === true

  // ---- 图片可选：仅文字生成 / 单模块重生成时都可以不带图片 ----
  const imageEntry = form.get('image')
  let image: UploadedImage | null = null
  if (imageEntry && typeof imageEntry !== 'string') {
    image = await validateImage(imageEntry)
  }
  const needsVisionCall = !skipVision && !(payload.reuseAnalysis && payload.regenerateSection)
  if (needsVisionCall && !image) {
    throw new ApiError('BAD_REQUEST', '没有收到图片文件（字段名应为 image）。', {
      hint: '如需只按文字生成，请打开「仅文字生成」开关；否则请上传一张 JPG / PNG / WEBP 商品图。',
    })
  }

  // ---- 解析模型配置：A = 平台默认，B = 用户自带 ----
  let config: ResolvedConfig | null
  if (payload.mode === 'byok') {
    if (!payload.modelConfig) {
      throw new ApiError('INVALID_MODEL_CONFIG', '缺少模型配置（modelConfig）。')
    }
    config = resolveByokConfig(payload.modelConfig, env, { requireVision: !skipVision })
  } else {
    config = resolvePlatformConfig(env)
  }

  if (!config) {
    throw new ApiError(
      'NO_MODEL_CONFIG',
      '平台尚未配置默认 AI 模型，暂时无法进行真实识别。',
      {
        hint: '你可以在「AI 模型设置」里填写自己的 API Key（仅本次请求使用），或先使用演示模式体验完整流程。',
      },
    )
  }

  const startedAt = Date.now()
  const warnings: string[] = []

  // ---- 1. 图片识别（仅文字生成 / 重新生成单模块时跳过） ----
  let analysis: VisionAnalysis | null = payload.reuseAnalysis ?? null
  let visionUsed = false

  if (skipVision) {
    if (!analysis) analysis = buildTextOnlyAnalysis(payload)
    warnings.push(
      '本次为「仅文字生成」：没有调用图片识别，文案完全基于你填写的商品信息；未填写的属性以 [待补充：xxx] 标出。',
    )
    if (image) warnings.push('图片没有发送给任何模型（当前为仅文字生成模式）。')
  } else if (needsVisionCall) {
    if (!config.vision) {
      throw new ApiError(
        'NO_VISION_MODEL',
        '当前配置里没有支持图片输入的视觉模型，无法识别图片。',
        {
          hint: '文本模型（如 DeepSeek）不能识别图片。请把视觉模型换成 OpenAI / Gemini / Claude，或打开「仅文字生成」直接按商品信息写文案。',
        },
      )
    }
    const visionResult = await runVision(config.vision, {
      system: VISION_SYSTEM_PROMPT,
      prompt: buildVisionPrompt(payload),
      imageDataUrl: toDataUrl(image as UploadedImage),
      env,
    })
    analysis = normalizeAnalysis(extractJsonObject(visionResult.text))
    visionUsed = true
  }

  if (!analysis) {
    // 理论上不会走到这里，兜底避免后续空指针
    analysis = buildTextOnlyAnalysis(payload)
  }

  if (!analysis.category || analysis.category === '待补充') {
    warnings.push('没有明确的商品类别，建议在补充信息里填写「商品类别」，文案会更聚焦。')
  }
  if (analysis.unconfirmedAttributes.length > 0) {
    warnings.push(
      `有 ${analysis.unconfirmedAttributes.length} 项属性无法确认：${analysis.unconfirmedAttributes
        .slice(0, 4)
        .join('、')}。补充后文案会更准确。`,
    )
  }
  if (!payload.product.material && !payload.product.size) {
    warnings.push('未填写材质与尺寸，文案不会编造这两项信息，相关位置会保留占位提示。')
  }

  // ---- 2. 文案生成 ----
  const prompt = payload.regenerateSection
    ? buildSectionPrompt(payload, analysis, payload.regenerateSection)
    : buildCopyPrompt(payload, analysis)

  const textResult = await runText(config.text, {
    system: COPY_SYSTEM_PROMPT,
    prompt,
    env,
    temperature: payload.style === 'concise' ? 0.5 : 0.85,
  })

  const copy = normalizeCopyResult(extractJsonObject(textResult.text))

  // 重新生成单模块时，只保留目标模块，其余交由前端合并
  if (payload.regenerateSection) {
    copy.sections = copy.sections.filter((section) => section.key === payload.regenerateSection)
  }

  const labelOf = (provider: string) =>
    PROVIDER_OPTIONS.find((item) => item.id === provider)?.label ?? provider
  const textProviderLabel = labelOf(config.text.provider)

  const visionModelLabel = visionUsed && config.vision
    ? config.vision.model
    : skipVision
      ? '未使用（仅文字生成）'
      : '复用上次识别结果'

  const response: GenerateResponse = {
    ok: true,
    mode: 'live',
    data: { analysis, copy },
    meta: {
      provider: visionUsed && config.vision ? config.vision.provider : config.text.provider,
      visionModel: visionModelLabel,
      textModel: config.text.model,
      latencyMs: Date.now() - startedAt,
      accessMode: config.accessMode,
      generatedAt: new Date().toISOString(),
    },
    warnings: [
      ...warnings,
      visionUsed && config.vision
        ? `视觉识别服务商：${labelOf(config.vision.provider)}；文案服务商：${textProviderLabel}。`
        : `文案服务商：${textProviderLabel}（本次未做图片识别）。`,
    ],
  }

  return jsonOk(response)
})
