"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Lightbulb,
  CalendarRange,
  CheckSquare,
  Bug,
  BarChart3,
  Users,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Layers,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { label: "仪表盘", href: "/", icon: LayoutDashboard },
  { label: "需求池", href: "/requirements", icon: Lightbulb },
  { label: "计划管理", href: "/plans", icon: CalendarRange },
  { label: "计划总览", href: "/plans/overview", icon: BarChart3 },
  { label: "计划外工作", href: "/plans/unplanned", icon: AlertTriangle },
  { label: "我的任务", href: "/tasks", icon: CheckSquare },
  { label: "甘特图", href: "/gantt", icon: CalendarRange },
  { label: "Bug 跟踪", href: "/bugs", icon: Bug },
  { label: "报表统计", href: "/reports", icon: BarChart3 },
  { label: "团队管理", href: "/team", icon: Users },
  { label: "产品线小组", href: "/product-lines", icon: Layers },
  { label: "通知中心", href: "/notifications", icon: Bell },
];

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin?: boolean;
  };
  initialUnreadCount?: number;
}

export default function DashboardLayoutClient({
  children,
  user,
  initialUnreadCount = 0,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    // 监听实时未读数量推送 (SSE)
    const eventSource = new EventSource("/api/notifications/sse");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // 忽略心跳或解析失败
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userInitials = user.name ? user.name.slice(0, 2) : "用";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== 移动端遮罩层 ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== 侧边栏 ===== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-border
          transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* 品牌区域 */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              AI2PmP
            </span>
          </Link>

          {/* 移动端关闭按钮 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                      transition-all duration-200 relative
                      ${
                        active
                          ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white shadow-sm font-semibold"
                          : "text-sidebar-foreground hover:bg-accent hover:text-white"
                      }
                    `}
                  >
                    {/* 激活指示条 */}
                    {active && (
                      <div className="absolute left-0 h-5 w-1 rounded-r-full bg-sidebar-active" />
                    )}
                    <item.icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active
                          ? "text-indigo-400"
                          : "text-muted-foreground group-hover:text-white"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部用户信息（侧边栏） */}
        <div className="border-t border-border p-3 bg-black/10">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name || "未指定姓名"}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username || "未设置登录名"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== 主内容区域 ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          {/* 左侧：汉堡菜单 + 搜索 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="搜索项目、任务、成员..."
                className="w-64 rounded-lg border border-border bg-input py-2 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary lg:w-80"
              />
            </div>
          </div>

          {/* 右侧：通知 + 用户 */}
          <div className="flex items-center gap-3">
            {/* 通知铃铛 */}
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-white transition-colors"
            >
              <Bell className="h-5 w-5" />
              {/* 未读标记 */}
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* 用户下拉 */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-white transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                  {userInitials}
                </div>
                <span className="hidden font-medium text-white md:inline">
                  {user.name || "未指定"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* 下拉菜单 */}
              {userMenuOpen && (
                <>
                  {/* 点击外部关闭 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 animate-fade-in rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/30">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      个人设置
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
                    >
                      <User className="h-4 w-4" />
                      个人信息
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
