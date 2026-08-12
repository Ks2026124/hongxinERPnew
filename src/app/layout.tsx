import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from '@/components/ui/sonner';
import { PWAHead } from '@/components/pwa-head';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '鸿信ERP - 员工客户管理系统',
    template: '%s | 鸿信ERP',
  },
  description: '鸿信ERP - 公司内部员工客户管理系统，用于客户资料管理、团队管理和员工管理。',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '鸿信ERP',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#C4956A',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <PWAHead />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {isDev && <Inspector />}
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
