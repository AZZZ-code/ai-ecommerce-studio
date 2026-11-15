# AI E-commerce Studio

> **SMART E-COMMERCE COPYWRITER · V1.0**
> 上传一张商品图，得到可上架的文案、效果图与搜索关键词。

**状态**：本地可运行 · `npm run build` 通过 · 在线 Demo **待部署**

一个面向电商卖家的 AI 内容工作台，覆盖「商品文案生成 / 商品效果图生成 / 智能 SEO 关键词」三条主线。前端 React + Vite + TypeScript + Tailwind CSS，后端是同一仓库里的 Cloudflare Pages Functions，**没有独立的后端服务器，也不需要我的电脑在线**。

支持 OpenAI、DeepSeek、Google Gemini、Anthropic Claude 与任意 OpenAI 兼容接口；视觉模型、文本模型、图片模型三套配置相互独立，可以混搭不同服务商。未配置任何 Key 时，全站以**演示模式**运行并能走完整个流程，所有演示内容都有明确标注，不伪装成真实 AI 结果。

---

## 在线 Demo

> **待部署**

尚未部署到公网，因此这里不提供任何网址。完成 Cloudflare Pages 部署后，本节将更新为实际访问地址（并附 `/api/health` 的自检结果）。部署步骤见下方「部署」与文末 [§11](#11-部署到-cloudflare-pages)。

本机运行方式见「快速开始」，默认地址 `http://localhost:5173`。

---

## 项目截图

以下截图待补（首次部署后统一补入，路径已预留）。图片存放在 `docs/screenshots/`，补图后把「待补」替换为对应文件名即可。

| 页面 | 内容 | 截图 |
| --- | --- | --- |
| 首页 | 品牌区、图片上传入口、能力概览、示例商品 | `docs/screenshots/01-home.png`（待补） |
| 商品文案生成 | 12 项商品信息表单 + 5 张结果卡（可复制 / 编辑 / 单卡重生成） | `docs/screenshots/02-copywriting.png`（待补） |
| AI 图片创作 | 7 种图片类型 / 12 个平台画幅 / 保真与创意模式 / 效果图与文字叠加 | `docs/screenshots/03-image-studio.png`（待补） |
| 智能 SEO | 10 类关键词表 + 平台差异化文案块 + 覆盖统计 | `docs/screenshots/04-seo.png`（待补） |
| AI 模型设置 | 接入模式切换、视觉 / 文本 / 图片三套端点、测试连接 | `docs/screenshots/05-model-settings.png`（待补） |

---

## 项目简介

电商上架的痛点不是「写不出字」，而是**同一件商品要在多个平台写出不同风格的多套内容，还要不编造参数**。本项目把这条链路拆成三段可复用的能力：

1. **识别**：视觉模型只描述图片里看得见的东西（类别、颜色、外观、形状、可见特征、可能场景），并显式列出「无法从图片确认」的属性——材质、尺寸、重量、性能、认证、品牌、功效等，一律不猜。
2. **生成**：文本模型结合商家补充的信息，输出商品标题、3–5 条核心卖点、商品详细介绍、营销推广文案与 SEO 关键词；缺什么就用 `[待补充：xxx]` 占位，提醒商家补齐。
3. **落地**：按平台输出不同结构（淘宝/天猫/京东的标题与详情关键词、拼多多的需求词、抖音/快手的视频标题与话题、小红书的笔记与种草正文、Amazon 的标题/五点/Description/Search Terms、eBay、Shopify、Etsy），并给出可直接交给图片模型的效果图提示词。

**设计红线**：没有提供的信息不编造；没有调用真实模型时全程标注「演示数据」；任何一步失败都如实报错，不展示虚假成功。

---

## 功能说明

状态说明：**已实现** = 真实可用；**演示可用** = 无 Key 时用本地模板 / 占位图跑通流程并明确标注；**未实现** = 当前版本没有。

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 商品图片上传 | 已实现 | 点击 / 拖拽上传、预览、替换、删除；JPG / JPEG / PNG / WEBP，≤ 5MB；前端与后端双向校验（后端按文件头识别真实格式） |
| 商品文案生成 | 已实现 | 标题、3–5 条卖点、详细介绍、营销文案、SEO 关键词；中 / 英 / 中英双语；5 种风格；12 个平台差异化 |
| 结果卡片操作 | 已实现 | 一键复制、就地编辑、单卡片重新生成（复用上次识别结果、不重复调视觉模型）、复制全部结果 |
| 图片识别分析 | 已实现 | 输出类别 / 颜色 / 外观 / 形状 / 可见特征 / 可能场景 + 置信度，并单列「无法确认」的属性 |
| 纯文字生成模式 | 已实现 | 文本模型不支持图片（如 DeepSeek）时可切换：不调视觉模型、图片不会发给任何模型 |
| AI 商品效果图 | 已实现 | 7 种图片类型、12 个平台画幅预设、6 种比例（1:1 / 4:5 / 3:4 / 16:9 / 9:16 / 自定义宽高）、一次 1–4 张、下载 / 删除 / 改提示词重生成、查看模型与参数 |
| 原图保真 / 创意营销 | 已实现 | 保真模式强制要求上传原图、只允许改背景光线与构图；创意模式构图自由但不得把商品变成别的产品；两者都会提示「生成结果可能与实物有细节差异，请人工核对」 |
| 图片文字叠加 | 已实现 | 文字由前端 Canvas 合成（位置 / 字号 / 颜色 / 半透明底衬）并导出 PNG，不依赖图像模型画字，避免错别字与虚假参数 |
| 智能 SEO 关键词 | 已实现 | 10 类关键词（核心 / 属性 / 长尾 / 场景 / 人群 / 需求 / 品牌 / 竞品 / 英文 / 小红书话题），每条含搜索意图、推荐位置、重要程度、是否需要人工确认 |
| 关键词编辑与检查 | 已实现 | 可编辑 / 删除 / 新增、整组复制、跨组去重并展示「已去除 N 个重复词」、覆盖统计；不输出搜索量 / 排名 / 竞争度等没有数据源的数字 |
| 平台差异化文案块 | 已实现 | 淘宝、天猫、京东、拼多多、抖音、快手、小红书、Amazon、eBay、Shopify、Etsy、通用电商各自的文案结构 |
| 多模型接入 | 已实现 | 模式 A 平台默认（服务端环境变量）与模式 B 用户自带 Key（BYOK）；视觉 / 文本 / 图片三套端点可来自不同服务商 |
| 模型测试连接 | 已实现 | 真实发起一次最小请求并回显耗时与模型名；401 / 402 / 429 / 模型不存在 / 网络错误分别给出可操作的提示 |
| 演示模式 | 演示可用 | 无 Key 时全站可跑通；文案与关键词用本地模板、效果图用本地 SVG 占位图，全部标注「演示数据」 |
| 生成结果持久化 / 账号系统 | 未实现 | 无需登录，刷新页面后结果不保留；V1.0 没有数据库 |
| 真实搜索量 / 竞争度数据 | 未实现 | 需要接入第三方数据源；当前关键词只标注为「AI 相关性建议」 |
| 生成图片云端存储 | 未实现 | 图片以 base64 直接返回，未接入 R2 或对象存储 |

---

## 项目特点

- **本地跑的就是线上那一份后端代码**。`npm run dev` 用自写的 Vite 插件把 Node 的 req/res 转成 Web `Request`/`Response`，再 `ssrLoadModule` 加载 `functions/api/*.ts`——不需要登录 Cloudflare、不需要单独起后端进程，也就不会出现「本地能跑、部署就崩」的两套实现。
- **前后端共用一份类型契约**。`shared/types.ts` 是唯一来源，前端 `src/types/index.ts` 直接 re-export，平台清单、图片类型、画幅、关键词分类、文案块结构都在这里定义并同时驱动前后端。
- **平台规范是配置表，不是散落在代码里的字符串**。`PLATFORM_IMAGE_SPEC`（12 个平台的画幅与风格）、`IMAGE_TYPE_META`（7 种图片类型）、`PLATFORM_COPY_FORMATS`（12 个平台的文案块）都可以直接改表，无需动组件。
- **Key 全程不碰浏览器**。平台默认 Key 只读服务端环境变量；用户自带 Key 只在单次请求中经 HTTPS 传给 Functions，用完即丢弃，不写 localStorage、不写日志、不回显（日志里连 `?key=` 与 `Bearer` 都会被打码）。
- **自定义 Base URL 走白名单**。仅 https、禁止 IP 字面量与私网、域名须命中内置白名单或环境变量追加；本机回环调试需要一个显式开关，线上默认关闭。
- **模型能力是硬校验，不是文案提醒**。纯文本模型（如 DeepSeek）在前后端都被拒绝作为视觉模型；把图片传给只支持文本的模型会直接报错，绝不会静默丢图。
- **失败可诊断**。网络错误会区分「浏览器连不上本站接口」与「后端连不上服务商」，并细分 DNS 失败、连接被拒、TLS 失败、连接超时、端口不可用；401 会把服务商原文与 Key 形态判断（OpenAI / Anthropic / Gemini 前缀）一起给出来。
- **演示模式是显式状态，不是兜底假数据**。结果卡、图片、文案块上都有「演示数据」标注，接口 meta 里也写明 provider 与模型为模板。

---

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18、Vite 5、TypeScript 5、Tailwind CSS 3.4、react-router-dom 6、lucide-react | Tailwind 固定 3.4（生态稳定、构建可预期，不引入 4.x 迁移风险） |
| 后端 | Cloudflare Pages Functions（`functions/api/*.ts`，仅用标准 Web API） | 与前端同仓库、同类型，部署即生效；无 Node 内置模块依赖 |
| 共享层 | `shared/types.ts` 单一契约 | 前后端类型与配置表同源，杜绝字段漂移 |
| 本地开发 | 自写 Vite 插件 `scripts/devApiPlugin.ts` | dev / preview 都能直接跑 Functions 代码 |
| 模型接入 | OpenAI、DeepSeek、Google Gemini、Anthropic Claude、OpenAI 兼容接口；图片侧 OpenAI GPT Image、Gemini Image、DeepSeek 协议通道、自定义接口 | 每家单独适配请求格式，不假设彼此兼容 |
| 部署 | Cloudflare Pages（`wrangler.toml` + `_routes.json` + `_headers` + `_redirects`） | 静态资源 + Functions 同源发布，SPA 路由与 API 互不干扰 |

生产构建实测（`npm run build`，1608 个模块）：

```
dist/index.html                 0.95 kB │ gzip:   0.68 kB
dist/assets/index-*.css        41.56 kB │ gzip:   7.26 kB
dist/assets/index-*.js        385.45 kB │ gzip: 129.12 kB
```

---

## 快速开始

```bash
git clone https://github.com/AZZZ-code/ai-ecommerce-studio.git   # 或直接下载 ZIP
cd ai-ecommerce-studio
npm install
npm run dev          # → http://localhost:5173
```

**不需要任何 Key 就能打开全站**：默认进入演示模式，三个生成页都能走完流程。

想接真实模型（两种方式，任选）：

- **方式 A · 平台默认**：`cp .dev.vars.example .dev.vars`，填入 `DEFAULT_PROVIDER` 与对应服务商的 `*_API_KEY`（图片另配 `IMAGE_PROVIDER` + `*_IMAGE_API_KEY`），重启 `npm run dev`。
- **方式 B · 用户自带 Key（BYOK）**：直接打开 `/models` → 选「B · 用户自带 API」→ 填服务商 / Base URL / Key / 模型名 → 测试连接 → 保存（只保存服务商与模型名，**Key 不进任何存储**）。

其他脚本：

```bash
npm run build      # tsc -b && vite build（类型检查 + 生产构建）
npm run preview    # 用 dist 起本地预览，且同样带 /api/*
npm run typecheck  # 只做类型检查
```

页面路由：`/` 首页 · `/generate` 商品文案 · `/studio` AI 图片创作 · `/seo` 智能 SEO · `/models` 模型设置 · `/about` 项目介绍。

---

## 部署

推荐 **Cloudflare Pages**（前端静态资源与 Functions 同源发布）：

1. Dashboard → Workers & Pages → Create → Pages → Connect to Git，选择本仓库；
2. 构建配置：Framework `Vite`、Build command `npm run build`、Output directory `dist`、Root directory 留空（仓库根即项目根）；
3. Settings → Environment variables 填入服务端变量（至少 `DEFAULT_PROVIDER` + 一个文本模型 Key；出图另配 `IMAGE_PROVIDER` + 图片 Key），**不要把 `ALLOW_LOOPBACK_BASE_URL` 带上线**；
4. 部署完成后访问 `https://<你的域名>/api/health`，返回 `{"ok":true,"runtime":"pages-functions",...}` 即表示后端已就绪。

也可以用命令行：`wrangler pages deploy dist --project-name <项目名>`（本项目已提供 `wrangler.toml`）。

完整的变量清单、Secrets 表、上线检查清单、线上限制（单请求约 30 秒、限流为单实例内存计数、图片以 base64 返回）见 [§11](#11-部署到-cloudflare-pages)。

---

## GitHub 仓库

- 地址：<https://github.com/AZZZ-code/ai-ecommerce-studio>
- 分支：`main`（本地与远端同步）
- 仓库内容：源码 + `functions/` + `shared/` + `public/` + 配置文件；`node_modules/`、`dist/`、`.dev.vars`、`.env*`、`.tmp/` 均已忽略
- 注意：仓库里**没有任何真实 Key**，只有 `.dev.vars.example` 模板（键为空）

> 小提示：如果你所在网络访问 `github.com:443` 不稳定，可以走 SSH 443 端口：
> `git remote set-url origin ssh://git@ssh.github.com:443/AZZZ-code/ai-ecommerce-studio.git`

---

## 详细文档

下面的章节是完整的技术文档（接口、架构、安全、验证记录），按需查阅。

1. [功能一览](#1-功能一览) — 逐模块的已实现清单
2. [技术栈与选型说明](#2-技术栈与选型说明) — 每个技术选择的原因
3. [目录结构](#3-目录结构)
4. [本地运行](#4-本地运行)
5. [环境变量](#5-环境变量)
6. [两种接入模式](#6-两种接入模式)
7. [后端接口](#7-后端接口) — 6 个接口的请求 / 响应 / 错误码
8. [架构：统一模型适配层](#8-架构统一模型适配层)
9. [安全设计](#9-安全设计)
10. [演示模式](#10-演示模式)
11. [部署到 Cloudflare Pages](#11-部署到-cloudflare-pages) — 含 Secrets 表与上线检查清单
12. [已验证内容](#12-已验证内容) — 构建、适配器单测、接口联调、浏览器 E2E
13. [已知限制（V1.0）](#13-已知限制v10)
14. [路线图](#14-路线图)
15. [免责声明](#15-免责声明)

---

## 1. 功能一览

| 模块 | 已实现内容 |
| --- | --- |
| 首页 | 品牌标语、图片上传入口、核心能力、四步流程、三张示例商品图、底部 CTA 与版权信息 |
| 商品文案生成页 | 上传（点击 / 拖拽 / 预览 / 重新上传 / 删除）、12 项选填商品信息、平台 / 风格 / 语言选择、生成中骨架屏、5 张结果卡片、一键复制、编辑、单卡片重新生成、复制全部结果、错误提示与重试 |
| 图片识别 | 视觉模型输出类别、颜色、外观、形状、可见特征、可能场景，并显式标注**无法从图片确认**的属性（材质 / 尺寸 / 性能 / 认证 / 品牌等） |
| 多模型设置页 | 模式 A（平台默认 API）与模式 B（BYOK）切换、视觉 / 文本双端点独立配置（可来自不同服务商）、Base URL、API Key、模型名、测试连接、保存（不含密钥）/ 删除配置 / 清除内存密钥、服务商能力说明 |
| 多服务商适配 | OpenAI、DeepSeek、Google Gemini、Anthropic Claude、OpenAI 兼容接口；四家分别适配请求格式，不假设彼此兼容 |
| 纯文字生成模式 | 文本模型不支持图片时（如 DeepSeek），可切换「仅文字生成」：不调用视觉模型、图片不会发给任何模型，未填写的属性以 `[待补充：xxx]` 标出 |
| 项目介绍页 | 产品定位、目标用户、生成流程、技术架构、安全设计、接口说明、路线图、免责声明 |
| 演示模式 | 未配置任何 API 也能跑通全流程；所有内容明确标注为演示数据，不是真实 AI 识别结果 |
| AI 图片创作页 | 上传商品原图 → 选图片类型（7 种）/ 平台（12 个）/ 画幅（6 种 + 自定义宽高）/ 保真或创意模式 → AI 生成效果图；支持一次出 1–4 张、下载、删除、改提示词重生成、查看模型与参数 |
| 智能 SEO 页 | 一次生成 10 类关键词（核心 / 属性 / 长尾 / 场景 / 人群 / 需求 / 品牌 / 竞品 / 英文 / 小红书话题）+ 按平台格式输出的上架文案块；关键词可编辑、删除、新增、整组复制，附覆盖统计与去重说明 |
| 图片文字叠加 | 画面里的文字不用图像模型画，而是前端 Canvas 合成：可调位置 / 字号 / 颜色 / 半透明底衬，直接导出 PNG，避免错别字与虚假参数 |
| 后端 | `POST /api/generate`、`POST /api/generate-image`、`POST /api/seo-keywords`、`POST /api/test-connection`、`GET /api/models`、`GET /api/health`，含格式 / 大小 / 枚举 / 限流 / 超时 / 上游错误处理与日志脱敏 |

文案生成永远遵守一条红线：**没有提供的信息不编造**。模型会被要求用 `[待补充：xxx]` 占位提醒商家自己补齐材质、尺寸、重量、性能、认证、品牌、功效等无法从图片确认的内容。

---

## 2. 技术栈与选型说明

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18、Vite 5、TypeScript 5、Tailwind CSS 3.4、react-router-dom 6、lucide-react | Tailwind 仍用 3.4：生态稳定、构建结果可预期，不引入 4.x 的迁移风险 |
| 后端 | Cloudflare Pages Functions（`functions/api/*.ts`） | 与前端同一个仓库、同一套类型定义，部署即生效，无需额外服务器 |
| 类型 | `shared/types.ts` 单一契约 | 前端 `src/types/index.ts` 直接 re-export，后端相对路径引用，避免前后端类型漂移 |
| 本地联调 | 自写 Vite 插件 `scripts/devApiPlugin.ts` | `npm run dev` 时把 Node 的 req/res 转成 Web `Request`/`Response`，再用 `ssrLoadModule` 加载 `functions/api/*.ts`。**本地跑的就是线上同一份 Functions 代码**，不需要登录 Cloudflare、不需要 `wrangler login` |

> 之所以没有强制走 `wrangler pages dev`：它需要 Cloudflare 账号 / 网络环境，且编译链路更重。本项目把 wrangler 保留为 devDependency，`npm run pages:dev` 仍可用，但日常开发推荐 `npm run dev`。

---

## 3. 目录结构

```
ProductAI/
├── public/
│   ├── favicon.svg
│   ├── _redirects                 # SPA 路由回退（Cloudflare Pages）
│   ├── _routes.json               # 只让 /api/* 走 Functions
│   ├── _headers                   # 安全响应头与静态资源缓存策略
│   └── samples/                   # 三张示例商品图（SVG，前端会转成 PNG 上传）
│       ├── sample-bottle.svg
│       ├── sample-earbuds.svg
│       └── sample-tote.svg
├── docs/
│   └── screenshots/               # README 截图（待补，见「项目截图」）
├── shared/
│   └── types.ts                   # 前后端共用契约：枚举、payload、响应、平台/风格元数据
├── src/
│   ├── components/                # Navbar / Footer / Layout / Uploader / Field / OptionGroup
│   │                              # Alert / Spinner / ResultCard / AnalysisPanel / GeneratingPanel
│   │                              # KeywordTable（关键词表）/ TextOverlayEditor（Canvas 文字合成）
│   ├── hooks/                     # useCopy / useModelCatalog
│   ├── lib/                       # utils(cn、复制、格式化) / image(校验、URL→File) / keyShape(Key 形态提示)
│   ├── pages/                     # HomePage / GeneratePage / StudioPage（图片创作）/ SeoPage（智能 SEO）
│   │                              # ModelsPage / AboutPage / NotFoundPage
│   ├── services/
│   │   ├── api.ts                 # 6 个接口的 fetch 封装（超时、错误归一化、健康探针）
│   │   ├── demo.ts                # 演示数据与文案模板
│   │   ├── demoStudio.ts          # 图片创作 / SEO 的演示数据（含本地 SVG 占位图）
│   │   ├── pending.ts             # 首页 → 生成页的图片/示例交接（内存）
│   │   ├── sessionKeys.ts         # 跨页传递 BYOK Key（只存在 JS 内存，刷新即失）
│   │   └── storage.ts             # 偏好设置（localStorage，显式白名单，绝不含 Key）
│   ├── types/index.ts             # re-export shared/types
│   ├── App.tsx / main.tsx / index.css
├── functions/
│   └── api/
│       ├── generate.ts            # POST /api/generate
│       ├── generate-image.ts      # POST /api/generate-image
│       ├── seo-keywords.ts        # POST /api/seo-keywords
│       ├── test-connection.ts     # POST /api/test-connection
│       ├── models.ts              # GET  /api/models
│       ├── health.ts              # GET  /api/health（后端自检，不返回任何 Key）
│       └── _lib/
│           ├── ai/
│           │   ├── types.ts       # ProviderAdapter / ProviderCall / joinEndpoint
│           │   ├── openai.ts      # OpenAI 与 OpenAI 兼容接口（共用实现）
│           │   ├── gemini.ts      # Gemini generateContent + inlineData
│           │   ├── claude.ts      # Anthropic messages + image block
│           │   ├── deepseek.ts    # DeepSeek chat/completions（纯文本模型，绝不接收图片）
│           │   ├── catalog.ts     # 服务商注册表 + 模型能力/视觉能力判定
│           │   ├── router.ts      # ModelRouter：模式 A/B 解析、视觉/文本分离调用
│           │   ├── json.ts        # 超时 fetch、上游错误映射、JSON 抽取
│           │   └── image/         # 图片生成适配层（与文本/视觉完全分开）
│           │       ├── types.ts   # ImageProviderAdapter / size 预设 / mime 推断
│           │       ├── openaiImage.ts   # /images/edits（有原图）与 /images/generations
│           │       ├── geminiImage.ts   # generateContent + responseModalities:[TEXT,IMAGE]
│           │       ├── deepseekImage.ts # DeepSeek 图片通道（协议预留，官方暂无图片模型）
│           │       ├── customImage.ts   # 自定义 OpenAI 兼容图片接口
│           │       ├── catalog.ts # 图片服务商注册表与可选模型
│           │       └── router.ts  # 图片端解析、BYOK 校验、生成与连通性测试
│           ├── prompts.ts         # 视觉 / 文案提示词、平台与风格规则、结果归一化
│           ├── imagePrompts.ts    # 效果图提示词：保真/创意规则、负面词、平台风格与构图
│           ├── seoPrompts.ts      # SEO 提示词、10 类关键词归一化、去重与覆盖统计
│           ├── validate.ts        # 文件头嗅探、大小/格式/枚举校验、data URL 编解码
│           ├── ssrf.ts            # Base URL 白名单与内网防护
│           ├── ratelimit.ts       # 内存滑窗限流（按 IP）
│           ├── errors.ts          # ApiError + 上游状态码映射 + 敏感信息脱敏
│           ├── http.ts            # jsonOk / jsonError / withErrorHandling
│           └── types.ts           # Env / PagesContext / PagesFunction（不依赖 workers-types）
├── scripts/devApiPlugin.ts        # Vite 中间件，把 /api/* 转发给 Functions
├── index.html · package.json · tsconfig*.json · tailwind.config.js · postcss.config.js
├── wrangler.toml                  # Cloudflare Pages 项目配置（不含任何密钥）
├── .dev.vars.example              # 环境变量示例
└── README.md
```

---

## 4. 本地运行

环境要求：Node.js ≥ 20（`package.json` 已声明 `engines`；开发时使用 Node 24 / npm 11 验证通过）。

```bash
npm install
cp .dev.vars.example .dev.vars   # Windows: copy .dev.vars.example .dev.vars
npm run dev                      # http://localhost:5173
```

`.dev.vars` 全部留空也能启动：此时进入**演示模式**，所有页面与交互都可完整走通。

其他脚本：

```bash
npm run build       # tsc -b && vite build（产物在 dist/）
npm run preview     # 预览生产构建（不含 /api，接口仍需 npm run dev 或 cloudflare pages dev）
npm run typecheck   # 只做类型检查
npm run pages:dev   # wrangler pages dev dist（真实 Workers 运行时）
npm run pages:deploy# 构建并部署到 Cloudflare Pages
```

> `npm run preview` 只起静态服务，不加载 `functions/`，所以接口会 404 —— 这是预期行为，接口联调请用 `npm run dev`。

---

## 5. 环境变量

复制 `.dev.vars.example` 为 `.dev.vars`（本地）或在 **Cloudflare Pages → Settings → Environment variables** 中配置（线上）。**所有密钥只存在于服务端运行时**，不会返回给前端。

| 变量 | 作用 |
| --- | --- |
| `DEFAULT_PROVIDER` | 模式 A 默认服务商：`openai` / `deepseek` / `gemini` / `claude` / `compatible`；未设置时自动选择第一个已配置 Key 的服务商 |
| `DEFAULT_VISION_PROVIDER` `DEFAULT_TEXT_PROVIDER` | 分别指定平台默认的视觉端与文本端服务商（留空回落到 `DEFAULT_PROVIDER`）。DeepSeek 只有文本模型，永远不会被选为视觉端 |
| `OPENAI_API_KEY` `OPENAI_BASE_URL` `OPENAI_VISION_MODEL` `OPENAI_TEXT_MODEL` | OpenAI 平台默认配置 |
| `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` `DEEPSEEK_TEXT_MODEL` | DeepSeek 平台默认配置（Base URL 默认 `https://api.deepseek.com`，文本模型 `deepseek-chat` / `deepseek-reasoner`）。DeepSeek 无视觉模型，`DEEPSEEK_VISION_MODEL` 仅为兼容旧部署保留，填了也不会被采用 |
| `GEMINI_API_KEY` `GEMINI_BASE_URL` `GEMINI_VISION_MODEL` `GEMINI_TEXT_MODEL` | Google Gemini |
| `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` `ANTHROPIC_VISION_MODEL` `ANTHROPIC_TEXT_MODEL` | Anthropic Claude |
| `COMPATIBLE_API_KEY` `COMPATIBLE_BASE_URL` `COMPATIBLE_VISION_MODEL` `COMPATIBLE_TEXT_MODEL` | OpenAI 兼容服务商（DeepSeek、通义、智谱、Moonshot、自建网关等） |
| `IMAGE_PROVIDER` | 平台默认图片服务商：`openai-image` / `gemini-image` / `deepseek-image` / `custom-image`；留空自动选第一个填了 Key 的 |
| `OPENAI_IMAGE_API_KEY` `OPENAI_IMAGE_BASE_URL` `OPENAI_IMAGE_MODEL` | OpenAI 图片生成（`gpt-image-1` 支持传入原图编辑，`dall-e-3` 只能文生图） |
| `GEMINI_IMAGE_API_KEY` `GEMINI_IMAGE_BASE_URL` `GEMINI_IMAGE_MODEL` | Google Gemini 图片生成 |
| `DEEPSEEK_IMAGE_API_KEY` `DEEPSEEK_IMAGE_BASE_URL` `DEEPSEEK_IMAGE_MODEL` | DeepSeek 图片通道（按 OpenAI Images 兼容协议预留）。**DeepSeek 官方目前没有公开的图片生成模型**，只有你确认账户或兼容网关真的提供该图片模型时才有意义；模型名必填，调用失败会如实报错 |
| `CUSTOM_IMAGE_API_KEY` `CUSTOM_IMAGE_BASE_URL` `CUSTOM_IMAGE_MODEL` | 自定义图片接口（仅 OpenAI Images API 兼容） |
| `IMAGE_TIMEOUT_MS` | 单次图片生成超时（毫秒），默认 120000，服务端限制 15s–180s |
| `ALLOW_CUSTOM_BASE_URL_HOSTS` | 追加允许的 Base URL 域名（逗号分隔，仅 https） |
| `ALLOW_LOOPBACK_BASE_URL` | 是否允许 BYOK 使用 `http://127.0.0.1` / `http://localhost`（**仅本地调试自建网关时设为 true**，默认关闭） |
| `RATE_LIMIT_PER_MINUTE` | 单 IP 每分钟生成次数上限，默认 12 |
| `AI_TIMEOUT_MS` | 单次模型调用超时（毫秒），默认 60000，服务端限制在 10s–120s |

视觉模型、文本模型、图片模型是**三套独立配置**：视觉模型识别图片，文本模型写文案，图片模型出效果图，三者可以来自不同服务商（例如视觉用 Gemini、文案用 DeepSeek、图片用 OpenAI）。

---

## 6. 两种接入模式

### 模式 A · 平台默认 API

管理员在后端配置 Key，普通用户什么都不用填，上传图片即可生成。`GET /api/models` 只会返回**模型名**与"是否已配置"，不会返回任何 Key。

### 模式 B · 用户自带 API（BYOK）

用户在「AI 模型设置」页填写：服务商、API Base URL、API Key、视觉模型名、文本模型名。

密钥的处理方式：

1. 只保存在当前页面的 JS 内存（`src/services/sessionKeys.ts`）用于跨页传递，**不写 localStorage / sessionStorage / cookie**；
2. 生成时通过 HTTPS 放进请求体发给后端；
3. 后端只在本次请求内使用，处理结束即随请求作用域丢弃，**不写日志、不回显、不落库**；
4. 错误信息经过脱敏（`sk-`、`AIza` 片段会被抹掉），前端拿不到原始上游报文里的密钥。

偏好设置（接入模式、平台、风格、语言、模型名、Base URL）会保存在 localStorage，但**保存时的字段是显式白名单，结构上就不包含 apiKey**。

---

## 7. 后端接口

所有响应 `content-type: application/json; charset=utf-8`，并带 `cache-control: no-store`。

### 7.1 `GET /api/models`

返回服务商清单、模型能力、平台默认配置状态与限制。

```json
{
  "providers": [
    {
      "id": "openai",
      "label": "OpenAI",
      "requiresBaseUrl": false,
      "defaultBaseUrl": "https://api.openai.com/v1",
      "docsUrl": "https://platform.openai.com/docs/api-reference/chat",
      "requestFormat": "POST /v1/chat/completions，Authorization: Bearer <key>，图片用 image_url",
      "visionModels": [{ "id": "gpt-4o-mini", "label": "gpt-4o-mini", "supportsVision": true }],
      "textModels": [{ "id": "gpt-4o-mini", "label": "gpt-4o-mini", "supportsVision": true }]
    }
  ],
  "platformDefault": {
    "configured": false,
    "vision": null,
    "text": null
  },
  "demoMode": true,
  "limits": {
    "maxUploadBytes": 5242880,
    "acceptedMimeTypes": ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    "rateLimitPerMinute": 12
  }
}
```

`demoMode: true` 表示「演示模式始终可用」，与是否配置了真实模型无关。

### 7.2 `POST /api/generate`

`multipart/form-data`：

- `image`：图片文件（JPG / JPEG / PNG / WEBP，≤ 5MB，按文件头校验真实类型）。使用「仅文字生成」（`skipVision: true`）时可以不传
- `payload`：JSON 字符串

```json
{
  "mode": "platform",
  "platform": "taobao",
  "style": "marketing",
  "language": "bilingual",
  "product": {
    "name": "雾蓝保温杯",
    "category": "保温杯",
    "color": "雾蓝",
    "material": "",
    "size": "",
    "price": "",
    "brand": "",
    "targetCustomer": "",
    "scenarios": "",
    "functions": "",
    "features": "",
    "extra": ""
  },
  "modelConfig": {
    "vision": { "provider": "gemini", "baseUrl": "", "apiKey": "...", "model": "gemini-2.0-flash" },
    "text": { "provider": "openai", "baseUrl": "", "apiKey": "...", "model": "gpt-4o-mini" }
  },
  "regenerateSection": "marketing",
  "reuseAnalysis": { "category": "保温杯", "colors": ["雾蓝"], "confidence": 0.8 }
}
```

- `mode: "byok"` 时必须提供 `modelConfig`；`mode: "platform"` 时忽略该字段。
- `regenerateSection` + `reuseAnalysis` 用于**单卡片重新生成**：此时跳过视觉调用，只重新生成指定模块，返回的 `data.copy.sections` 只包含该模块。
- `skipVision: true` 表示「仅文字生成」：不调用视觉模型，`modelConfig.vision` 可省略，`data.analysis.source` 会返回 `"text-only"`，`meta.visionModel` 记为 `未使用（仅文字生成）`。适合 DeepSeek 这类纯文本模型。
- BYOK 时视觉模型与文本模型可以来自不同服务商（例如视觉 `compatible`、文本 `deepseek`），`meta.provider` 记录视觉端服务商。

成功响应：

```json
{
  "ok": true,
  "mode": "live",
  "data": {
    "analysis": {
      "category": "保温杯",
      "colors": ["雾蓝色"],
      "appearance": "圆柱形杯身，带提环杯盖",
      "shape": "圆柱形",
      "visibleFeatures": ["可旋开的杯盖", "杯身刻度线"],
      "possibleScenarios": ["通勤携带"],
      "unconfirmedAttributes": ["容量", "保温时长", "材质"],
      "confidence": 0.82
    },
    "copy": {
      "sections": [
        { "key": "title", "zh": "…", "en": "…" },
        { "key": "sellingPoints", "zh": "1. …\n2. …", "en": "1. …", "zhList": ["…"], "enList": ["…"] },
        { "key": "description", "zh": "…", "en": "…" },
        { "key": "marketing", "zh": "…", "en": "…" },
        { "key": "keywords", "zh": "a · b · c", "en": "a · b · c", "zhList": ["a"], "enList": ["a"] }
      ],
      "title": { "zh": "…", "en": "…" },
      "sellingPoints": { "zh": ["…"], "en": ["…"] },
      "description": { "zh": "…", "en": "…" },
      "marketing": { "zh": "…", "en": "…" },
      "keywords": { "zh": ["…"], "en": ["…"] }
    }
  },
  "meta": {
    "provider": "compatible",
    "visionModel": "gemini-2.0-flash",
    "textModel": "gpt-4o-mini",
    "latencyMs": 4210,
    "accessMode": "byok",
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "warnings": ["未填写材质与尺寸，文案不会编造这两项信息，相关位置会保留占位提示。"]
}
```

失败响应统一结构：

```json
{ "ok": false, "error": { "code": "INVALID_FILE", "message": "无法识别该文件，仅支持 JPG / JPEG / PNG / WEBP 图片。", "hint": null, "retryable": false } }
```

| code | HTTP | 含义 |
| --- | --- | --- |
| `INVALID_REQUEST` | 400 | 请求体 / multipart 字段缺失或格式错误 |
| `INVALID_PAYLOAD` | 400 | payload JSON 不合法或枚举值不在白名单 |
| `INVALID_FILE` | 400 | 文件为空、格式不支持、扩展名与内容不符 |
| `FILE_TOO_LARGE` | 413 | 超过 5MB |
| `INVALID_MODEL_CONFIG` | 400 | BYOK 缺 Key / 模型名 / Base URL |
| `UNSUPPORTED_VISION_MODEL` | 400 | 所选模型不支持图片输入，不允许作为视觉模型 |
| `NO_VISION_MODEL` | 400 | 当前配置里没有可用的视觉模型（如只配了 DeepSeek），需换视觉模型或改用「仅文字生成」 |
| `MODEL_NOT_FOUND` | 400 | 上游报模型不存在（如 DeepSeek `Model Not Exist`） |
| `UPSTREAM_INSUFFICIENT_BALANCE` | 502 | 上游余额不足（DeepSeek 402），不会伪装成成功 |
| `BLOCKED_BASE_URL` | 400 | 自定义 Base URL 未通过白名单 / 内网地址 / 非 https |
| `NO_MODEL_CONFIG` | 400 | 平台未配置默认模型且未使用 BYOK（前端引导到演示模式） |
| `UPSTREAM_UNAUTHORIZED` | 400 | 上游 401/403，通常是 Key 错误或无该模型权限 |
| `UPSTREAM_RATE_LIMIT` | 502 | 上游 429 |
| `UPSTREAM_TIMEOUT` | 504 | 上游超时（`retryable: true`） |
| `UPSTREAM_ERROR` | 502 | 上游其它错误 / 网络失败 |
| `BAD_MODEL_OUTPUT` | 502 | 模型返回内容无法解析为约定 JSON |
| `RATE_LIMITED` | 429 | 触发站点限流（附 `Retry-After`） |
| `METHOD_NOT_ALLOWED` | 405 | 方法不支持 |
| `INTERNAL_ERROR` | 500 | 未预期异常 |

### 7.3 `POST /api/test-connection`

`application/json`，只做连通性验证，不生成文案：

```json
{
  "target": "both",
  "vision": { "provider": "openai", "baseUrl": "", "apiKey": "sk-...", "model": "gpt-4o-mini" },
  "text": { "provider": "openai", "baseUrl": "", "apiKey": "sk-...", "model": "gpt-4o-mini" }
}
```

```json
{
  "ok": false,
  "target": "both",
  "results": {
    "vision": { "ok": true, "model": "gpt-4o-mini", "latencyMs": 812, "message": "视觉模型连接成功。", "sample": "…" },
    "text": { "ok": false, "model": "gpt-4o-mini", "latencyMs": 233, "message": "模型服务鉴权失败（HTTP 401）", "sample": null }
  }
}
```

视觉测试会真的发一张 1×1 PNG，因此能验证"该模型确实支持图片输入"；文本测试发一句最短指令。

---

### 7.4 `POST /api/generate-image`（AI 商品效果图）

`multipart/form-data`：`image`（商品原图，可选；保真模式必填）+ `payload`（JSON 字符串）。

```json
{
  "mode": "platform",
  "platform": "amazon",
  "imageType": "selling-point",
  "fidelity": "fidelity",
  "ratio": "4:5",
  "width": 1024,
  "height": 1280,
  "count": 2,
  "prompt": "放在木质桌面上，旁边有一杯咖啡",
  "product": { "name": "户外运动保温杯", "category": "保温杯", "material": "316 不锈钢" }
}
```

```json
{
  "ok": true,
  "mode": "live",
  "platform": "amazon",
  "imageType": "selling-point",
  "fidelity": "fidelity",
  "images": [
    { "id": "img_1", "url": "data:image/png;base64,…", "demo": false, "width": 1024, "height": 1280, "format": "png", "prompt": "…", "createdAt": "…" }
  ],
  "prompt": "（发给模型的完整提示词）",
  "negativePrompt": "text, watermark, logo, distorted product …",
  "meta": { "provider": "openai-image", "model": "gpt-image-1", "quality": "high", "format": "png", "width": 1024, "height": 1280, "latencyMs": 12840, "accessMode": "platform" },
  "warnings": ["商品保真模式下只允许改背景/光线/角度/构图…", "画面中的文字由前端 Canvas 叠加…"]
}
```

要点：

- **保真模式**（默认）必须有原图，后端校验后把原图一起发给支持图片编辑的模型（OpenAI `/images/edits`、Gemini `inline_data`）；模型若不支持传入原图会明确 warning，不静默丢图。
- **创意模式**可以不带原图，但提示词里同样禁止把商品改成别的产品。
- 尺寸：后端把宽高换算成服务商支持的 size 预设（OpenAI 用 `1024x1024` / `1024x1536` / `1536x1024`）；Gemini 不接受尺寸参数，画幅只能写进提示词，结果里会如实反映实际宽高。
- 未配置图片模型时返回 `NO_IMAGE_MODEL`；前端在允许降级时使用演示占位图并明确标注。

### 7.5 `POST /api/seo-keywords`（智能 SEO 关键词）

`application/json`：

```json
{
  "mode": "platform",
  "platform": "amazon",
  "style": "marketing",
  "language": "bilingual",
  "product": { "name": "户外运动保温杯", "category": "保温杯", "brand": "Acme", "material": "316 不锈钢" },
  "competitorInfo": "（可选，仅在用户提供真实竞品信息时才生成竞品对比词）"
}
```

```json
{
  "ok": true,
  "mode": "live",
  "platform": "amazon",
  "groups": [
    { "id": "core", "label": "核心关键词", "labelEn": "Core Keywords", "description": "商品名称与主要品类，决定流量入口",
      "keywords": [ { "term": "insulated water bottle", "intent": "直接购买意图", "placement": "Amazon 商品标题前段", "importance": "high", "needsReview": false } ] }
  ],
  "copyBlocks": [ { "id": "title", "label": "英文标题", "labelEn": "Title", "content": "…" } ],
  "coverage": { "total": 11, "unique": 10, "duplicatesRemoved": 1, "high": 3, "medium": 4, "low": 3, "needsReview": 3, "byGroup": [{ "id": "core", "label": "核心关键词", "count": 2 }] },
  "warnings": ["关键词是 AI 相关性建议，未提交任何平台的官方审核，也不代表实际搜索排名。"],
  "meta": { "provider": "openai", "model": "gpt-4o-mini", "latencyMs": 6120, "accessMode": "platform", "generatedAt": "…" }
}
```

要点：

- 10 类关键词固定顺序，缺失的类别返回空数组而不是伪造内容；**竞品对比词只在使用者提供了竞品信息时才生成**，且强制 `needsReview: true`。
- 品牌类词只用使用者填写的真实品牌，不臆造品牌名。
- 后端做同组内 + 全局去重，`coverage.duplicatesRemoved` 记录被去掉的数量；前端在此基础上继续去重并累加展示。
- 平台文案块（标题 / 五点 / Description / Search Terms 等）由 `shared/types.ts` 的 `PLATFORM_COPY_FORMATS` 定义，前后端共用同一张表，避免 id 漂移。
- 接口不会返回任何搜索量、排名、竞争度、转化率数字 —— 这些需要真实数据源，当前一律标注为「AI 相关性建议」。


## 8. 架构：统一模型适配层

```
浏览器（React）
   │  multipart: image + payload(JSON)
   ▼
Cloudflare Pages Functions  functions/api/generate.ts
   │  ① 限流 ② 文件校验 ③ payload 枚举校验 ④ 选择模式 A/B
   ▼
ModelRouter  functions/api/_lib/ai/router.ts
   ├─ resolvePlatformConfig(env)      → 平台默认（只读环境变量）
   ├─ resolveByokConfig(payload)      → 用户自带（校验 provider/key/model + 视觉能力 + SSRF 白名单）
   ├─ checkVisionSupport(provider, model) → 纯文本模型禁止当视觉模型
   ├─ runVision(...) → ProviderAdapter.call()
   └─ runText(...)   → ProviderAdapter.call()
   ▼
ProviderAdapter（统一契约：system + prompt + 可选图片 data URL → 文本）
   ├─ OpenAIProvider      （chat/completions，图片 image_url）
   ├─ DeepSeekProvider    （chat/completions，Bearer 鉴权，纯文本，见 8.1）
   ├─ GeminiProvider      （generateContent，inlineData，?key= 鉴权）
   ├─ ClaudeProvider      （messages，image base64 block，anthropic-version 头）
   └─ CompatibleProvider  （OpenAI 格式的第三方兼容接口，不发送 response_format）
   ▼
prompts.ts：extractJsonObject → normalizeAnalysis / normalizeCopyResult（容忍多包一层外壳与字段别名）
```

新增服务商只需要：在 `ai/` 下实现一个 `ProviderAdapter`，在 `catalog.ts` 注册，并在 `.dev.vars` 增加对应环境变量键，前端无需改动。

不同厂商的差异全部封在 Provider 内部，不允许"假定所有接口都兼容 OpenAI"：

- OpenAI：`Authorization: Bearer`，图片 `image_url`（data URL），支持 `response_format: json_object`
- DeepSeek：`Authorization: Bearer`，`POST {baseUrl}/chat/completions`，`deepseek-reasoner` 不发送 `temperature` / `top_p` / `response_format`
- Gemini：`x-goog-api-key` 走 query，图片 `inlineData`，system 用 `systemInstruction`，JSON 用 `responseMimeType`
- Claude：`x-api-key` + `anthropic-version: 2023-06-01`，图片是 `image` block，system 是顶层字段
- Compatible：OpenAI 格式但不带 `response_format`（很多兼容网关不认这个字段）

### 8.1 DeepSeek 接入说明（纯文本模型）

DeepSeek 只提供文本模型，因此它在 ProductAI 里的定位是**文案生成器**，不是图片识别器：

| 项目 | 行为 |
| --- | --- |
| Base URL | 默认 `https://api.deepseek.com`，也可填 `https://api.deepseek.com/v1`（两种写法都不会重复拼接版本号） |
| 接口 | `POST /chat/completions`，`Authorization: Bearer <API_KEY>`，`Content-Type: application/json` |
| 模型 | `deepseek-chat`、`deepseek-reasoner`；模型名允许手填，但不会凭空支持不存在的模型 |
| 图片 | **绝不发送**。视觉端选中 DeepSeek 时后端直接拒绝（`NO_VISION_MODEL`），`deepseekProvider.call()` 收到 `imageDataUrl` 也会在发请求前抛错 |
| 生成方式 | 在生成页选择「仅文字生成」，或用「视觉模型 OpenAI/Gemini/Claude + 文本模型 DeepSeek」的组合 |
| 错误映射 | 401 鉴权失败、402 余额不足、400 `Model Not Exist` → `MODEL_NOT_FOUND`、429 限流、超时 → `UPSTREAM_TIMEOUT`；失败一律如实返回，不会伪造成功 |
| `deepseek-reasoner` | 思维链在 `reasoning_content`，正文取 `choices[0].message.content`；不发送采样参数与 JSON 模式（官方不支持） |

DeepSeek 作为文本模型时的两种典型配置：

1. **纯文字**：`DEFAULT_TEXT_PROVIDER=deepseek` + `DEEPSEEK_API_KEY`，生成时勾选「仅文字生成」——不调用视觉模型，图片不会离开浏览器之外。
2. **混合**：`DEFAULT_VISION_PROVIDER=openai` + `DEFAULT_TEXT_PROVIDER=deepseek`（或 BYOK 里分别填两个服务商）。图片由视觉模型识别成结构化文本，再交给 DeepSeek 写标题、卖点、介绍、营销文案与关键词。

---

### 8.2 图片模型 vs 文本模型（为什么必须分开）

| | 文本 / 视觉模型 | 图片模型 |
| --- | --- | --- |
| 用途 | 识别图片、写标题 / 卖点 / 描述 / 关键词 | 生成商品效果图 |
| 协议 | `chat/completions`（OpenAI 系）、`generateContent`（Gemini）、`messages`（Claude） | `/images/edits` + `/images/generations`（OpenAI 系）、`generateContent` + `responseModalities:[TEXT,IMAGE]`（Gemini） |
| 入参 | 文本 + 可选图片 | 提示词 + 可选原图 + 尺寸 / 质量 / 输出格式 |
| 出参 | JSON 文本 | 图片二进制（base64）或临时 URL |
| 配置位置 | 模型设置页「视觉模型」「文本模型」两张卡 | 模型设置页「图片模型（效果图生成）」卡 |
| 环境变量 | `OPENAI_*` / `DEEPSEEK_*` / `GEMINI_*` / `ANTHROPIC_*` | `OPENAI_IMAGE_*` / `GEMINI_IMAGE_*` / `CUSTOM_IMAGE_*` |

两者**不共用 Key、不共用模型名、不共用超时**（`AI_TIMEOUT_MS` vs `IMAGE_TIMEOUT_MS`），因为图片生成通常要几十秒到两分钟。三家图片服务商的请求格式差异较大（OpenAI 用 multipart 上传原图，Gemini 用 JSON 内联 base64，自定义接口可能只支持文生图），所以各自实现适配器，不做"一套格式兼容所有"的假设。

### 8.3 平台规范配置表（可直接改）

产品要求「不能是一套固定规则」，因此所有平台差异都收敛到 `shared/types.ts` 的三张表：

| 表 | 内容 | 改动影响 |
| --- | --- | --- |
| `PLATFORM_IMAGE_SPEC` | 每个平台的推荐画幅、风格预设、构图建议、文案重点、语言、`updatedAt` | 影响图片创作页的平台选项与提示词 |
| `IMAGE_TYPE_META` | 7 种图片类型的提示词片段、默认画幅、是否需要文字叠加 | 影响图片类型选项与提示词 |
| `PLATFORM_COPY_FORMATS` | 每个平台的文案块（id / 中文名 / 英文名 / 说明） | 前端渲染文案卡与后端提示词同时生效 |

三张表都带注释说明「这些是通用建议值，不是平台官方强制标准，可按需修改」。改完表后前后端同时生效，无需改其它代码。

### 8.4 画面文字为什么用 Canvas 而不是让模型画

扩散类图片模型画文字极易出现错别字、乱码、虚假参数或错误 Logo，而商品图里的文字（卖点、规格、活动信息）恰恰是最不能出错的部分。因此本项目：

1. 提示词里明确要求「画面不要出现任何文字、水印、Logo」；
2. 生成后由 `TextOverlayEditor` 用 Canvas 把使用者确认过的文字合成上去，可调位置 / 字号 / 颜色 / 半透明底衬；
3. 导出 PNG 下载，文字内容始终可控、可核对。


### 8.5 DeepSeek 图片通道（协议预留，官方暂无图片模型）

**结论先说：截至本项目 V1.0，DeepSeek 官方 API 只提供文本模型（`deepseek-chat` / `deepseek-reasoner`），没有公开的图片生成模型，也没有图片编辑接口。** 因此「生图模型接入 DeepSeek」在本项目里的落地方式是**通道预留 + 如实失败**，不是伪造一个不存在的模型：

| 项 | 实现 |
| --- | --- |
| 服务商 id | `deepseek-image`（与 `openai-image` / `gemini-image` / `custom-image` 并列） |
| 协议 | OpenAI Images 兼容：`POST {Base URL}/images/generations`，`Authorization: Bearer <key>`，`response_format: b64_json`，读 `data[].b64_json` / `data[].url` |
| Base URL | 默认 `https://api.deepseek.com`（`/v1` 写法同样兼容，均拼为 `…/images/generations`），可改成自建/第三方兼容网关 |
| 模型清单 | 内置清单为空数组 —— **不虚构任何 DeepSeek 图片模型名**，模型名由使用者手填 |
| 图片编辑 | 不支持（`supportsImageEditing = false`）。保真模式传原图会被 `ModelRouter` 直接拒绝（`IMAGE_UNSUPPORTED`），**原图绝不会被静默丢弃** |
| 前端提示 | 模型设置页选中 DeepSeek 图片时给出橙色提示「现阶段没有官方图片模型」；Studio 页保真模式下再给一条「改用创意营销模式」的引导按钮 |
| 失败表现 | 官方未开放时：鉴权失败 → `UPSTREAM_UNAUTHORIZED`（HTTP 401）、模型不存在 → `MODEL_NOT_FOUND`、返回空 `data` → `BAD_MODEL_OUTPUT`；**任何情况下都不会返回占位图冒充真实结果** |

接口代码：`functions/api/_lib/ai/image/deepseekImage.ts`（`buildDeepSeekImageUrl` + `deepseekImageProvider`），注册在 `functions/api/_lib/ai/image/catalog.ts`，环境变量映射在 `functions/api/_lib/ai/image/router.ts`。

使用建议：现在需要稳定出图，请选 **OpenAI GPT Image** 或 **Google Gemini Image**；等 DeepSeek 开放图片模型（或你已有兼容网关）时，只要在模型设置页选 DeepSeek 图片 + 填模型名即可，不改代码。


## 9. 安全设计

1. **密钥不落前端**：平台默认 Key 只读环境变量；BYOK Key 只在请求体内、请求期内存活；`savePreferences` 的字段白名单结构上就没有 apiKey；日志里会把 `sk-` / `AIza` 片段擦除。
2. **SSRF 防护**：自定义 Base URL 必须 https、无账号密码、非 IP 字面量、非私网 / `.local` / `.internal`、端口只能是 443，且域名必须命中内置白名单（OpenAI / Anthropic / Gemini / DeepSeek / 通义 / 智谱 / Moonshot / SiliconFlow / 火山 / 千帆等）或 `ALLOW_CUSTOM_BASE_URL_HOSTS`。本机地址仅在显式 `ALLOW_LOOPBACK_BASE_URL=true` 时放行，用于本地调试自建网关。
3. **上传校验**：按文件头嗅探真实类型（不信任 `Content-Type` 与扩展名），限制 5MB，拒绝空文件。
4. **输入校验**：平台 / 风格 / 语言 / 模式 / section 全部按白名单校验，product 字段做长度裁剪，拒绝未知字段结构。
5. **限流**：按 IP 的 60 秒滑窗（生成 12 次/分钟，连接测试 20 次/分钟），返回 429 + `Retry-After`。
6. **错误脱敏**：上游报文截断到 600 字并剔除密钥片段后再映射成统一错误码，原始报文不会原样返回浏览器。
7. **视觉模型准入**：名称命中纯文本特征（如 `*-text-*`、`embedding`、`whisper`、`tts`）的模型不允许配置为视觉模型；`compatible` 必须命中视觉特征才放行。
8. **响应头**：`cache-control: no-store`、`x-content-type-options: nosniff`、`referrer-policy: no-referrer`。

---

### 图片与关键词相关

- 图片模型 Key 与文本 Key 一样：只在后端环境变量或当次请求内存在，前端只提交、不缓存，错误信息里会被脱敏。
- 图片生成返回给前端的是 base64 data URL，不写入任何服务端存储，也不落日志。
- 关键词接口不会返回搜索量 / 排名 / 竞争度等它拿不到的数据，避免把估算值伪装成真实数据。


## 10. 演示模式

没有配置任何 API 时：

- 首页示例图或自己上传的图都能直接进入生成页；
- 点「用演示数据生成」，会按商品名称 / 类别匹配保温杯、蓝牙耳机、帆布包三套演示模板，否则用商品信息兜底拼装；
- 结果顶部会显示琥珀色标记 `演示数据（非真实 AI 结果）`，警告区明确写出"当前为演示模式……不是真实 AI 识别与生成结果"；
- 识别结果里的置信度显示为「演示数据」，无法确认的属性照样列出；
- 配置真实 API 后点「生成文案」即走真实链路，成功时标记变为绿色 `真实模型生成`。

平台已配置默认 API 时，若用户在模型设置里勾选了「没有可用真实配置时自动使用演示数据」，BYOK 报 `NO_MODEL_CONFIG` 会自动降级为演示结果并提示，不会白屏或静默失败。

两个新页面同样有独立演示模式，且演示产物明确可辨：

| 页面 | 演示数据来源 | 如何标注 |
| --- | --- | --- |
| AI 图片创作 | `src/services/demoStudio.ts` 本地生成的 SVG 占位图（画面内直接写「演示数据 · 非真实 AI 生成」+ 平台 / 类型 / 尺寸） | 结果卡琥珀色 `演示数据（非真实 AI 生成）` + 三条警告「本地占位图，不能用于上架」 |
| 智能 SEO | 本地模板按 10 类拼装关键词与平台文案块 | 琥珀色 `演示数据（模板拼装，非真实 AI）` + 文案块前缀「（演示内容）」，英文平台用 `[Demo]` 前缀 |

演示数据不含任何真实搜索量、排名或竞争度数字，也不会被标记为「真实模型生成」。

---

## 11. 部署到 Cloudflare Pages

### 方式一：Git 集成（推荐）

1. 把仓库推到 GitHub；
2. Cloudflare Dashboard → Pages → Create a project → 连接该仓库；
3. 构建配置：
   - Framework preset：`Vite`
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Root directory：`ProductAI`（若仓库根就是项目则留空）
4. Settings → Environment variables 填入第 5 节的变量（建议把 Key 存为 **Secret**）；
5. 部署完成。`functions/` 目录会被自动识别为 Pages Functions，`public/_redirects` 负责 SPA 路由回退，刷新 `/generate` 等子路由不会 404。

### 方式二：命令行

```bash
npm run build
npx wrangler pages deploy dist --project-name productai
```

首次部署后再到 Dashboard 配置环境变量（命令行部署不会带 secrets）。

### 与部署相关的三个配置文件

| 文件 | 作用 | 说明 |
| --- | --- | --- |
| `wrangler.toml` | 让 `wrangler pages deploy` 知道产物目录是 `dist`、Functions 在 `functions/` | 只放非密钥配置；`compatibility_date = "2024-11-01"` |
| `public/_routes.json` | 声明「只有 `/api/*` 走 Functions」 | 静态资源与 SPA 回退由 Pages 直接处理，避免函数拦截全站请求 |
| `public/_headers` | 静态资源安全响应头 + 缓存策略 | `index.html` 不缓存、`/assets/*` 一年 immutable；`/api/*` 的响应头由代码自己设置（`no-store` + `nosniff`） |

`public/` 下的 `_redirects`、`_routes.json`、`_headers` 会在 `npm run build` 时被复制到 `dist/`，可直接核对 `dist/_routes.json`。

### 需要配置的 Secrets（Cloudflare Pages → Settings → Environment variables）

全部**只在服务端使用**，前端代码和浏览器里不存在任何 Key。按需勾选，不用的留空即可：

| 变量名 | 用途 | 必填 |
| --- | --- | --- |
| `DEFAULT_PROVIDER` | 平台默认服务商（`openai` / `gemini` / `claude` / `deepseek` / `compatible`） | 用模式 A 时填 |
| `OPENAI_API_KEY` `GEMINI_API_KEY` `ANTHROPIC_API_KEY` `DEEPSEEK_API_KEY` | 平台默认文本 / 视觉模型 Key | 用模式 A 时至少填一个 |
| `OPENAI_BASE_URL` `GEMINI_BASE_URL` `ANTHROPIC_BASE_URL` `DEEPSEEK_BASE_URL` | 自定义网关地址（可选） | 否 |
| `OPENAI_VISION_MODEL` `OPENAI_TEXT_MODEL` 等四组 `*_VISION_MODEL` / `*_TEXT_MODEL` | 指定默认模型名 | 否（有内置默认） |
| `DEFAULT_VISION_PROVIDER` `DEFAULT_TEXT_PROVIDER` | 视觉与文本分别指定服务商（如视觉用 OpenAI、文本用 DeepSeek） | 否 |
| `OPENAI_IMAGE_API_KEY` `GEMINI_IMAGE_API_KEY` `DEEPSEEK_IMAGE_API_KEY` `CUSTOM_IMAGE_API_KEY` | 图片生成 Key | 用平台默认出图时填 |
| `IMAGE_PROVIDER` | 平台默认图片服务商（`openai-image` / `gemini-image` / `deepseek-image` / `custom-image`） | 否 |
| `ALLOW_CUSTOM_BASE_URL_HOSTS` | 允许的自定义 Base URL 域名（逗号分隔） | 否（内置白名单已含主流厂商） |
| `RATE_LIMIT_PER_MINUTE` `AI_TIMEOUT_MS` `IMAGE_TIMEOUT_MS` | 限流与超时（毫秒） | 否 |
| `ALLOW_LOOPBACK_BASE_URL` | **线上必须保持未设置 / false** | 否 |

普通用户走模式 B（BYOK）时不需要你配置任何 Key：Key 由用户在模型设置页填写，随请求经 HTTPS 发到 Functions，用完即丢弃，不落库、不写日志、不回显。

### 部署后在线上会怎样（功能对照）

| 功能 | 没有配 Key 时（纯演示态） | 配了 Key 之后 |
| --- | --- | --- |
| 首页 / 项目介绍 / 404 | 正常 | 正常 |
| 商品文案生成（`/generate`） | 演示数据，结果卡标注「演示数据（非真实 AI 结果）」 | 真实模型生成，标注「真实模型生成」 |
| AI 图片创作（`/studio`） | 本地 SVG 占位图，画面内写「演示数据 · 非真实 AI 生成」 | 真实出图（需要图片模型 Key） |
| 智能 SEO（`/seo`） | 本地模板关键词 + 「（演示内容）」文案块 | 真实关键词与平台文案 |
| 模型设置（`/models`） | 可切换模式、可填 BYOK Key（仅内存）、测试连接会真实发请求 | 同左，且显示平台默认模型名 |
| 用户自带 Key（BYOK） | 可用（不需要站长配置任何 Secrets） | 可用 |

### 线上运行时的三个限制（不是 bug）

1. **单次请求时长**：Cloudflare Pages Functions 对一次 HTTP 请求有约 30 秒上限。文案类请求通常 3–15 秒没问题；**图片生成如果服务商超过 30 秒，Cloudflare 会直接返回 524**，这时前端会显示网络/超时错误（不会伪装成功）。建议线上把 `IMAGE_TIMEOUT_MS` 设成 `25000` 并选更快的图片模型。
2. **限流是单实例内存计数**：`functions/api/_lib/ratelimit.ts` 用进程内 `Map`，在 Cloudflare 上每个 isolate 各算各的，只能做「粗略防刷」。要做严格配额需要接 KV / Durable Objects / Rate Limiting API，V1.0 未接。
3. **图片以 base64 内联返回**：生成图以 `data:image/...;base64` 返回，单张 1024×1024 约 1–2MB。批量 4 张时响应会比较大，移动网络下会慢一些；V1.0 未接 R2 存储。


### 本地模拟 Workers 运行时

```bash
npm run pages:dev     # 等价于 npm run build && wrangler pages dev dist
```

---

## 11.8 上线前检查清单

推 GitHub / 部署 Cloudflare Pages 之前，按顺序过一遍（全部为机械检查，不需要改代码）：

- [ ] `npm ci && npm run build` 通过（本仓库实测：`tsc -b` 无错，产物为 `dist/index.html` + `dist/assets/*`）
- [ ] `dist/` 里存在 `_redirects`、`_routes.json`、`_headers`、`samples/`、`favicon.svg`
- [ ] 仓库里没有 `.dev.vars`、`.env`、`node_modules/`、`dist/`、`.tmp/`（`.gitignore` 已覆盖）
- [ ] 全站前端代码里没有 `localhost` / `127.0.0.1`（接口一律走同源相对路径 `/api/*`）
- [ ] 客户端包里没有 `process.env`、没有任何 Key 字面量（只有 `OPENAI_API_KEY` 这类**变量名**出现在给站长的配置提示文案里）
- [ ] Cloudflare 上 `ALLOW_LOOPBACK_BASE_URL` 未设置（否则等于开了一个回环探测口）
- [ ] Dashboard 里至少配一个文本模型 Key（否则线上一直是演示模式，这是设计行为）

## 11.9 网络故障排查

页面上一旦出现网络类错误，先分清是**哪一跳**断了。这两类问题原因和处理方式完全不同：

| 现象 | 断在哪 | 判断方法 | 处理 |
| --- | --- | --- | --- |
| 「连不上本站后端接口（/api/xxx）」+ 模型设置页顶部常驻红色横幅 | 浏览器 → **本站** Functions | `curl 你的站点/api/health` | 见下方「本站接口不可达」 |
| 「…域名无法解析 / 连接被拒绝 / 建立连接超时 / TLS 证书校验失败」 | 后端 → **模型服务商** | 模型设置页点「测试连接」看具体分类 | 按提示换 Base URL / 配代理 / 换服务商 |
| 「模型服务鉴权失败（HTTP 401）」 | 后端 → 服务商（已连通） | 同上 | Key 错了或没有权限 |
| 「余额不足（HTTP 402）」 | 同上 | 同上 | 去服务商充值，本站不会伪装成功 |

### 本站接口不可达（最常见）

1. **本地开发**：确认 `npm run dev` 正在运行，页面地址是 `http://127.0.0.1:5173` 而不是双击打开的 `dist/index.html`（`file://` 协议下没有 `/api`）。
2. **`npm run preview`**：本项目已让 preview 复用同一套 Functions（`scripts/devApiPlugin.ts` 的 `configurePreviewServer`），若仍不可达请确认没有用别的静态服务器托管 `dist/`。
3. **部署环境**：Cloudflare Pages 需要 `functions/` 目录随之发布；若前面还有 Nginx / 其它反向代理，必须把 `/api/*` 转发给 Pages 而不是回退到 `index.html`。
4. **代理 / 插件 / 公司网络**：浏览器插件、系统代理或内网策略可能拦掉对本站 `/api` 的请求；换无痕窗口或关掉代理再试。

### 健康检查接口

```bash
curl -s http://127.0.0.1:5173/api/health
```

```json
{
  "ok": true,
  "runtime": "pages-functions",
  "platformDefaultConfigured": false,
  "available": { "text": false, "vision": false, "image": false },
  "rateLimitPerMinute": 12,
  "allowedHostsHint": ["api.openai.com", "api.anthropic.com", "..."],
  "time": "2026-01-01T00:00:00.000Z"
}
```

它只报告「环境变量里有没有配 Key」，**永远不会返回 Key 本身**。前端在模型设置页加载时会自动探一次：
失败就展示常驻提示 + 排查步骤 + 「重新检测」按钮，并且点「测试连接」会先拦住并说明「测试没有发出」，
而不是抛一句笼统的「网络请求失败」。

### 错误的分类依据

后端 `functions/api/_lib/ai/json.ts` 的 `fetchWithTimeout` 会把网络层异常翻译成可执行提示，
并顺带展开 Node undici 的 `AggregateError.errors`（否则双栈连接失败会被吞成一句 `fetch failed`）：

| 底层原因 | 提示 |
| --- | --- |
| `ENOTFOUND` / `NXDOMAIN` | 域名无法解析（检查 Base URL 拼写 / DNS / 境外域名被拦） |
| `EAI_AGAIN` | DNS 暂时失败（通常是瞬时故障，重试即可） |
| `ECONNREFUSED` / `ECONNRESET` | 连接被拒绝或被中断（自建网关没启动 / 端口不对） |
| `bad port` | 端口不可用（Fetch 规范禁止低位端口，请用 1024 以上） |
| `CERT_*` / `TLS` | TLS/证书校验失败（自签名证书不被信任，`retryable: false`） |
| `ETIMEDOUT` / `UND_ERR_CONNECT_TIMEOUT` | 建立连接超时（多半需要代理才能访问境外服务） |

任何一条错误的文本都会经过 `sanitize()`，把 `sk-` / `AIza` 形式的 Key 擦掉后再返回前端。

## 12. 已验证内容

- `npm run build`（`tsc -b` 严格模式 + Vite 生产构建）通过；
- 四个生成类接口在无 Key / 错误 Key / 正确 Key（本地 mock 的 OpenAI 兼容服务）三种状态下的行为符合预期；
- 文件格式、5MB 上限、枚举白名单、限流、SSRF 白名单均按预期拒绝；
- DeepSeek 图片通道专项（22 项适配器单测 + 16 项 UI E2E）：URL 拼接为 `/images/generations`、Bearer 鉴权、`response_format=b64_json`、传原图直接 `IMAGE_UNSUPPORTED` 且零网络请求、未填模型名 `INVALID_MODEL_CONFIG` 且不发请求、`Model Not Exist` → `MODEL_NOT_FOUND`、401 → `UPSTREAM_UNAUTHORIZED` 且错误串不含 Key、空 `data` → `BAD_MODEL_OUTPUT`、能力清单如实标注「没有公开的图片生成模型」且模型列表为空；
- 三家 Provider 的请求格式（URL、鉴权头、图片字段、JSON 模式）与响应解析逐项对过桩测试；
- 浏览器端交互：首页 → 示例图 → 演示生成 → 编辑保存 → 单卡片重生成 → 复制全部结果（剪贴板内容已校验）、模型设置页 BYOK 双端点、项目介绍页、404 页，全站无未捕获异常；
- 桌面 1440px 与移动 390px 两种视口布局检查通过。
- **DeepSeek 专项**（本地 mock 的 DeepSeek 服务，脚本见 `.tmp/check-deepseek*.mjs` 与 `.tmp/e2e-deepseek.mjs`）：
  - 请求打到 `POST /chat/completions`、`Authorization: Bearer`，base 带 `/v1` 时不重复拼版本；
  - `deepseek-reasoner` 不发送 `temperature` / `response_format`，`deepseek-chat` 正常发送并解析 `choices[0].message.content`；
  - 视觉端选 DeepSeek 会被拒（`NO_VISION_MODEL`）、`deepseekProvider.call()` 带图片时**零请求**抛出；
  - 401 / 402 / `Model Not Exist` / 429 / 超时分别映射为 `UPSTREAM_UNAUTHORIZED` / `UPSTREAM_INSUFFICIENT_BALANCE` / `MODEL_NOT_FOUND` / `UPSTREAM_RATE_LIMIT` / `UPSTREAM_TIMEOUT`，错误信息里不含 Key；
  - 「仅文字生成」端到端可用，`data.analysis.source === 'text-only'`，界面标注「文字分析结果（未使用图片识别）」；
  - 视觉 OpenAI 兼容 + 文本 DeepSeek 的混合服务商组合生成成功，`meta` 正确记录两端；
  - 原有 OpenAI / Gemini / Claude / compatible 适配器桩测试回归通过，演示模式 E2E 仍通过。

---

### 第三轮新增（AI 效果图 + 智能 SEO）

- `npm run build` / `npx tsc -b --force` 通过（1607 modules）。
- 图片适配器单测（桩 fetch）16 项：OpenAI 有图走 `/images/edits` multipart、无图走 `/images/generations`、size/quality/format 映射、Gemini `generateContent` 内联原图与 `responseModalities`、自定义接口兼容 `data[].b64`、401 映射且错误串不含 Key、空图片数据抛 `BAD_MODEL_OUTPUT`。
- 接口联调（本地 mock）：`generate-image` 真实出图并回传 base64、`seo-keywords` 返回 10 类关键词 + 平台文案块 + 去重计数；未配置时分别返回 `NO_IMAGE_MODEL` / `NO_MODEL_CONFIG`。
- 浏览器 E2E（CDP）演示模式 21 项：导航、图片类型/平台/画幅选择、演示生成、下载、文字叠加与导出、提示词查看、10 类关键词表、关键词编辑与整组复制、覆盖统计、图片模型卡、原文案生成页与首页均正常，无 console 错误。
- 浏览器 E2E（CDP）真实模式 15 项：BYOK 填图片 + 文本模型 → 创意模式出图（无演示标记）、保真模式上传原图后 mock 日志出现 `hasImage=true`（证明原图确实发给了图片模型）、SEO 真实生成含去重提示与 Search Terms 文案块。
- 截图复核：桌面 1440 与移动 390 下图片创作页、SEO 页均无横向溢出，结果卡与关键词表排版正常。


- **网络故障可诊断性**：`GET /api/health` 在 `npm run dev` 与 `npm run preview` 下均返回 200；阻断 `/api/*` 后模型设置页出现「本站后端接口不可达」常驻横幅（含排查步骤与「重新检测」），点「测试连接」直接说明「测试没有发出」；上游 DNS 失败 / 端口被拒 / Fetch 禁止端口 / 连接超时 / 证书失败五类错误均有针对性中文提示；移除 `.dev.vars` 后回归通过。

## 13. 已知限制（V1.0）

- BYOK 的 Key 不持久化，刷新页面需要重新填写（这是有意的安全取舍）；
- 限流是**单实例内存**计数，Pages Functions 多实例部署时是近似值；生产建议换成 Durable Objects 或 KV/Redis 计数；
- 只有一条生成链路，没有历史记录、账号体系、批量生成、导出 Word/Excel；
- 图片不做压缩，超大原图（接近 5MB）会拉高模型调用延迟和费用；
- 模型能力清单是内置的常见模型，新模型可以在模型设置里直接手输名称（官方服务商默认放行，由真实调用结果兜底）；
- 未接支付、未做多语言界面（界面为中文，产出文案支持中/英/双语）。

### 第三轮新增

- 图片模型只接入了三家（OpenAI / Gemini / 自定义兼容接口）。其它厂商（如 Flux 官方 API、通义万相）需要各自的签名与轮询机制，当前只能通过「自定义接口」以 OpenAI Images 兼容格式接入。
- 图片尺寸由服务商决定：Gemini 不接受宽高参数，画幅只能体现在提示词里，实际输出尺寸可能与选择的预设不同（结果卡会显示真实宽高）。
- 「对现有图继续编辑」依赖服务商支持传入原图（OpenAI `gpt-image-1` 支持，`dall-e-3` 不支持），不支持的模型会在结果里提示。
- 关键词的搜索量 / 竞争度 / 排名需要真实数据服务（如平台开放接口或第三方关键词工具），当前均为 AI 相关性建议，不做数值估算。
- 本轮的图片与 SEO 链路使用本地 mock 服务验证协议与渲染，**没有使用真实付费 Key 跑过出图**；接真实 Key 后的差异主要可能在出图质量与耗时上。

### 第四轮新增（DeepSeek 图片通道）

- **DeepSeek 官方目前没有图片生成模型**，所以选择 DeepSeek 作为图片服务商时：内置模型清单为空（不虚构模型名），需要手填模型名；官方接口未开放前调用会如实返回 `UPSTREAM_UNAUTHORIZED` / `MODEL_NOT_FOUND`，不会返回任何占位图。
- DeepSeek 图片通道走 OpenAI Images 兼容协议（`/images/generations` + `Bearer`），适用于自建/第三方兼容网关；各家网关的字段差异（如 `response_format` 是否支持）需要按网关文档确认。
- DeepSeek 没有图片编辑接口，因此该通道只能用于**创意营销模式（纯文字生图）**；保真模式传原图会被后端直接拒绝，Studio 页会提前提示并给出「改用创意营销模式」按钮。
- DeepSeek 图片通道没有用真实 DeepSeek Key 验证过出图（官方无此能力），验证方式是：22 项适配器单测（协议、守卫、错误映射）+ 本地兼容网关 mock 的真实 HTTP 链路 + 16 项 UI E2E。


## 14. 路线图

1. 账号体系 + 生成历史 + 团队空间；
2. 批量生成与 CSV 导入导出、Excel 文案表；
3. 平台模板可编辑（把平台/风格规则开放成可配置 prompt 片段）；
4. 结果打分与 A/B（同一商品生成多版标题，人工挑选）；
5. Durable Objects 限流与用量计费；
6. 图片自动压缩与智能裁切。

---

## 15. 免责声明

本项目是独立开发的开源工具，与淘宝、拼多多、抖音、小红书、Amazon、eBay 等平台**没有任何官方合作或授权关系**。生成的文案不会、也无法声称通过任何平台的官方审核；发布前请自行核对商品真实信息、平台规则与广告法相关要求（尤其是绝对化用语与资质类宣称）。演示模式下的全部内容均为模拟数据。
