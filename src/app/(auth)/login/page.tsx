"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, User, Lock, Loader2, AlertCircle } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 表单状态
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 获取回调 URL，默认是首页
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  /**
   * 处理登录提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 基础验证
    if (!username.trim()) {
      setError("请输入登录名");
      return;
    }
    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          username: username.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (res?.error) {
          setError("登录失败，请检查登录名和密码");
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch (err) {
        console.error("登录错误:", err);
        setError("登录出错，请稍后重试");
      }
    });
  };

  return (
    <div className="flex flex-col items-center">
      {/* 品牌区域 */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <LogIn className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          AI2PmP
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">研发项目管理系统</p>
      </div>

      {/* 登录卡片 */}
      <div className="glass-strong w-full rounded-2xl p-8 shadow-2xl shadow-black/20">
        <h2 className="mb-6 text-lg font-semibold text-white">欢迎回来</h2>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 登录名 */}
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-muted-foreground"
            >
              登录名
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="请输入登录名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted-foreground"
            >
              密码
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </button>
        </form>

        {/* 注册链接 */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          没有账号？{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
