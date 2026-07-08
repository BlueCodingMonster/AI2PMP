"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { registerUser } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 表单状态
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * 客户端表单验证
   * 服务端还会再做一次 Zod 校验，双重保障
   */
  const validate = (): string | null => {
    if (!name.trim()) return "请输入姓名";
    if (name.trim().length < 2) return "姓名至少2个字符";
    if (!username.trim()) return "请输入登录名";
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username.trim())) {
      return "登录名需为3-32位字母、数字、下划线或短横线";
    }
    if (!password) return "请输入密码";
    if (password.length < 6) return "密码至少6个字符";
    if (password !== confirmPassword) return "两次输入的密码不一致";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerUser({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password,
        });

        if (!result.success) {
          setError(result.error ?? "注册失败，请稍后重试");
          return;
        }

        setSuccess("注册成功！正在跳转到登录页面...");
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } catch {
        setError("注册失败，请稍后重试");
      }
    });
  };

  return (
    <div className="flex flex-col items-center">
      {/* 品牌区域 */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <UserPlus className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          AI2PmP
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">研发项目管理系统</p>
      </div>

      {/* 注册卡片 */}
      <div className="glass-strong w-full rounded-2xl p-8 shadow-2xl shadow-black/20">
        <h2 className="mb-6 text-lg font-semibold text-white">创建账号</h2>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 姓名 */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-muted-foreground"
            >
              姓名
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

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
                autoComplete="new-password"
                placeholder="至少6个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-muted-foreground"
            >
              确认密码
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              "注册"
            )}
          </button>
        </form>

        {/* 登录链接 */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
