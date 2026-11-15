import { useCallback, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'
import { validateImageFile } from '@/lib/image'

interface UploaderProps {
  file: File | null
  previewUrl: string | null
  onFileChange: (file: File | null) => void
  onError: (message: string | null) => void
  error?: string | null
  disabled?: boolean
  maxBytes: number
  /** 紧凑模式用于首页 hero 卡片 */
  compact?: boolean
}

/**
 * 商品图片上传：点击 / 拖拽 / 预览 / 删除 / 重新上传 / 格式与大小校验
 */
export function Uploader({
  file,
  previewUrl,
  onFileChange,
  onError,
  error,
  disabled = false,
  maxBytes,
  compact = false,
}: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files?.[0]
      if (!picked) return
      const problem = validateImageFile(picked, maxBytes)
      if (problem) {
        onError(problem)
        onFileChange(null)
        return
      }
      onError(null)
      onFileChange(picked)
    },
    [maxBytes, onError, onFileChange],
  )

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const onDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    if (disabled) return
    dragDepth.current += 1
    setDragging(true)
  }
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    if (disabled) return
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="min-w-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files)
          // 允许重复选择同一个文件
          event.target.value = ''
        }}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div className={cn('relative bg-grid', compact ? 'aspect-[4/3]' : 'aspect-[4/3]')}>
            <img
              src={previewUrl}
              alt="商品图片预览"
              className="h-full w-full object-contain"
            />
            <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink-500 shadow-sm">
              预览
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
            <p className="min-w-0 truncate text-xs text-ink-500" title={file?.name}>
              {file?.name}
              {file ? <span className="ml-1 text-ink-400">· {formatBytes(file.size)}</span> : null}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={openPicker}
                disabled={disabled}
              >
                <RefreshCw className="h-3 w-3" />
                重新上传
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  onFileChange(null)
                  onError(null)
                }}
                disabled={disabled}
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          disabled={disabled}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-slate-50/60 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed',
            compact ? 'aspect-[4/3] px-4' : 'aspect-[4/3] px-6',
            dragging
              ? 'border-brand-500 bg-brand-50'
              : error
                ? 'border-red-300 bg-red-50/40'
                : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/40',
          )}
        >
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm',
              dragging ? 'text-brand-600' : 'text-brand-500',
            )}
          >
            {dragging ? <ImagePlus className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
          </span>
          <span className="text-sm font-semibold text-ink-800">
            {dragging ? '松手即可上传' : '点击上传或拖拽商品图片'}
          </span>
          <span className="text-[11px] leading-relaxed text-ink-400">
            支持 JPG / PNG / WEBP，单个文件 ≤ {Math.round(maxBytes / 1024 / 1024)}MB
          </span>
        </button>
      )}

      {error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
