import type { SeoKeywordResponse } from '../../shared/types'
import { PLATFORM_COPY_FORMATS } from '../../shared/types'
import { PLATFORM_META } from '../../shared/types'
import { resolveByokConfig, resolvePlatformConfig, runText, type ResolvedConfig } from './_lib/ai'
import { extractJsonObject } from './_lib/ai/json'
import { ApiError } from './_lib/errors'
import { jsonOk, readJsonBody, withErrorHandling } from './_lib/http'
import { enforceRateLimit } from './_lib/ratelimit'
import {
  SEO_SYSTEM_PROMPT,
  buildSeoPrompt,
  normalizeCopyBlocks,
  normalizeSeoResult,
} from './_lib/seoPrompts'
import type { Env } from './_lib/types'
import { validateSeoPayload } from './_lib/validate'

/**
 * POST /api/seo-keywords
 * ----------------------------------------------------------------------------
 * 分类关键词（10 类）+ 平台差异化文案块。
 *
 * 说明：
 *  - 关键词完全由文本模型基于商品信息生成，返回的是「AI 相关性建议」；
 *    响应里不会有任何搜索量 / 排名 / 竞争度 / 转化率字段，因为本项目没有接入
 *    真实关键词数据服务，也不允许编造这些指标。
 *  - 每类关键词都带 intent / placement / importance / needsReview，
 *    前端据此做编辑、复制与人工确认提示。
 */
export const onRequestPost = withErrorHandling(async (request: Request, env: Env) => {
  enforceRateLimit(request, env, 'seo-keywords', 10)

  const raw = await readJsonBody<unknown>(request)
  const payload = validateSeoPayload(raw)

  let config: ResolvedConfig | null
  if (payload.mode === 'byok') {
    if (!payload.modelConfig) {
      throw new ApiError('INVALID_MODEL_CONFIG', '缺少文本模型配置（modelConfig）。')
    }
    config = resolveByokConfig(payload.modelConfig, env, { requireVision: false })
  } else {
    config = resolvePlatformConfig(env)
    if (!config) {
      throw new ApiError('NO_MODEL_CONFIG', '平台尚未配置默认文本模型，暂时无法生成关键词。', {
        hint: '可在「AI 模型设置」里填写自己的文本模型 Key，或先使用演示模式。',
        retryable: false,
      })
    }
  }

  const prompt = buildSeoPrompt(payload)
  const started = Date.now()
  const result = await runText(config.text, {
    system: SEO_SYSTEM_PROMPT,
    prompt,
    env,
    jsonMode: true,
  })

  let parsed: unknown
  try {
    parsed = extractJsonObject(result.text)
  } catch {
    throw new ApiError('BAD_MODEL_OUTPUT', '模型返回的关键词不是合法 JSON。', {
      hint: '可换一个支持 JSON 输出的文本模型（如 deepseek-chat / gpt-4o-mini）重试。',
      retryable: true,
    })
  }

  let normalized: ReturnType<typeof normalizeSeoResult>
  try {
    normalized = normalizeSeoResult(parsed, payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : '模型没有返回可用关键词'
    throw new ApiError('BAD_MODEL_OUTPUT', `关键词解析失败：${message}。`, { retryable: true })
  }

  const copyBlocks = normalizeCopyBlocks(parsed, payload.platform)
  const warnings = [...normalized.warnings]
  const platform = PLATFORM_META[payload.platform]
  warnings.push(
    `平台：${platform.label}（${platform.region}）；文案块按该平台格式生成：${PLATFORM_COPY_FORMATS[payload.platform]
      .map((item: { label: string }) => item.label)
      .join(' / ')}。`,
  )
  warnings.push('关键词是 AI 相关性建议，未提交任何平台的官方审核，也不代表实际搜索排名。')
  if (copyBlocks.every((block) => !block.content)) {
    warnings.push('模型没有填写平台文案块，可点「重新生成」或补充商品信息后重试。')
  }

  const body: SeoKeywordResponse = {
    ok: true,
    mode: 'live',
    platform: payload.platform,
    groups: normalized.groups,
    copyBlocks,
    coverage: normalized.coverage,
    warnings,
    meta: {
      provider: config.text.provider,
      model: result.model ?? config.text.model,
      latencyMs: result.latencyMs || Date.now() - started,
      accessMode: payload.mode,
      generatedAt: new Date().toISOString(),
    },
  }
  return jsonOk(body)
})
