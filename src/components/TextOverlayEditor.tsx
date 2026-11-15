import { Download, ImageDown, Type } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type OverlayPosition = 'top' | 'center' | 'bottom'

interface TextOverlayEditorProps {
  imageUrl: string
  width: number
  height: number
  fileName: string
  /** 初始文字（一般来自 AI 生成的商品标题 / 卖点） */
  defaultText?: string
  className?: string
}

const POSITION_LABEL: Record<OverlayPosition, string> = {
  top: '顶部',
  center: '居中',
  bottom: '底部',
}

/**
 * 图片文字叠加（Canvas 合成）
 * ----------------------------------------------------------------------------
 * 为什么不用图像模型直接画字：扩散模型经常写错别字、篡改数字与品牌名。
 * 这里的做法是——图片模型只负责画面，文字由前端 Canvas 用真实字体绘制，
 * 内容来自用户确认过的商品资料，位置/字号/颜色都可调，导出时一次性合成。
 */
export function TextOverlayEditor({
  imageUrl,
  width,
  height,
  fileName,
  defaultText = '',
  className,
}: TextOverlayEditorProps) {
  const [text, setText] = useState(defaultText)
  const [position, setPosition] = useState<OverlayPosition>('bottom')
  const [fontScale, setFontScale] = useState(5.5)
  const [color, setColor] = useState('#ffffff')
  const [withBand, setWithBand] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lines = useMemo(
    () =>
      text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4),
    [text],
  )

  const download = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const image = await loadImage(imageUrl)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前浏览器不支持 Canvas 合成。')

      ctx.drawImage(image, 0, 0, width, height)

      const fontSize = Math.round((Math.min(width, height) * fontScale) / 100)
      const lineHeight = Math.round(fontSize * 1.35)
      const padding = Math.round(fontSize * 0.9)
      const totalHeight = lines.length * lineHeight

      let startY: number
      if (position === 'top') startY = padding + fontSize
      else if (position === 'center') startY = (height - totalHeight) / 2 + fontSize
      else startY = height - padding - totalHeight + fontSize

      if (withBand && lines.length > 0) {
        const bandTop = startY - fontSize - padding * 0.6
        const bandHeight = totalHeight + padding * 1.2
        const gradient = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandHeight)
        gradient.addColorStop(0, 'rgba(15,23,42,0.05)')
        gradient.addColorStop(0.5, 'rgba(15,23,42,0.55)')
        gradient.addColorStop(1, 'rgba(15,23,42,0.05)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, bandTop, width, bandHeight)
      }

      ctx.font = `700 ${fontSize}px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = color
      ctx.shadowColor = 'rgba(15,23,42,0.45)'
      ctx.shadowBlur = Math.round(fontSize * 0.25)
      lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight, width - padding * 2)
      })

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((value) => resolve(value), 'image/png'),
      )
      if (!blob) throw new Error('导出失败，请重试。')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName.replace(/\.[^.]+$/, '')}-with-text.png`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请重试。')
    } finally {
      setBusy(false)
    }
  }, [color, fileName, fontScale, height, imageUrl, lines, position, width, withBand])

  const previewFontSize = useMemo(() => height * (fontScale / 100), [fontScale, height])

  return (
    <div className={cn('rounded-xl border border-ink-200 bg-white p-3', className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
        <Type className="h-3.5 w-3.5 text-brand-600" />
        文字叠加（Canvas 合成，避免模型写错字）
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-ink-100">
        <div className="relative" style={{ aspectRatio: `${width} / ${height}`, containerType: 'inline-size' }}>
          <img src={imageUrl} alt="效果图预览" className="h-full w-full object-cover" />
          {lines.length > 0 ? (
            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 flex flex-col items-center justify-start px-[6%]',
                position === 'top' && 'top-[4%]',
                position === 'center' && 'top-1/2 -translate-y-1/2',
                position === 'bottom' && 'bottom-[4%]',
              )}
            >
              {lines.map((line, index) => (
                <span
                  key={index}
                  className="w-full text-center font-bold leading-tight"
                  style={{
                    color,
                    fontSize: `${(previewFontSize / height) * 100}cqw`,
                    textShadow: '0 2px 6px rgba(15,23,42,.45)',
                    WebkitTextStroke: '0.2px rgba(15,23,42,.25)',
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <textarea
          className="input min-h-[64px] resize-y"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="输入要叠加的文字，每行一条（最多 4 行）&#10;例如：316 不锈钢 · 12 小时保温"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-ink-200">
            {(Object.keys(POSITION_LABEL) as OverlayPosition[]).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'px-2.5 py-1 text-xs',
                  position === key ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-50',
                )}
                onClick={() => setPosition(key)}
              >
                {POSITION_LABEL[key]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-ink-600">
            字号
            <input
              type="range"
              min={3}
              max={9}
              step={0.5}
              value={fontScale}
              onChange={(event) => setFontScale(Number(event.target.value))}
            />
            <span className="w-8 tabular-nums text-ink-400">{fontScale}%</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-600">
            颜色
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-ink-200 bg-white"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600"
              checked={withBand}
              onChange={(event) => setWithBand(event.target.checked)}
            />
            半透明底衬
          </label>
        </div>
        <button type="button" className="btn-secondary w-full" onClick={() => void download()} disabled={busy}>
          {busy ? <ImageDown className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
          {busy ? '合成中…' : '下载带文字的图片'}
        </button>
        {lines.length === 0 ? (
          <p className="text-xs text-ink-400">没有填写文字时，导出的就是原始效果图。</p>
        ) : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，无法合成文字。'))
    image.src = src
  })
}
