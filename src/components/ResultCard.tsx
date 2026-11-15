import { useMemo, useState } from 'react'
import { Check, Copy, Loader2, Pencil, RefreshCw, Save, X } from 'lucide-react'
import type { CopySection, LanguageMode, SectionKey } from '@/types'
import { SECTION_META } from '@/types'
import { cn } from '@/lib/utils'
import { useCopy } from '@/hooks/useCopy'

interface ResultCardProps {
  section: CopySection
  language: LanguageMode
  regenerating?: boolean
  onUpdate: (section: CopySection) => void
  onRegenerate: (key: SectionKey) => void
}

type ViewLang = 'zh' | 'en'

/** 取某个语言的展示文本；列表型模块按行展示 */
function sectionText(section: CopySection, lang: ViewLang): string {
  const list = lang === 'zh' ? section.zhList : section.enList
  if (list && list.length > 0) return list.join('\n')
  const raw = lang === 'zh' ? section.zh : section.en
  return raw.replace(/^\s*\d+[.、)]\s*/gm, '')
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.、)]\s*/, '').trim())
    .filter(Boolean)
}

export function ResultCard({
  section,
  language,
  regenerating = false,
  onUpdate,
  onRegenerate,
}: ResultCardProps) {
  const meta = SECTION_META[section.key]
  const [viewLang, setViewLang] = useState<ViewLang>(language === 'en' ? 'en' : 'zh')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftLang, setDraftLang] = useState<ViewLang>('zh')
  const { copiedKey, copy } = useCopy()

  const isList = meta.kind === 'list'
  const text = useMemo(() => sectionText(section, viewLang), [section, viewLang])
  const copied = copiedKey === `card-${section.key}`

  const startEdit = () => {
    setDraftLang(viewLang)
    setDraft(sectionText(section, viewLang))
    setEditing(true)
  }

  const switchDraftLang = (next: ViewLang) => {
    setDraftLang(next)
    setDraft(sectionText(section, next))
  }

  const saveEdit = () => {
    const lines = parseLines(draft)
    const next: CopySection = { ...section }
    if (isList) {
      if (lines.length === 0) {
        setEditing(false)
        return
      }
      if (draftLang === 'zh') {
        next.zhList = lines
        next.zh = lines.map((item, index) => `${index + 1}. ${item}`).join('\n')
      } else {
        next.enList = lines
        next.en = lines.map((item, index) => `${index + 1}. ${item}`).join('\n')
      }
    } else if (draftLang === 'zh') {
      next.zh = draft.trim()
    } else {
      next.en = draft.trim()
    }
    onUpdate(next)
    setEditing(false)
  }

  const showLangToggle = language === 'bilingual'

  return (
    <section className="card flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            {meta.label}
            <span className="text-[11px] font-medium text-ink-400">{meta.labelEn}</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-400">{meta.desc}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {showLangToggle && !editing ? (
            <div className="mr-1 flex rounded-lg bg-slate-100 p-0.5">
              {(['zh', 'en'] as ViewLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setViewLang(lang)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-semibold transition',
                    viewLang === lang
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-ink-400 hover:text-ink-700',
                  )}
                >
                  {lang === 'zh' ? '中文' : 'EN'}
                </button>
              ))}
            </div>
          ) : null}

          {editing ? (
            <>
              {showLangToggle ? (
                <div className="mr-1 flex rounded-lg bg-slate-100 p-0.5">
                  {(['zh', 'en'] as ViewLang[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => switchDraftLang(lang)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] font-semibold transition',
                        draftLang === lang
                          ? 'bg-white text-brand-700 shadow-sm'
                          : 'text-ink-400 hover:text-ink-700',
                      )}
                    >
                      {lang === 'zh' ? '中文' : 'EN'}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" className="btn btn-ghost btn-xs text-brand-700" onClick={saveEdit}>
                <Save className="h-3 w-3" />
                保存
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setEditing(false)}
                aria-label="取消编辑"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={startEdit}
                title="编辑本段内容"
              >
                <Pencil className="h-3 w-3" />
                编辑
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => onRegenerate(section.key)}
                disabled={regenerating}
                title="只重新生成这一段"
              >
                {regenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                重新生成
              </button>
              <button
                type="button"
                className={cn('btn btn-ghost btn-xs', copied && 'text-emerald-600')}
                onClick={() => void copy(text, `card-${section.key}`)}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? '已复制' : '复制'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 sm:px-5">
        {editing ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={isList ? 7 : 9}
            className="input resize-y font-mono text-[13px] leading-6"
            placeholder={isList ? '每行一个条目，保存后自动编号' : '输入内容'}
          />
        ) : isList ? (
          <ul className="space-y-2">
            {parseLines(text).map((item, index) => (
              <li key={`${section.key}-${index}`} className="flex gap-2.5 text-[13px] leading-6 text-ink-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
            {parseLines(text).length === 0 ? (
              <li className="text-sm text-ink-400">这一段还没有内容，可以点「重新生成」。</li>
            ) : null}
          </ul>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-ink-700">
            {text || '这一段还没有内容，可以点「重新生成」。'}
          </p>
        )}
      </div>

      {regenerating ? (
        <div className="border-t border-slate-100 bg-brand-50/50 px-4 py-2 text-[11px] font-medium text-brand-700 sm:px-5">
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在重新生成这一段…
          </span>
        </div>
      ) : null}
    </section>
  )
}
