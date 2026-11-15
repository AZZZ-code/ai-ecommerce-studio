import type {
  ImageFidelityMode,
  PlatformId,
  ProductImageTypeId,
  ProductInfo,
  VisionAnalysis,
} from '../../../shared/types'
import { IMAGE_TYPE_META, PLATFORM_IMAGE_SPEC } from '../../../shared/types'

/**
 * 商品效果图提示词
 * ----------------------------------------------------------------------------
 * 设计原则：
 * 1. 商品保真优先 —— 只允许改背景 / 光线 / 角度 / 构图 / 环境，禁止改商品本身。
 * 2. 绝不让图像模型"画字" —— 卖点图 / 详情图上的文字由前端 Canvas 叠加。
 * 3. 提示词里明确写出"不添加不存在的配件、认证、参数"，避免伪造产品信息。
 */

const FIDELITY_RULES_ZH =
  '严格保留原图中商品的外形轮廓、比例、颜色、材质观感、结构、接缝与所有真实配件；' +
  '不得修改或重新设计商品本体，不得添加原图中不存在的部件、按键、logo、贴纸、认证标识与包装；' +
  '只允许改变背景、光线、拍摄角度、构图以及摆放环境。'

const FIDELITY_RULES_EN =
  'Strictly preserve the product from the reference image: silhouette, proportions, colors, material appearance, structure, seams and every real accessory. ' +
  'Do NOT redesign the product, and do NOT add parts, buttons, logos, stickers, certifications or packaging that are not visible in the reference. ' +
  'You may only change background, lighting, camera angle, composition and environment.'

const CREATIVE_RULES_ZH =
  '可以自由设计背景、场景、光线与视觉风格，但商品本体必须保持原图的外形、颜色与结构，' +
  '不得把商品改造成另一种产品，不得编造原图中没有的功能、参数、配件与品牌标识。'

const CREATIVE_RULES_EN =
  'You may freely art-direct background, scene, lighting and visual style, but the product itself must keep its original shape, color and structure. ' +
  'Never turn it into a different product, and never invent features, specs, accessories or brand marks that are not in the reference.'

export const IMAGE_NEGATIVE_PROMPT_ZH =
  '画面中出现任何文字、字母、数字、水印、logo、价格标签、二维码、认证徽章、' +
  '虚构参数、夸张功效、错误透视、商品变形、缺件、多出部件、模糊、低分辨率'

export const IMAGE_NEGATIVE_PROMPT_EN =
  'any text, letters, numbers, watermark, logo, price tag, QR code, certification badge, ' +
  'invented specifications, exaggerated claims, wrong perspective, distorted product, missing or extra parts, blurry, low resolution'

function describeProduct(product: ProductInfo): string {
  const lines: string[] = []
  if (product.name) lines.push(`商品名称：${product.name}`)
  if (product.category) lines.push(`商品类别：${product.category}`)
  if (product.material) lines.push(`材质：${product.material}`)
  if (product.color) lines.push(`颜色：${product.color}`)
  if (product.size) lines.push(`尺寸：${product.size}`)
  if (product.functions) lines.push(`功能：${product.functions}`)
  if (product.features) lines.push(`已知特点：${product.features}`)
  if (product.targetCustomer) lines.push(`目标客户：${product.targetCustomer}`)
  if (product.scenarios) lines.push(`使用场景：${product.scenarios}`)
  return lines.length > 0 ? lines.join('\n') : '（用户未补充商品信息，请只依据原图可见信息）'
}

function describeAnalysis(analysis: VisionAnalysis | null | undefined): string {
  if (!analysis) return ''
  const lines: string[] = []
  if (analysis.category) lines.push(`识别类别：${analysis.category}`)
  if (analysis.colors?.length) lines.push(`可观察颜色：${analysis.colors.join('、')}`)
  if (analysis.appearance) lines.push(`外观：${analysis.appearance}`)
  if (analysis.shape) lines.push(`形状结构：${analysis.shape}`)
  if (analysis.visibleFeatures?.length) lines.push(`可见特征：${analysis.visibleFeatures.join('；')}`)
  return lines.join('\n')
}

export interface ImagePromptInput {
  platform: PlatformId
  imageType: ProductImageTypeId
  fidelity: ImageFidelityMode
  product: ProductInfo
  analysis?: VisionAnalysis | null
  userPrompt?: string
  width: number
  height: number
  variantIndex?: number
}

