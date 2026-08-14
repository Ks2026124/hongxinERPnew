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
    statusBarStyle: 'black-translucent',
    title: '鸿信ERP',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <PWAHead />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
