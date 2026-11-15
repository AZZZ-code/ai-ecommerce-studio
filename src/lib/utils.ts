export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, unknown>

/** 轻量 className 合并（不引入 clsx / tailwind-merge，减少依赖） */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (typeof input === 'string') classes.push(input)
    else if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) classes.push(nested)
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (value) classes.push(key)
      }
    }
  }
  return classes.join(' ')
}

/** 字节 → 可读大小 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, index)
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

/** 把 File 读成 data URL（用于本地预览，不上传） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败，请重新选择文件。'))
    reader.readAsDataURL(file)
  })
}

/** 复制文本，优先用 Clipboard API，失败时降级到 execCommand */
export async function copyText(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // 继续走降级方案
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('浏览器拒绝了复制操作，请手动选择文本复制。')
}

/** 生成用于 React key 的短 id */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** 粗略判断字符串里是否包含中文 */
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}
