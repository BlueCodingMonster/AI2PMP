"use client";

import { useEffect } from "react";

/**
 * 登录/注册页面专属的深色主题强制执行器
 * 无论系统全局保存了何种主题（Light 或 Dark），只要处于登录/注册流程中，
 * 均强制将 HTML 根节点约束为 Dark 深色极客主题，并在离开时自动恢复。
 */
function AuthDarkThemeEnforcer() {
  useEffect(() => {
    const root = document.documentElement;

    const enforceDark = () => {
      if (root.classList.contains("light") || !root.classList.contains("dark")) {
        root.classList.remove("light");
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      }
    };

    enforceDark();

    // 防止组件加载过程中第三方库或 ThemeProvider 覆盖主题类名
    const observer = new MutationObserver(() => {
      enforceDark();
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

    return () => {
      observer.disconnect();
      // 离开 auth 页面时，根据 localStorage 中保存的用户个性化主题恢复设置
      const savedTheme = localStorage.getItem("sdlc-theme");
      if (savedTheme === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
        root.setAttribute("data-theme", "light");
      }
    };
  }, []);

  return null;
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark bg-[#060913] text-slate-100 relative flex min-h-screen items-center justify-center overflow-hidden">
      <AuthDarkThemeEnforcer />
      
      {/* 背景渐变层 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.18) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.12) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(67,56,202,0.10) 0%, transparent 50%)",
        }}
      />

      {/* 装饰性光斑 */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-indigo-600/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-purple-600/8 blur-3xl" />

      {/* 内容容器 */}
      <div className="relative z-10 w-full px-4 py-8 animate-fade-in flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
