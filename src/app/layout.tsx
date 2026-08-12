import type { Metadata, Viewport } from 'next';
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
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <PWAHead />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
