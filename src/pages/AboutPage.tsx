import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Code2,
  Cpu,
  FileJson,
  Gauge,
  ImagePlus,
  Layers,
  Languages,
  Lightbulb,
  Lock,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react'

const AUDIENCE = [
  { title: '淘宝 / 拼多多 / 抖音卖家', desc: '快速补齐标题、卖点与详情页描述，缩短上架准备时间。' },
  { title: 'Amazon / eBay 跨境卖家', desc: '一次输入同时拿到中文与英文 Listing 文案，保持信息一致。' },
  { title: '电商运营人员', desc: '按平台规则批量产出不同风格的推广语，方便 A/B 测试。' },
  { title: '商品开发人员', desc: '用结构化卖点检查产品的价值主张是否清晰。' },
  { title: '自媒体与内容创作者', desc: '把商品图快速扩写成种草笔记或短视频口播稿。' },
]

const PIPELINE = [
  {
    icon: ImagePlus,
    title: '① 图片校验',
    desc: '前端先校验格式与大小，后端再次按文件头嗅探 MIME，双重拦截伪造扩展名。',
  },
  {
    icon: Cpu,
    title: '② 视觉识别',
    desc: '视觉模型只输出可观察特征，并列出无法确认的属性，禁止编造材质、尺寸、性能与认证。',
  },
  {
    icon: Languages,
    title: '③ 文案生成',
    desc: '平台规则 + 风格规则 + 语言规则拼装提示词，文本模型一次输出中英双语结构化 JSON。',
  },
  {
    icon: FileJson,
    title: '④ 结构化输出',
    desc: '后端解析并兜底成固定结构，前端分卡片渲染，支持编辑、复制与单段重生成。',
  },
]

const SECURITY = [
  {
    title: 'API Key 不进入前端产物',
    desc: '平台默认 Key 只读取后端环境变量，接口返回中只回模型名称，不返回任何密钥。',
  },
  {
    title: 'BYOK Key 只在单次请求内存活',
    desc: '浏览器通过 multipart 提交，后端用完即丢弃；不写日志、不落库、不回显，前端也不写入 localStorage。',
  },
  {
    title: '自定义 Base URL 白名单',
    desc: '仅允许 https，禁止 IP 字面量、私网地址、非标准端口与账号密码；域名必须命中内置白名单或环境变量白名单。',
  },
  {
    title: '上传与请求限制',
    desc: '仅接受 JPG / PNG / WEBP，单文件 ≤ 5MB，服务端按 IP 做频率限制，模型调用有超时与错误映射。',
  },
  {
    title: '不虚构商品属性',
    desc: '提示词强制模型区分「可观察」与「待确认」，无法确认的信息必须写成 [待补充：xxx]。',
  },
  {
    title: '不宣称平台合规',
    desc: '站点与文案都不声明通过任何平台的官方审核，发布前需要使用者自行核对平台规则。',
  },
]

const STACK = [
  { name: 'React 18 + TypeScript', desc: '组件化页面与严格类型，减少运行时错误。' },
  { name: 'Vite 5', desc: '开发构建工具，自带 Functions 本地运行插件。' },
  { name: 'Tailwind CSS 3', desc: '统一的设计令牌（色彩、圆角、阴影、间距）。' },
  { name: 'Cloudflare Pages Functions', desc: 'Serverless 后端，天然部署在边缘节点。' },
  { name: 'React Router 6', desc: '四个页面的前端路由与 404 兜底。' },
  { name: 'lucide-react', desc: '统一线性图标，保持视觉克制。' },
]

const APIS = [
  {
    method: 'POST',
    path: '/api/generate',
    desc: '商品图片识别 + 文案生成。multipart：image 文件 + payload JSON。校验格式、大小、频率与模型配置。',
  },
  {
    method: 'POST',
    path: '/api/test-connection',
    desc: '测试视觉 / 文本模型连通性，返回耗时与模型原文片段，便于定位 Key 或 Base URL 问题。',
  },
  {
    method: 'GET',
    path: '/api/models',
    desc: '返回支持的服务商、模型能力清单、上传限制与平台默认 API 的配置状态（不含 Key）。',
  },
]

