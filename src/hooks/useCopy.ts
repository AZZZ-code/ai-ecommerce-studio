import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '@/lib/utils'

/**
 * 复制反馈：返回当前"已复制"的 key，便于按钮显示 已复制 ✓
 * 3 秒后自动复位；组件卸载时清理定时器。
 */
export function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const copy = useCallback(
    async (text: string, key = 'default') => {
      try {
        await copyText(text)
        setCopiedKey(key)
        setError(null)
        clearTimer()
        timer.current = window.setTimeout(() => setCopiedKey(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '复制失败，请手动选择文本复制。')
      }
    },
    [clearTimer],
  )

  return { copiedKey, error, copy }
}
