import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/generate', label: '开始创作' },
  { to: '/studio', label: 'AI图片创作' },
  { to: '/seo', label: '智能SEO' },
  { to: '/models', label: 'AI模型设置' },
  { to: '/about', label: '项目介绍' },
]

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="ProductAI 首页">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30 transition group-hover:shadow-md">
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      <span className="leading-none">
        <span className="block text-[17px] font-bold tracking-tight text-ink-900">ProductAI</span>
        {!compact ? (
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Smart E-commerce Copywriter
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLogo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-500 hover:bg-slate-100 hover:text-ink-900',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/generate" className="btn-primary btn-xs hidden px-4 py-2 sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            开始创作
          </Link>
          <button
            type="button"
            className="btn btn-ghost md:hidden"
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200/80 bg-white md:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="移动端导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-50',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
