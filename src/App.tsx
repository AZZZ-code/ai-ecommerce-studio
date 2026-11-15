import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { GeneratePage } from '@/pages/GeneratePage'
import { StudioPage } from '@/pages/StudioPage'
import { SeoPage } from '@/pages/SeoPage'
import { ModelsPage } from '@/pages/ModelsPage'
import { AboutPage } from '@/pages/AboutPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * 路由表：六个主页面挂在 Layout 下（共享导航栏与页脚），
 * 未匹配路径统一落到 NotFoundPage。
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'generate', element: <GeneratePage /> },
      { path: 'studio', element: <StudioPage /> },
      { path: 'seo', element: <SeoPage /> },
      { path: 'models', element: <ModelsPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
