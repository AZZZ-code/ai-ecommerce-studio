import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Languages,
  Layers,
  LayoutList,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { MAX_UPLOAD_BYTES, PLATFORM_META } from '@/types'
import { Uploader } from '@/components/Uploader'
import { SAMPLE_PRODUCTS, setPendingFile, setPendingSample } from '@/services/pending'
import { loadPreferences } from '@/services/storage'

const FEATURES = [
  {
    icon: ScanSearch,
    title: '商品图片智能识别',
    desc: '识别商品类别、颜色、外观、形状与可见特征，并把无法确认的属性单独列出，绝不凭空编造材质与参数。',
  },
  {
    icon: Layers,
    title: '7 个平台差异化风格',
    desc: '淘宝、拼多多、抖音、小红书、Amazon、eBay 与通用电商，各平台文案结构、语气与信息密度分别适配。',
  },
  {
    icon: LayoutList,
    title: '5 个模块化结果',
    desc: '商品标题、核心卖点、详细介绍、营销文案、SEO 关键词分卡片输出，可单独编辑、单独重新生成。',
  },
  {
    icon: Languages,
    title: '中英双语输出',
    desc: '中文、English 或中英双语三选一，同一套信息同时服务国内平台与跨境 Listing。',
  },
  {
    icon: Wand2,
    title: '多模型自由组合',
    desc: '视觉模型与文本模型分开配置，支持 OpenAI、Gemini、Claude 与 OpenAI 兼容接口，可以来自不同服务商。',
  },
  {
    icon: ShieldCheck,
    title: '密钥不落盘',
    desc: 'BYOK 的 API Key 只在单次请求中透传，后端用完即丢；不写入 localStorage，不写日志，不下发到前端。',
  },
]

const STEPS = [
  { title: '上传商品图片', desc: '点击或拖拽 JPG / PNG / WEBP，≤ 5MB，自动校验格式。' },
  { title: '补充商品信息', desc: '12 项选填字段：材质、尺寸、价格、目标客户等，填得越多文案越准。' },
  { title: '选择平台与风格', desc: '选平台、风格与语言，决定文案的结构和语气。' },
  { title: '复制 / 编辑 / 发布', desc: '结果分卡片展示，可单段重写、单段编辑、一键复制全文。' },
]

const PLATFORM_CHIPS = [
  PLATFORM_META.taobao,
  PLATFORM_META.pinduoduo,
  PLATFORM_META.douyin,
  PLATFORM_META.xiaohongshu,
  PLATFORM_META.amazon,
  PLATFORM_META.ebay,
]

export function HomePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const preferences = loadPreferences()

  const goWithSample = (image: string) => {
    setPendingSample(image)
    navigate('/generate')
  }

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -top-24 h-[420px] w-[420px] rounded-full bg-brand-100/50 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-3 w-3" />
              AI E-Commerce Copywriter · V1.0
            </span>
            <h1
              className="mt-5 text-balance text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-[42px]"
              style={{ lineHeight: 1.16 }}
            >
              让每一张商品图片，
              <br />
              都能变成
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                专业商品文案
              </span>
              。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
              上传一张商品图，ProductAI 会先识别商品外观，再结合你补充的信息，输出商品标题、核心卖点、
              详细描述、营销文案与 SEO 关键词。支持中英双语，适配国内电商与跨境电商平台。
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={() => navigate('/generate')}>
                <Sparkles className="h-4 w-4" />
                立即开始创作
              </button>
              <a href="#samples" className="btn-secondary">
                看看示例效果
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <ul className="mt-7 grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
              {[
                '图片识别不编造参数',
                '7 个平台 × 5 种风格',
                '中文 / English / 双语',
                '无 Key 也能先跑演示模式',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 首屏上传入口 */}
          <div className="card relative mx-auto w-full max-w-md p-4 shadow-pop sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">从这里开始</p>
              <span className="chip-brand">演示模式可用</span>
            </div>
            <Uploader
              compact
              file={null}
              previewUrl={null}
              maxBytes={MAX_UPLOAD_BYTES}
              error={error}
              onError={setError}
              onFileChange={(file) => {
                if (!file) return
                setPendingFile(file)
                navigate('/generate')
              }}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PLATFORM_CHIPS.map((platform) => (
                <span key={platform.label} className="chip text-[11px]">
                  {platform.label}
                </span>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              未接入真实模型时自动使用演示数据，并明确标注
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 平台支持条 ---------------- */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">适配平台</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-ink-500">
            {PLATFORM_CHIPS.map((platform) => (
              <span key={platform.label} className="transition hover:text-brand-700">
                {platform.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-400">非官方合作，文案需自行核对平台规则</p>
        </div>
      </section>

      {/* ---------------- 核心功能 ---------------- */}
      <section className="container-page py-16" id="features">
        <div className="max-w-2xl">
          <span className="eyebrow">核心功能</span>
          <h2 className="section-title mt-3">一张图，覆盖商品上架的完整文案链路</h2>
          <p className="section-desc">
            从图片识别到多平台文案输出，每一步都可在页面上查看、编辑与复现，
            不需要在多个工具之间复制粘贴。
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="card-interactive p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-ink-500">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- 使用流程 ---------------- */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-16">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">使用流程</span>
            <h2 className="section-title mt-3">四步完成一份可用的商品文案</h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">
                  Step {index + 1}
                </span>
                <h3 className="mt-2 text-sm font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-ink-500">{step.desc}</p>
                {index < STEPS.length - 1 ? (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 示例商品 ---------------- */}
      <section className="container-page py-16" id="samples">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="eyebrow">示例商品</span>
            <h2 className="section-title mt-3">用示例图直接看完整输出</h2>
            <p className="section-desc">
              下面三张示例图会带出完整的识别结果与文案结构。演示数据已明确标注，
              接入真实模型后即可替换为你的商品。
            </p>
          </div>
          <Link to="/generate" className="btn-secondary">
            自己上传一张
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_PRODUCTS.map((sample) => (
            <article key={sample.id} className="card-interactive overflow-hidden">
              <div className="aspect-[4/3] bg-slate-50 bg-grid p-4">
                <img
                  src={sample.image}
                  alt={sample.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="border-t border-slate-100 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink-900">{sample.name}</h3>
                  <span className="chip text-[10px]">{sample.category}</span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-ink-400">{sample.desc}</p>
                <button
                  type="button"
                  className="btn-secondary btn-xs mt-3 w-full"
                  onClick={() => goWithSample(sample.image)}
                >
                  <Zap className="h-3.5 w-3.5" />
                  用这张图生成文案
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- 底部 CTA ---------------- */}
      <section className="container-page pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-100">
                <BadgeCheck className="h-3.5 w-3.5" />
                ProductAI V1.0
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                现在上传一张商品图，拿到第一版文案
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-100">
                不需要配置任何 API Key 也能先体验完整流程；需要真实生成时，在「AI 模型设置」里填入自己的密钥即可。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/generate" className="btn bg-white px-5 py-2.5 text-brand-700 hover:bg-brand-50">
                <Sparkles className="h-4 w-4" />
                开始创作
              </Link>
              <Link
                to="/models"
                className="btn border border-white/30 px-5 py-2.5 text-white hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                配置我的模型
              </Link>
            </div>
          </div>
          <p className="relative mt-8 text-[11px] text-brand-100/80">
            当前接入模式：{preferences.mode === 'platform' ? '平台默认 API' : '用户自带 API（BYOK）'} ·
            所有演示内容均标注为模拟数据
          </p>
        </div>
      </section>
    </div>
  )
}