export interface ImagePromptResult {
  prompt: string
  negativePrompt: string
  warnings: string[]
}

/**
 * 组装最终提示词。
 * variantIndex 用于「批量生成多张不同风格」时给每张图加不同的变体指令。
 */
export function buildImagePrompt(input: ImagePromptInput): ImagePromptResult {
  const spec = PLATFORM_IMAGE_SPEC[input.platform]
  const typeMeta = IMAGE_TYPE_META[input.imageType]
  const isEnglish = spec.language === 'en'
  const warnings: string[] = []

  const variantHints = [
    '',
    '变体：换一种更柔和的布光与更近的机位，整体氛围更生活化。',
    '变体：换一种更克制的极简构图，背景更干净、留白更多。',
    '变体：换一种更明亮的自然光与略高的俯视角度。',
  ]
  const variant = input.variantIndex ? variantHints[input.variantIndex % variantHints.length] : ''

  const lines: string[] = []
  lines.push(
    isEnglish
      ? `Create a professional e-commerce product image for ${spec.label}.`
      : `为「${spec.label}」生成一张专业的电商商品效果图。`,
  )
  lines.push(
    isEnglish
      ? `Image type: ${typeMeta.labelEn}. ${typeMeta.promptFragment}`
      : `图片类型：${typeMeta.label}。${typeMeta.promptFragment}`,
  )
  lines.push(
    isEnglish
      ? `Platform style preset: ${spec.stylePreset}. Composition tips: ${spec.compositionTips.join('; ')}.`
      : `平台风格预设：${spec.stylePreset}。构图建议：${spec.compositionTips.join('；')}。`,
  )
  lines.push(
    isEnglish
      ? `Target frame: ${input.width}x${input.height} pixels (aspect ratio ${(input.width / input.height).toFixed(2)}:1). Compose the subject for this frame.`
      : `目标画幅：${input.width} × ${input.height} 像素（比例 ${(input.width / input.height).toFixed(2)}:1），请按该画幅构图。`,
  )
  lines.push(
    input.fidelity === 'fidelity'
      ? isEnglish
        ? `Product fidelity mode (strict): ${FIDELITY_RULES_EN}`
        : `商品保真模式（严格）：${FIDELITY_RULES_ZH}`
      : isEnglish
        ? `Creative marketing mode: ${CREATIVE_RULES_EN}`
        : `创意营销模式：${CREATIVE_RULES_ZH}`,
  )

  const productText = describeProduct(input.product)
  lines.push(isEnglish ? `Product facts provided by the merchant:\n${productText}` : `商家提供的商品信息：\n${productText}`)

  const analysisText = describeAnalysis(input.analysis)
  if (analysisText) {
    lines.push(
      isEnglish
        ? `Observed from the reference photo:\n${analysisText}`
        : `从原图观察到的信息：\n${analysisText}`,
    )
  }

  if (input.userPrompt?.trim()) {
    lines.push(
      isEnglish
        ? `Additional instructions from the merchant: ${input.userPrompt.trim()}`
        : `商家补充要求：${input.userPrompt.trim()}`,
    )
  }

  if (variant) lines.push(variant)

  // 文字一律交给前端 Canvas 叠加，禁止模型自己画字
  lines.push(
    isEnglish
      ? 'Do not render any text, letters, numbers, captions, watermarks or logos in the image. Leave clean empty space where typography could be added later.'
      : '画面中不要出现任何文字、字母、数字、文案、水印或 logo，请留出干净留白区域，文字稍后由前端叠加。',
  )
  lines.push(
    isEnglish
      ? 'Do not invent specifications, certifications, brand marks, packaging details or product features.'
      : '不要编造任何规格参数、认证标识、品牌标识、包装细节或产品功能。',
  )

  if (typeMeta.needsTextOverlay) {
    warnings.push(
      '该类型的图需要在图片上写文字：文字由页面上的「文字叠加」用 Canvas 绘制，不用图像模型生成，避免错别字与虚假参数。',
    )
  }
  warnings.push('AI 生成结果可能与原商品存在细节差异（配件、纹理、反光），发布前请人工核对。')

  return {
    prompt: lines.join('\n'),
    negativePrompt: isEnglish ? IMAGE_NEGATIVE_PROMPT_EN : IMAGE_NEGATIVE_PROMPT_ZH,
    warnings,
  }
}
