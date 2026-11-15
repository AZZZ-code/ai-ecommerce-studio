/**
 * 会话级 API Key 暂存
 * ----------------------------------------------------------------------------
 * 只存在于 JS 内存（模块作用域），用于「AI 模型设置页 → 生成页 / 图片创作页 /
 * SEO 页」之间传递用户刚填写的 Key。刷新页面或关闭标签页即消失；
 * 不写 localStorage / sessionStorage / Cookie，也不进入任何日志与埋点。
 */
let sessionKeys: { vision: string; text: string; image: string } = {
  vision: '',
  text: '',
  image: '',
}

export function getSessionKeys(): { vision: string; text: string; image: string } {
  return { ...sessionKeys }
}

export function setSessionKeys(next: { vision?: string; text?: string; image?: string }): void {
  sessionKeys = {
    vision: next.vision ?? '',
    text: next.text ?? '',
    image: next.image ?? '',
  }
}

export function clearSessionKeys(): void {
  sessionKeys = { vision: '', text: '', image: '' }
}

export function hasSessionKeys(): boolean {
  return Boolean(sessionKeys.vision || sessionKeys.text || sessionKeys.image)
}
