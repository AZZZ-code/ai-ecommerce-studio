import type {
  ImageEndpointConfig,
  ModelEndpointConfig,
  TestConnectionPayload,
  TestConnectionResponse,
  TestConnectionTargetResult,
} from '../../shared/types'
import { resolveEndpoint, testConnection } from './_lib/ai'
import { resolveImageByokConfig, testImageConnection } from './_lib/ai/image'
import { ApiError, keyShapeWarning } from './_lib/errors'
import { jsonOk, readJsonBody, withErrorHandling } from './_lib/http'
import { enforceRateLimit } from './_lib/ratelimit'
import type { Env } from './_lib/types'

type Target = 'vision' | 'text' | 'image'

/**
 * POST /api/test-connection
 * ----------------------------------------------------------------------------
 * 只做"能不能调通"的探测：视觉模型发一张 1x1 图片，文本模型发一句话，
 * 图片模型发一次最小尺寸的生成请求。
 *
 * 不做真正的商品识别 / 文案撰写，也不会把用户的 Key 记到任何地方。
 * 返回结构按 target 拆分，前端可以分别显示"视觉 / 文本 / 图片 模型"的状态。
 *
 * 注意：DeepSeek 只有文本模型，把它选成视觉模型时这里直接给出说明，
 * 不会发图片过去，也不会伪造"连接成功"。
 */
export const onRequestPost = withErrorHandling(async (request: Request, env: Env) => {
  enforceRateLimit(request, env, 'test-connection', 20)

  const body = await readJsonBody<TestConnectionPayload>(request)
  const target = body.target ?? 'both'
  const targets = resolveTargets(target)

  if (targets.includes('vision') && !body.vision) {
    throw new ApiError('BAD_REQUEST', '缺少视觉模型配置。')
  }
  if (targets.includes('text') && !body.text) {
    throw new ApiError('BAD_REQUEST', '缺少文本模型配置。')
  }
  if (targets.includes('image') && !body.image) {
    throw new ApiError('BAD_REQUEST', '缺少图片模型配置。')
  }

  const results: TestConnectionResponse['results'] = {}
  if (targets.includes('vision')) {
    results.vision = await testOne('vision', body.vision, env)
  }
  if (targets.includes('text')) {
    results.text = await testOne('text', body.text, env)
  }
  if (targets.includes('image')) {
    results.image = await testImage(body.image, env)
  }

  const ok = Object.values(results).every((item) => item?.ok)
  const response: TestConnectionResponse = { ok, target, results }
  return jsonOk(response)
})

function resolveTargets(target: TestConnectionPayload['target']): Target[] {
  switch (target) {
    case 'vision':
    case 'text':
    case 'image':
      return [target]
    case 'all':
      return ['vision', 'text', 'image']
    case 'both':
    default:
      return ['vision', 'text']
  }
}

async function testOne(
  kind: 'vision' | 'text',
  endpoint: ModelEndpointConfig | undefined,
  env: Env,
): Promise<TestConnectionTargetResult> {
  const label = kind === 'vision' ? '视觉模型' : '文本模型'
  if (!endpoint) {
    return { ok: false, model: '-', latencyMs: 0, message: `缺少${label}配置。` }
  }

  // DeepSeek 没有视觉模型：不做无意义的调用，明确告诉用户该怎么配
  if (kind === 'vision' && endpoint.provider === 'deepseek') {
    return {
      ok: false,
      model: endpoint.model || 'deepseek-chat',
      latencyMs: 0,
      message: 'DeepSeek 只提供文本模型，不支持图片输入，不能作为视觉模型。',
      sample: '请把视觉模型换成 OpenAI / Gemini / Claude，或直接使用「仅文字生成」。',
    }
  }

  const startedAt = Date.now()
  try {
    const resolved = resolveEndpoint(endpoint, env, label)
    const result = await testConnection(resolved, kind, env)
    return {
      ok: result.ok,
      model: resolved.model,
      latencyMs: Date.now() - startedAt,
      message: result.message,
      sample: result.ok ? result.sample : withKeyShape(result.sample, endpoint.provider, endpoint.apiKey),
    }
  } catch (err) {
    const isApiError = err instanceof ApiError
    return {
      ok: false,
      model: endpoint.model || '-',
      latencyMs: Date.now() - startedAt,
      message: isApiError ? err.message : `调用失败：${err instanceof Error ? err.message : String(err)}`,
      sample: withKeyShape(isApiError ? err.hint : undefined, endpoint.provider, endpoint.apiKey),
    }
  }
}

/** 图片模型：发一次最小尺寸生成请求（512×512、1 张），只用于验证鉴权与地址 */
async function testImage(
  endpoint: ImageEndpointConfig | undefined,
  env: Env,
): Promise<TestConnectionTargetResult> {
  if (!endpoint) {
    return { ok: false, model: '-', latencyMs: 0, message: '缺少图片模型配置。' }
  }
  const startedAt = Date.now()
  try {
    const resolved = resolveImageByokConfig(endpoint, env)
    const result = await testImageConnection(resolved, env)
    return {
      ok: result.ok,
      model: resolved.model,
      latencyMs: Date.now() - startedAt,
      message: result.message,
      sample: result.ok ? result.sample : withKeyShape(result.sample, endpoint.provider, endpoint.apiKey),
    }
  } catch (err) {
    const isApiError = err instanceof ApiError
    return {
      ok: false,
      model: endpoint.model || '-',
      latencyMs: Date.now() - startedAt,
      message: isApiError ? err.message : `调用失败：${err instanceof Error ? err.message : String(err)}`,
      sample: withKeyShape(isApiError ? err.hint : undefined, endpoint.provider, endpoint.apiKey),
    }
  }
}

/** 失败时把「Key 形态不对」这类本地可判断的原因拼到提示里 */
function withKeyShape(sample: string | undefined, provider: string, apiKey: string): string | undefined {
  const shape = keyShapeWarning(provider, apiKey)
  if (!shape) return sample
  return sample ? `${shape} ${sample}` : shape
}
