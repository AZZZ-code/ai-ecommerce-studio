import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * 本地开发用的 API 适配插件
 * ----------------------------------------------------------------------------
 * 目的：`npm run dev` 就能跑起完整全栈（前端 + 三个 API），不依赖 wrangler / 云账号。
 *
 * 原理：把 Node 的 req/res 构造成标准 Web Request/Response，
 * 再通过 vite 的 ssrLoadModule 加载 functions/api/*.ts —— 也就是线上真正部署的同一份代码。
 * 因此本地调试的行为（校验、限流、SSRF 白名单、适配层）与 Cloudflare Pages 上一致。
 */
export function devApiPlugin(): Plugin {
  let root = process.cwd()
  let env: Record<string, string | undefined> = {}

  return {
    name: 'productai-dev-api',
    apply: 'serve',
    configResolved(config) {
      root = config.root
      env = loadDevVars(root)
    },
    configureServer(server) {
      server.middlewares.use(buildApiMiddleware(server, () => env))
    },
    // npm run preview 也要能跑 /api/*，否则打包产物点按钮就会报「网络请求失败」
    configurePreviewServer(server) {
      // PreviewServer 没有 ssrLoadModule，这里懒加载一个 middlewareMode 的 vite 实例来编译 TS
      server.middlewares.use(
        buildApiMiddleware(
          () =>
            getPreviewLoader(root).then((loaded) => ({ ssrLoadModule: loaded })),
          () => env,
        ),
      )
    },
  }
}

/**
 * dev / preview 共用的桥接中间件：
 * 把 Node 的 req/res 转成标准 Web Request/Response，再调用 functions/api/*.ts 里的真实处理函数。
 */
type ModuleLoader = (url: string) => Promise<unknown>

function buildApiMiddleware(
  serverOrLoader: { ssrLoadModule: ModuleLoader } | (() => Promise<{ ssrLoadModule: ModuleLoader }>),
  getEnv: () => Record<string, string | undefined>,
) {
  return async (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: () => void,
  ) => {
        const loadModule: ModuleLoader =
          typeof serverOrLoader === 'function'
            ? (await serverOrLoader()).ssrLoadModule
            : serverOrLoader.ssrLoadModule

        const rawUrl = req.url ?? ''
        if (!rawUrl.startsWith('/api/')) return next()

        try {
          const url = new URL(rawUrl, 'http://localhost:5173')
          const route = resolveRoute(url.pathname, req.method ?? 'GET')

          if (!route) {
            sendJson(res, 404, {
              ok: false,
              error: {
                code: 'BAD_REQUEST',
                message: `未找到接口：${req.method} ${url.pathname}`,
                retryable: false,
              },
            })
            return
          }

          const mod = (await loadModule(`/functions/api/${route.file}.ts`)) as Record<
            string,
            (context: { request: Request; env: Record<string, string | undefined> }) => Promise<Response>
          >
          const handler = mod[route.exportName]
          if (typeof handler !== 'function') {
            sendJson(res, 500, {
              ok: false,
              error: { code: 'INTERNAL_ERROR', message: `接口 ${route.file} 未导出 ${route.exportName}` },
            })
            return
          }

          const request = await toWebRequest(req, url)
          const response = await handler({ request, env: getEnv() })
          await sendWebResponse(res, response)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[dev-api] 处理请求失败:', message)
          sendJson(res, 500, {
            ok: false,
            error: { code: 'INTERNAL_ERROR', message: `本地调试服务异常：${message}` },
          })
        }
  }
}

interface RouteMatch {
  file: string
  exportName: string
}

/** 路由表：新增接口时在这里加一行，并同步在 functions/api 下创建文件 */
export function resolveRoute(pathname: string, method: string): RouteMatch | null {
  const upper = method.toUpperCase()
  if (pathname === '/api/health' && upper === 'GET') {
    return { file: 'health', exportName: 'onRequestGet' }
  }
  if (pathname === '/api/models' && upper === 'GET') {
    return { file: 'models', exportName: 'onRequestGet' }
  }
  if (pathname === '/api/generate' && upper === 'POST') {
    return { file: 'generate', exportName: 'onRequestPost' }
  }
  if (pathname === '/api/test-connection' && upper === 'POST') {
    return { file: 'test-connection', exportName: 'onRequestPost' }
  }
  if (pathname === '/api/generate-image' && upper === 'POST') {
    return { file: 'generate-image', exportName: 'onRequestPost' }
  }
  if (pathname === '/api/seo-keywords' && upper === 'POST') {
    return { file: 'seo-keywords', exportName: 'onRequestPost' }
  }
  return null
}

/** 读取 .dev.vars（KEY=VALUE），并与 process.env 合并；process.env 优先级更高 */
function loadDevVars(root: string): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = { ...process.env }
  const candidates = [path.join(root, '.dev.vars'), path.join(root, '.dev.vars.local')]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (merged[key] === undefined || merged[key] === '') merged[key] = value
    }
  }
  return merged
}

async function toWebRequest(req: import('node:http').IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(','))
  }

  const method = (req.method ?? 'GET').toUpperCase()
  let body: Buffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    body = Buffer.concat(chunks)
  }

  return new Request(url, {
    method,
    headers,
    body: body && body.length ? body : undefined,
  })
}

async function sendWebResponse(res: import('node:http').ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    // node 会自动补充 content-length / transfer-encoding，跳过避免冲突
    if (key.toLowerCase() === 'content-length') return
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  res.setHeader('content-length', String(buffer.length))
  res.end(buffer)
}

function sendJson(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(body)
}

/** preview 模式下懒加载的 vite 实例（用于编译 functions/api/*.ts） */
let previewLoaderPromise: Promise<ModuleLoader> | null = null

function getPreviewLoader(root: string): Promise<ModuleLoader> {
  if (!previewLoaderPromise) {
    previewLoaderPromise = import('vite').then(async ({ createServer }) => {
      const server = await createServer({
        root,
        appType: 'custom',
        configFile: false,
        logLevel: 'warn',
        server: { middlewareMode: true },
      })
      return server.ssrLoadModule.bind(server) as ModuleLoader
    })
  }
  return previewLoaderPromise
}
