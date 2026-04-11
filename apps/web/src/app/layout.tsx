import './globals.css';
import type { Metadata } from "next";
import ClientWrapper from '@/components/User/ClientWrapper';

export const metadata: Metadata = {
  title: "ICP - 智协平台 - AI人机协作", 
  description: "AI帮你理解科学，提供高精准论文解读与问答",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 使用客户端包装器包裹子组件 */}
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}