import { Eye, ImageIcon, ScanSearch, Sparkles, TriangleAlert } from 'lucide-react'
import type { VisionAnalysis } from '@/types'
import { Alert } from './Alert'

interface AnalysisPanelProps {
  analysis: VisionAnalysis
  /** 演示模式下不展示置信度（避免暗示真实识别） */
  demo?: boolean
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[110px_1fr] sm:gap-3">
      <dt className="text-xs font-semibold text-ink-400">{label}</dt>
      <dd className="min-w-0 text-[13px] leading-6 text-ink-700">{children}</dd>
    </div>
  )
}

/** 图片识别结果卡片：只展示"可观察"的信息，未确认属性单独标出 */
export function AnalysisPanel({ analysis, demo = false }: AnalysisPanelProps) {
  const confidence = Math.max(0, Math.min(1, analysis.confidence))
  // 仅文字生成：没有调用视觉模型，卡片标题与说明都要改，绝不能伪装成图片识别
  const textOnly = analysis.source === 'text-only'

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
            {textOnly ? <ImageIcon className="h-4 w-4" /> : <ScanSearch className="h-4 w-4" />}
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink-900">
              {textOnly ? '文字分析结果（未使用图片识别）' : '图片识别分析结果'}
            </h3>
            <p className="text-[11px] text-ink-400">
              {textOnly
                ? '本次没有调用视觉模型，下面的内容来自你填写的商品信息，不是图片识别结果'
                : '仅描述可直接观察到的特征，材质 / 尺寸 / 性能等属性需你补充确认'}
            </p>
          </div>
        </div>
        {demo ? (
          <span className="chip border-amber-200 bg-amber-50 text-amber-700">演示数据</span>
        ) : textOnly ? (
          <span className="chip border-slate-200 bg-slate-50 text-ink-600">
            <ImageIcon className="h-3 w-3" />
            仅文字
          </span>
        ) : (
          <span className="chip-brand">
            <Eye className="h-3 w-3" />
            置信度 {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </header>

      <div className="px-4 py-3 sm:px-5">
        <dl>
          <Row label="商品类别">{analysis.category || '未能确认'}</Row>
          <Row label="可观察颜色">
            {analysis.colors.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {analysis.colors.map((color) => (
                  <span key={color} className="chip-brand">
                    {color}
                  </span>
                ))}
              </span>
            ) : (
              '未能确认'
            )}
          </Row>
          <Row label="外观">{analysis.appearance || '未能确认'}</Row>
          <Row label="形状 / 结构">{analysis.shape || '未能确认'}</Row>
          <Row label="可见特征">
            {analysis.visibleFeatures.length > 0 ? (
              <ul className="space-y-1">
                {analysis.visibleFeatures.map((item) => (
                  <li key={item} className="flex gap-2">
                    <ImageIcon className="mt-1 h-3 w-3 shrink-0 text-brand-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              '未能确认'
            )}
          </Row>
          <Row label="可能场景">
            {analysis.possibleScenarios.length > 0 ? (
              <ul className="space-y-1">
                {analysis.possibleScenarios.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Sparkles className="mt-1 h-3 w-3 shrink-0 text-brand-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              '暂无推测'
            )}
          </Row>
        </dl>

        {analysis.unconfirmedAttributes.length > 0 ? (
          <Alert variant="warning" className="mt-3">
            <p className="flex items-center gap-1.5 font-semibold">
              <TriangleAlert className="h-3.5 w-3.5" />
              无法从图片确认，建议补充后再生成：
            </p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {analysis.unconfirmedAttributes.map((item) => (
                <span key={item} className="chip border-amber-200 bg-white text-amber-800">
                  {item}
                </span>
              ))}
            </p>
          </Alert>
        ) : null}
      </div>
    </section>
  )
}
