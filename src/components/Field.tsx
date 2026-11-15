import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: string
  optional?: boolean
  children: ReactNode
  className?: string
}

/** 表单字段统一外壳：标签 + 输入控件 + 说明文案 */
export function Field({ label, htmlFor, hint, optional = true, children, className }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label className="label" htmlFor={htmlFor}>
        <span>{label}</span>
        {optional ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
            选填
          </span>
        ) : (
          <span className="text-[10px] font-medium text-brand-600">必填</span>
        )}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{hint}</p> : null}
    </div>
  )
}
