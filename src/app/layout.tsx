import type { Metadata } from "next";
import "./globals.css";

// 全站元数据
export const metadata: Metadata = {
  title: "SDLC · 研发效能平台",
  description: "内部研发效能平台",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
