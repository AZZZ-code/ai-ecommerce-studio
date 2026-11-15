import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'info' | 'success' | 'warning' | 'error'

const STYLES: Record<Variant, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: {
    wrap: 'border-brand-100 bg-brand-50/70 text-brand-900',
    icon: 'text-brand-600',
    Icon: Info,
  },
  success: {
    wrap: 'border-emerald-100 bg-emerald-50/70 text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50/80 text-amber-900',
    icon: 'text-amber-600',
    Icon: TriangleAlert,
  },
  error: {
    wrap: 'border-red-200 bg-red-50/80 text-red-900',
    icon: 'text-red-600',
    Icon: AlertCircle,
  },
}

interface AlertProps {
  variant?: Variant
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  className?: string
}

export function Alert({ variant = 'info', title, children, actions, onClose, className }: AlertProps) {
  const style = STYLES[variant]
  const Icon = style.Icon

  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', style.wrap, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold leading-5">{title}</p> : null}
        {children ? (
          <div className={cn('leading-6', title && 'mt-1', 'opacity-90')}>{children}</div>
        ) : null}
        {actions ? <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="关闭提示"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