const ROADMAP = [
  '批量上传与多商品排队生成',
  '结果历史记录（可选开启，默认不保存图片）',
  '平台规则库可配置化（各平台标题字数、关键词数量）',
  '导出为 Excel / CSV，直接对接上架模板',
  '提示词模板自定义与团队共享',
]

export function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-slate-50/50">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="container-page relative py-14">
          <span className="eyebrow">
            <BookOpen className="h-3 w-3" />
            项目介绍 · V1.0
          </span>
          <h1 className="mt-4 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
            ProductAI 是一个可自行部署的 AI 商品文案生成平台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
            目标很直接：把「商品图 → 商品文案」这件事做成一键可用的工具，同时把模型选择权、数据边界与调用成本
            交还给使用者。项目不依赖任何特定模型厂商，也没有隐藏的服务端业务数据。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/generate" className="btn-primary">
              <Sparkles className="h-4 w-4" />
              试用生成流程
            </Link>
            <Link to="/models" className="btn-secondary">
              <ServerCog className="h-4 w-4" />
              查看模型设置
            </Link>
          </div>
        </div>
      </section>

      {/* 定位 + 目标用户 */}
      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">
              <Lightbulb className="h-3 w-3" />
              产品定位
            </span>
            <h2 className="section-title mt-3">面向国内电商与跨境电商的文案工作台</h2>
            <p className="section-desc">
              上传一张商品图，就能得到一套结构完整的文案：标题、卖点、详细介绍、营销文案与 SEO 关键词。
              同一份结果可以用在商品详情页、短视频脚本、社媒笔记与跨境 Listing。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Layers, label: '7 个平台', desc: '通用 / 淘宝 / 拼多多 / 抖音 / 小红书 / Amazon / eBay' },
                { icon: Languages, label: '3 种语言', desc: '中文、English、中英双语' },
                { icon: Workflow, label: '5 种风格', desc: '专业 / 简洁 / 营销 / 生活化 / 高端商务' },
                { icon: Boxes, label: '4 家服务商', desc: 'OpenAI / Gemini / Claude / 兼容接口' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-xl border border-slate-200 p-4">
                  <Icon className="h-4 w-4 text-brand-600" />
                  <p className="mt-2 text-sm font-bold text-ink-900">{label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-ink-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="eyebrow">
              <Users className="h-3 w-3" />
              目标用户
            </span>
            <h2 className="section-title mt-3">谁在用</h2>
            <ul className="mt-6 space-y-3">
              {AUDIENCE.map((item) => (
                <li key={item.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-ink-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 生成流程 */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-14">
        <div className="container-page">
          <span className="eyebrow">
            <Workflow className="h-3 w-3" />
            生成流程
          </span>
          <h2 className="section-title mt-3">四个环节，每个环节都可核对</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map(({ icon: Icon, title, desc }, index) => (
              <article key={title} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-500">{desc}</p>
                {index < PIPELINE.length - 1 ? (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-300 lg:block" />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 架构 */}
      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow">
              <Code2 className="h-3 w-3" />
              技术架构
            </span>
            <h2 className="section-title mt-3">前后端分离 + 统一模型适配层</h2>
            <p className="section-desc">
              前端只负责交互与展示；所有模型调用都收敛在后端 <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">services/ai</code>{' '}
              适配层里，新增服务商只需要实现一个 Provider。
            </p>
            <pre className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-ink-900 p-4 text-[11px] leading-6 text-slate-200">
{`浏览器 (React + Vite)
   │  multipart: image + payload JSON
   ▼
Cloudflare Pages Functions
   ├─ /api/generate        校验 → 限流 → 路由
   ├─ /api/test-connection 单模型连通性测试
   └─ /api/models          能力清单（不含 Key）
        │
        ▼
   ModelRouter
   ├─ resolvePlatformConfig(env)  平台默认 Key
   ├─ resolveByokConfig(payload)  用户 Key（用完即丢）
   └─ getProvider(id).call()
        │
        ├─ OpenAIProvider     (chat/completions)
        ├─ GeminiProvider     (generateContent)
        ├─ ClaudeProvider     (messages)
        └─ CompatibleProvider (chat/completions 兼容)  `}
            </pre>
          </div>

          <div>
            <span className="eyebrow">
              <Cpu className="h-3 w-3" />
              技术栈
            </span>
            <h2 className="section-title mt-3">选择成熟、易部署的方案</h2>
            <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {STACK.map((item) => (
                <li key={item.name} className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                  <p className="text-[12px] leading-5 text-ink-400 sm:max-w-[55%] sm:text-right">{item.desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-5 text-ink-400">
              没有引入数据库与账号系统：配置保存在浏览器本地（不含 Key），生成结果只存在当前页面内存中，
              刷新即清空。这样部署成本最低，也避免无意中收集用户商品图。
            </p>
          </div>
        </div>
      </section>

      {/* 安全设计 */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-14">
        <div className="container-page">
          <span className="eyebrow">
            <ShieldCheck className="h-3 w-3" />
            安全设计
          </span>
          <h2 className="section-title mt-3">密钥、上传、调用三处的硬约束</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Lock className="h-4 w-4 text-brand-600" />
                <h3 className="mt-2.5 text-sm font-bold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-[12px] leading-6 text-ink-500">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 接口 */}
      <section className="container-page py-14" id="api">
        <span className="eyebrow">
          <ServerCog className="h-3 w-3" />
          后端接口
        </span>
        <h2 className="section-title mt-3">三个接口覆盖完整链路</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          {APIS.map((api) => (
            <div key={api.path} className="grid gap-2 border-b border-slate-100 bg-white px-4 py-4 last:border-b-0 sm:grid-cols-[auto_1fr] sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-brand-50 px-2 py-1 font-mono text-[10px] font-bold text-brand-700">
                  {api.method}
                </span>
                <code className="font-mono text-xs font-semibold text-ink-900">{api.path}</code>
              </div>
              <p className="text-[12px] leading-6 text-ink-500">{api.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-400">
          统一错误结构：<code className="rounded bg-slate-100 px-1">{'{ ok: false, error: { code, message, hint, retryable } }'}</code>
          ，前端据此展示明确原因并提供重试。
        </p>
      </section>

      {/* 演示模式 + 路线图 */}
      <section className="container-page pb-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <span className="chip-brand">
              <Gauge className="h-3 w-3" />
              演示模式
            </span>
            <h2 className="mt-3 text-lg font-bold text-ink-900">没有 Key 也能完整走一遍</h2>
            <p className="mt-2 text-[13px] leading-6 text-ink-500">
              演示模式使用本地模板生成结构一致的结果，并在结果卡片、警告信息中明确标注「演示数据，非真实 AI 识别结果」。
              它不会伪造模型调用，也不会把演示内容写成真实来源。
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-ink-500">
              <li>· 生成结果里包含 [待补充：…] 占位，提醒补充真实参数</li>
              <li>· 平台未配置默认 API 时，真实生成会自动降级并提示</li>
              <li>· 配置真实 Key 后即可切换为 live 模式，结果标签同步变化</li>
            </ul>
          </div>

          <div className="card p-6">
            <span className="chip-brand">
              <Rocket className="h-3 w-3" />
              后续路线
            </span>
            <h2 className="mt-3 text-lg font-bold text-ink-900">V1.0 之后可以做什么</h2>
            <ol className="mt-3 space-y-2 text-[13px] leading-6 text-ink-500">
              {ROADMAP.map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-ink-500">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-[12px] leading-6 text-ink-500">
          <p className="font-semibold text-ink-700">免责声明</p>
          <p className="mt-1.5">
            ProductAI 是独立开发的开源工具，与淘宝、拼多多、抖音、小红书、Amazon、eBay 等平台无任何官方合作或审核关系。
            生成内容由使用者自行判断是否适用于目标平台，涉及商品材质、认证、功效等表述请以真实商品信息为准。
            模型调用产生的费用由对应 API 账号承担。
          </p>
        </div>
      </section>
    </div>
  )
}
