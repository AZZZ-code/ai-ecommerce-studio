import type { ImageProviderId, ImageProviderOption } from '../../../../../shared/types'
import { customImageProvider } from './customImage'
import { deepseekImageProvider } from './deepseekImage'
import { geminiImageProvider } from './geminiImage'
import { openAIImageProvider } from './openaiImage'
import type { ImageProviderAdapter } from './types'

/** 图片模型服务商注册表（与文本 / 视觉模型完全分开） */
export const IMAGE_PROVIDERS: Record<ImageProviderId, ImageProviderAdapter> = {
  'openai-image': openAIImageProvider,
  'gemini-image': geminiImageProvider,
  'deepseek-image': deepseekImageProvider,
  'custom-image': customImageProvider,
}

export function getImageProvider(id: ImageProviderId): ImageProviderAdapter {
  const provider = IMAGE_PROVIDERS[id]
  if (!provider) throw new Error(`未注册的图片服务商：${id}`)
  return provider
}

/**
 * 图片服务商能力清单，供 /api/models 与前端「图片模型」配置卡使用。
 * 模型列表是常见示例，用户可以手填其它模型名。
 */
export const IMAGE_PROVIDER_OPTIONS: ImageProviderOption[] = [
  {
    id: 'openai-image',
    label: 'OpenAI GPT Image',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/docs/api-reference/images',
    requestFormat:
      'POST /v1/images/edits（带原图，multipart）或 /v1/images/generations（纯文生图），Authorization: Bearer <key>，返回 b64_json',
    supportsImageEditing: true,
    models: [
      {
        id: 'gpt-image-1',
        label: 'gpt-image-1',
        supportsImageEditing: true,
        formats: ['png', 'jpeg', 'webp'],
        notes: '支持传入原图做编辑，价格较高但可控性好',
      },
      {
        id: 'gpt-image-1-mini',
        label: 'gpt-image-1-mini',
        supportsImageEditing: true,
        formats: ['png', 'jpeg', 'webp'],
        notes: '更便宜的版本，适合批量试稿',
      },
      {
        id: 'dall-e-3',
        label: 'dall-e-3',
        supportsImageEditing: false,
        formats: ['png'],
        notes: '只支持纯文生图，不能接收商品原图',
      },
    ],
  },
  {
    id: 'gemini-image',
    label: 'Google Gemini Image',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/image-generation',
    requestFormat:
      'POST /v1beta/models/{model}:generateContent?key=<key>，inline_data 传原图，generationConfig.responseModalities 含 IMAGE',
    supportsImageEditing: true,
    models: [
      {
        id: 'gemini-2.5-flash-image',
        label: 'gemini-2.5-flash-image',
        supportsImageEditing: true,
        formats: ['png', 'jpeg'],
        notes: '图像编辑能力强，支持图生图',
      },
      {
        id: 'gemini-2.0-flash-preview-image-generation',
        label: 'gemini-2.0-flash-preview-image-generation',
        supportsImageEditing: true,
        formats: ['png'],
        notes: '预览版，命名以官方文档为准',
      },
    ],
  },
  {
    id: 'deepseek-image',
    label: 'DeepSeek 图片',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.deepseek.com',
    docsUrl: 'https://api-docs.deepseek.com/',
    requestFormat:
      '按 OpenAI Images 兼容协议预留：POST {Base URL}/images/generations，Authorization: Bearer <key>，返回 data[].b64_json',
    supportsImageEditing: false,
    models: [],
    notes:
      'DeepSeek 官方目前只有文本模型（deepseek-chat / deepseek-reasoner），没有公开的图片生成模型；此通道按兼容协议预留，模型名请填你账户或兼容网关里实际可用的图片模型名。',
  },
  {
    id: 'custom-image',
    label: '自定义图片接口',
    requiresBaseUrl: true,
    defaultBaseUrl: '',
    docsUrl: 'https://platform.openai.com/docs/api-reference/images',
    requestFormat:
      '兼容 OpenAI Images API：POST {Base URL}/images/edits 或 /images/generations，返回 data[].b64_json 或 data[].url',
    supportsImageEditing: true,
    models: [
      {
        id: 'flux-kontext-pro',
        label: 'flux-kontext-pro（示例）',
        supportsImageEditing: true,
        formats: ['png', 'jpeg'],
        notes: '仅为示例名称，请填你的服务商实际模型名',
      },
      {
        id: 'sd3.5-large',
        label: 'sd3.5-large（示例）',
        supportsImageEditing: true,
        formats: ['png'],
        notes: '仅为示例名称，需确认该接口是否支持图片编辑',
      },
    ],
  },
]

export function getImageProviderOptions(): ImageProviderOption[] {
  return IMAGE_PROVIDER_OPTIONS
}
