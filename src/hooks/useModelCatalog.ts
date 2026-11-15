import { useCallback, useEffect, useState } from 'react'
import type { ModelCatalog } from '@/types'
import { describeError, fetchModelCatalog } from '@/services/api'

/** 拉取 /api/models（服务商与模型能力清单 + 平台默认 API 配置状态） */
export function useModelCatalog() {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchModelCatalog()
      setCatalog(data)
      setError(null)
    } catch (err) {
      setError(describeError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { catalog, loading, error, reload }
}
