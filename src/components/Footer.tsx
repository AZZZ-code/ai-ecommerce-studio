import { Link } from 'react-router-dom'
import { BrandLogo } from './Navbar'

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50/60">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              让每一张商品图片，都能变成专业商品文案。支持国内与跨境电商平台，中英双语输出。
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">产品</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                <Link className="transition hover:text-brand-700" to="/">
                  首页
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-brand-700" to="/generate">
                  开始创作
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-brand-700" to="/models">
                  AI 模型设置
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-brand-700" to="/about">
                  项目介绍
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">能力</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>商品图片识别</li>
              <li>多平台文案风格</li>
              <li>中英双语输出</li>
              <li>多模型 BYOK 接入</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">说明</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
              <li>演示模式使用模拟数据，已明确标注</li>
              <li>用户 API Key 仅在单次请求中透传</li>
              <li>文案发布前请核对平台规则</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} ProductAI · V1.0 · 本站为可自行部署的开源项目，文案内容由使用者自行负责。</p>
          <p className="text-ink-400">
            未经过任何电商平台官方审核 · 非官方合作产品
          </p>
        </div>
      </div>
    </footer>
  )
}
