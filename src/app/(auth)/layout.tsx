export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
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
