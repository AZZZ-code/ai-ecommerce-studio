import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, Sparkles } from 'lucide-react'

/** 404 页面：路由未命中时兜底，给出两个明确的下一步入口。 */
export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[62vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-6 w-6" />
      </span>
      <p className="mt-5 text-5xl font-extrabold tracking-tight text-ink-900">404</p>
      <h1 className="mt-2 text-lg font-bold text-ink-900">这个页面不存在</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        链接可能已失效，或者地址输入有误。你可以回到首页，或直接进入商品文案生成页开始创作。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
        <Link to="/generate" className="btn-primary">
          <Sparkles className="h-4 w-4" />
          开始创作
        </Link>
      </div>
    </div>
  )
}
