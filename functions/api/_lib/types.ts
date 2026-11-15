/**
 * Cloudflare Pages Functions 的最小类型定义。
 * 不引入 @cloudflare/workers-types，保证本地 vite dev 与 tsc 都能通过。
 */

export interface Env {
  [key: string]: string | undefined
}

/** Pages Functions 的 context 中本项目用到的字段 */
export interface PagesContext {
  request: Request
  env: Env
}

export interface PagesFunction {
  (context: PagesContext): Promise<Response>
}

/** 上传文件允许的最小信息 */
export interface UploadedImage {
  bytes: Uint8Array
  mimeType: string
  fileName: string
  size: number
}
