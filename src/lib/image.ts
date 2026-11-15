/** 把静态示例图（SVG）转成可直接上传的 PNG File，保证示例也能走真实接口 */
export async function createFileFromImageUrl(url: string, fileName: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('示例图片加载失败，请刷新页面重试。')
  const blob = await response.blob()

  // PNG/JPEG/WEBP 直接返回
  if (['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
    return new File([blob], fileName, { type: blob.type })
  }

  // SVG 等其它格式：画到 canvas 上导出 PNG（同源图片不会污染画布）
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = await loadImage(objectUrl)
    const canvas = document.createElement('canvas')
    const width = image.naturalWidth || 800
    const height = image.naturalHeight || 800
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持 Canvas，无法处理示例图片。')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('示例图片转换失败，请改用本地上传。')
    return new File([pngBlob], fileName.replace(/\.\w+$/, '.png'), { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('示例图片解码失败，请改用本地上传。'))
    image.src = src
  })
}

/** 客户端上传前校验（后端会再校验一次，双重保障） */
export function validateImageFile(file: File, maxBytes: number): string | null {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const extOk = /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!allowed.includes(file.type) || !extOk) {
    return '仅支持 JPG、JPEG、PNG、WEBP 格式的图片。'
  }
  if (file.size > maxBytes) {
    return `图片大小不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB，当前文件为 ${(
      file.size /
      1024 /
      1024
    ).toFixed(1)}MB。`
  }
  if (file.size === 0) return '图片文件为空，请重新选择。'
  return null
}
