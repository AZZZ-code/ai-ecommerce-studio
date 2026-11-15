import type {
  ApiErrorBody,
  GeneratePayload,
  GenerateResponse,
  ImageGeneratePayload,
  ImageGenerateResponse,
  ModelCatalog,
  SeoKeywordPayload,
  SeoKeywordResponse,
  TestConnectionPayload,
  TestConnectionResponse,
} from '@/types'

/**
 * 前端 API 客户端
 * ----------------------------------------------------------------------------
 * 只做三件事：拼 URL、带超时、把后端 JSON 错误转成可展示的异常。
 * 所有密钥都在请求体里透传一次，前端不做任何持久化。
 */

export class ApiClientError extends Error {
  readonly code: string
  readonly hint?: string
  readonly retryable: boolean
  readonly status: number

  constructor(
    message: string,
    options: { code?: string; hint?: string; retryable?: boolean; status?: number } = {},
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = options.code ?? 'NETWORK_ERROR'
    this.hint = options.hint
    this.retryable = options.retryable ?? true
    this.status = options.status ?? 0
  }
}

async function fetchJson<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(path, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('请求超时，AI 处理时间过长。请重试或换用更快的模型。', {
        code: 'CLIENT_TIMEOUT',
      })
    }
    // 这里是「浏览器连不上本站 /api」的失败，与「后端连不上模型服务商」完全不同，
    // 所以文案必须能让人分辨出来，并给出可直接照做的排查步骤。
    throw new ApiClientError(`连不上本站后端接口（${path}）。`, {
      code: 'NETWORK_ERROR',
      hint:
        '这通常是下面三种情况之一：1）本地开发服务没在运行 —— 请在项目根目录执行 npm run dev；' +
        '2）直接双击打开了 dist/index.html（file:// 协议下没有 /api）；3）部署环境或反向代理没有把 /api/* 转发到 Pages Functions。' +
        '改正后刷新页面再试。注意：这一步失败与模型服务商无关，Key 还没被使用。',
    })
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    throw new ApiClientError(`服务端返回了非 JSON 响应（HTTP ${response.status}）。`, {
      code: 'BAD_RESPONSE',
      status: response.status,
    })
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null
    const error = errorBody?.error
    throw new ApiClientError(error?.message ?? `请求失败（HTTP ${response.status}）。`, {
      code: error?.code ?? 'HTTP_ERROR',
      hint: error?.hint,
      retryable: error?.retryable ?? true,
      status: response.status,
    })
  }

  return body as T
}

export interface HealthResponse {
  ok: boolean
  runtime: string
  available: { text: boolean; vision: boolean; image: boolean }
  platformDefaultConfigured: boolean
  rateLimitPerMinute: number
  time: string
}

/**
 * GET /api/health —— 「本站后端是否可达」的独立探针。
 * 作用：把「页面连不上自己的后端」和「后端连不上模型服务商」这两类失败彻底分开。
 */
export function checkHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/api/health', { method: 'GET' }, 8_000)
}

/** GET /api/models —— 获取服务商与模型能力清单 */
export function fetchModelCatalog(): Promise<ModelCatalog> {
  return fetchJson<ModelCatalog>('/api/models', { method: 'GET' }, 15_000)
}

export interface GenerateRequest {
  /** 「仅文字生成」时可以不传图片（此时后端不会调用视觉模型） */
  image?: File | null
  payload: GeneratePayload
}

/** POST /api/generate —— 图片识别 + 文案生成（multipart） */
export function generateCopy({ image, payload }: GenerateRequest): Promise<GenerateResponse> {
  const form = new FormData()
  if (image) form.append('image', image, image.name)
  form.append('payload', JSON.stringify(payload))
  return fetchJson<GenerateResponse>('/api/generate', { method: 'POST', body: form }, 120_000)
}

/** POST /api/test-connection —— 连接测试（可分别测视觉 / 文本 / 图片模型） */
export function testConnection(payload: TestConnectionPayload): Promise<TestConnectionResponse> {
  return fetchJson<TestConnectionResponse>(
    '/api/test-connection',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    120_000,
  )
}

export interface ImageGenerateRequest {
  /** 商品原图；创意模式下可以不传 */
  image?: File | null
  payload: ImageGeneratePayload
}

/**
 * POST /api/generate-image —— 商品效果图生成（multipart）
 * 图片模型比文本模型慢，超时给到 180 秒。
 */
export function generateProductImage({
  image,
  payload,
}: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  const form = new FormData()
  if (image) form.append('image', image, image.name)
  form.append('payload', JSON.stringify(payload))
  return fetchJson<ImageGenerateResponse>('/api/generate-image', { method: 'POST', body: form }, 180_000)
}

/** POST /api/seo-keywords —— 分类关键词 + 平台文案块 */
export function generateSeoKeywords(payload: SeoKeywordPayload): Promise<SeoKeywordResponse> {
  return fetchJson<SeoKeywordResponse>(
    '/api/seo-keywords',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    150_000,
  )
}

/** 把异常统一转成给用户看的 { message, hint } */
export function describeError(err: unknown): { message: string; hint?: string; retryable: boolean } {
  if (err instanceof ApiClientError) {
    return { message: err.message, hint: err.hint, retryable: err.retryable }
  }
  if (err instanceof TypeError) {
    // fetch 本身抛 TypeError：网络层失败（DNS / 断网 / 被 CORS 或代理拦下）
    return {
      message: '浏览器请求本站接口时发生网络错误。',
      hint: '检查本地服务是否在运行（npm run dev）、是否通过 file:// 打开页面，或浏览器插件/代理是否拦截了本站请求。',
      retryable: true,
    }
  }
  if (err instanceof Error) {
    return { message: err.message, retryable: true }
  }
  return { message: '发生未知错误，请重试。', retryable: true }
}
