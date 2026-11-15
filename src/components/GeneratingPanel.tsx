import { ScanSearch, Sparkles } from 'lucide-react'
import { Spinner } from './Spinner'

const STEPS = [
  '校验图片格式与大小',
  '视觉模型识别商品外观',
  '结合平台与风格撰写文案',
  '输出中英双语结果',
]

/** 生成中的骨架屏：让用户明确知道当前正在做什么 */
export function GeneratingPanel({ demo = false }: { demo?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="card px-5 py-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-brand-200/50" />
            {demo ? <Sparkles className="relative h-5 w-5" /> : <ScanSearch className="relative h-5 w-5" />}
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              {demo ? '正在准备演示数据' : '正在识别商品并生成文案'}
              <Spinner className="text-brand-600" />
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              {demo ? '演示模式不会调用真实模型，约 1 秒完成' : '通常需要 10-40 秒，请保持页面打开'}
            </p>
          </div>
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-600 shadow-sm">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {[0, 1, 2].map((index) => (
        <div key={index} className="card animate-pulse px-5 py-4">
          <div className="h-3.5 w-24 rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-2.5 w-full rounded bg-slate-100" />
            <div className="h-2.5 w-11/12 rounded bg-slate-100" />
            <div className="h-2.5 w-8/12 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
