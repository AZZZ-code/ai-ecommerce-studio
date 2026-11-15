import { ChevronDown, Copy, CopyCheck, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { IMPORTANCE_META, type ImportanceId, type KeywordGroup, type KeywordItem } from '@/types'
import { useCopy } from '@/hooks/useCopy'
import { cn } from '@/lib/utils'

interface KeywordTableProps {
  group: KeywordGroup
  onChange: (next: KeywordGroup) => void
  /** 高亮当前关键词（可选，用于跨组比对） */
  highlight?: string
}

const IMPORTANCE_CLASS: Record<ImportanceId, string> = {
  high: 'border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-ink-200 bg-ink-50 text-ink-600',
}

/**
 * 关键词表格
 * ----------------------------------------------------------------------------
 * 每一类关键词都可以：编辑（关键词 / 搜索意图 / 使用位置 / 重要程度 / 是否需人工确认）、
 * 删除、新增、整组一键复制。改动直接回写到父级状态，方便一起复制或导出。
 */
export function KeywordTable({ group, onChange }: KeywordTableProps) {
  const [open, setOpen] = useState(true)
  const { copiedKey, error, copy } = useCopy()

  const groupText = useMemo(
    () =>
      group.keywords
        .filter((item) => item.term.trim())
        .map((item) => item.term.trim())
        .join('\n'),
    [group.keywords],
  )

  const updateKeyword = (index: number, patch: Partial<KeywordItem>) => {
    const keywords = group.keywords.map((item, i) => (i === index ? { ...item, ...patch } : item))
    onChange({ ...group, keywords })
  }

  const removeKeyword = (index: number) => {
    onChange({ ...group, keywords: group.keywords.filter((_, i) => i !== index) })
  }

  const addKeyword = () => {
    onChange({
      ...group,
      keywords: [
        ...group.keywords,
        { term: '', intent: '', placement: '', importance: 'medium', needsReview: true },
      ],
    })
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', open ? '' : '-rotate-90')}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink-900">{group.label}</span>
              <span className="chip text-[11px] text-ink-500">{group.labelEn}</span>
              <span className="chip-brand text-[11px]">{group.keywords.filter((k) => k.term.trim()).length} 个</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-ink-500">{group.description}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={() => void copy(groupText, `group-${group.id}`)}
            disabled={!groupText}
            title="复制本组关键词（每行一个）"
          >
            {copiedKey === `group-${group.id}` ? (
              <CopyCheck className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedKey === `group-${group.id}` ? '已复制' : '复制整组'}
          </button>
        </div>
      </header>

      {error ? <p className="px-4 pt-3 text-xs text-rose-600">{error}</p> : null}

      {open ? (
        <div className="divide-y divide-ink-100">
          {group.keywords.map((keyword, index) => (
            <div key={`${group.id}-${index}`} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <input
                  className="input flex-1"
                  value={keyword.term}
                  placeholder="关键词"
                  onChange={(event) => updateKeyword(index, { term: event.target.value })}
                />
                <select
                  className="input w-auto shrink-0"
                  value={keyword.importance}
                  onChange={(event) =>
                    updateKeyword(index, { importance: event.target.value as ImportanceId })
                  }
                  title="重要程度"
                >
                  {(Object.keys(IMPORTANCE_META) as ImportanceId[]).map((id) => (
                    <option key={id} value={id}>
                      {IMPORTANCE_META[id].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost shrink-0 text-rose-600"
                  onClick={() => removeKeyword(index)}
                  title="删除这个词"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="w-14 shrink-0">意图</span>
                  <input
                    className="input"
                    value={keyword.intent}
                    placeholder="用户搜索这个词想解决什么"
                    onChange={(event) => updateKeyword(index, { intent: event.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="w-14 shrink-0">位置</span>
                  <input
                    className="input"
                    value={keyword.placement}
                    placeholder="标题 / 后台 Search Terms / 话题标签"
                    onChange={(event) => updateKeyword(index, { placement: event.target.value })}
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={cn('chip', IMPORTANCE_CLASS[keyword.importance])}>
                  {IMPORTANCE_META[keyword.importance].label}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600"
                    checked={keyword.needsReview}
                    onChange={(event) => updateKeyword(index, { needsReview: event.target.checked })}
                  />
                  需要人工确认
                </label>
                {keyword.needsReview ? (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    上架前请核对是否与商品真实属性一致
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => void copy(keyword.term, `term-${group.id}-${index}`)}
                    disabled={!keyword.term.trim()}
                  >
                    {copiedKey === `term-${group.id}-${index}` ? (
                      <CopyCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </span>
              </div>
              {keyword.note ? <p className="mt-1.5 text-xs text-ink-400">{keyword.note}</p> : null}
            </div>
          ))}

          <div className="px-4 py-2">
            <button type="button" className="btn btn-xs btn-ghost" onClick={addKeyword}>
              <Plus className="h-3.5 w-3.5" />
              添加关键词
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
