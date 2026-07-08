import type { Metadata } from "next";
import "./globals.css";

// 全站元数据
export const metadata: Metadata = {
  title: "AI2PmP - 研发项目管理系统",
  description: "内部研发项目管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
