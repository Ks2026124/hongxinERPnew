import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from '@/components/ui/sonner';
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {isDev && <Inspector />}
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
