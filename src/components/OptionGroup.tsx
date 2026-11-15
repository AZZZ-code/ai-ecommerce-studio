import { cn } from '@/lib/utils'

export interface Option<T extends string> {
  value: T
  label: string
  desc?: string
  badge?: string
}

interface OptionGroupProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  name: string
  columns?: 1 | 2 | 3
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

/**
 * 单选卡片组（平台 / 风格 / 语言 / 接入模式共用）
 * 使用 role="radiogroup" + 原生 button，保证键盘可操作。
 */
export function OptionGroup<T extends string>({
  options,
  value,
  onChange,
  name,
  columns = 2,
  size = 'md',
  disabled = false,
  className,
}: OptionGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'grid grid-cols-1 gap-2',
        columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30'
                : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'font-semibold',
                  size === 'sm' ? 'text-xs' : 'text-sm',
                  selected ? 'text-brand-800' : 'text-ink-800',
                )}
              >
                {option.label}
              </span>
              {option.badge ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-400',
                  )}
                >
                  {option.badge}
                </span>
              ) : null}
            </span>
            {option.desc ? (
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-400">{option.desc}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
