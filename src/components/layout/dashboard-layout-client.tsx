"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import SdlcIcon from "@/components/ui/sdlc-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { globalSearch } from "@/actions/search";
import {
  LayoutDashboard,
  Lightbulb,
  CalendarRange,
  BarChart3,
  Users,
  FolderKanban,
  Boxes,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Layers,
  ClipboardList,
  GanttChartSquare,
  CalendarDays,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { label: "仪表盘", href: "/", icon: LayoutDashboard },
  { label: "需求池", href: "/requirements", icon: Lightbulb },
  { label: "计划管理", href: "/plans", icon: CalendarRange },
  { label: "任务管理", href: "/managed-tasks", icon: GanttChartSquare },
  { label: "项目管理", href: "/projects", icon: FolderKanban },
  { label: "运维台账", href: "/operations", icon: ClipboardList },
  { label: "产品线管理", href: "/product-catalog", icon: Boxes },
  {
    label: "系统管理",
    icon: Settings,
    children: [
      { label: "工作日历", href: "/work-calendar", icon: CalendarDays },
      { label: "报表统计", href: "/reports", icon: BarChart3 },
      { label: "团队管理", href: "/team", icon: Users },
      { label: "产品线小组", href: "/product-lines", icon: Layers },
      { label: "审计日志", href: "/system/audit-logs", icon: ScrollText },
    ],
  },
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
}

export default function DashboardLayoutClient({
  children,
  user,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    projects: { id: string; name: string; key: string }[];
    tasks: { id: string; title: string; sequenceNo: number }[];
    members: { id: string; name: string; username: string; department: string | null; position: string | null }[];
  }>({ projects: [], tasks: [], members: [] });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = searchVal.trim();
      if (!trimmed) {
        setResults({ projects: [], tasks: [], members: [] });
        return;
      }
      setIsSearching(true);
      try {
        const res = await globalSearch(trimmed);
        if (res.success && res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => {
    if (
      pathname.startsWith("/work-calendar") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/team") ||
      pathname.startsWith("/product-lines")
    ) {
      setSystemMenuOpen(true);
    }
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
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
          fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border
          transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isCollapsed ? "lg:w-16" : "lg:w-64"}
          ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        `}
      >
        {/* 品牌区域 */}
        <div className={`flex h-16 items-center border-b border-border transition-all ${
          isCollapsed ? "lg:justify-center lg:px-0 px-4 justify-between" : "justify-between px-4"
        }`}>
          <Link href="/" className="flex items-center gap-3 group shrink-0" title="SDLC 研发效能平台">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/80 dark:bg-white/[0.02] dark:border-white/10 shadow-xs backdrop-blur-md group-hover:scale-105 transition-transform duration-300">
              <SdlcIcon size={32} colored={true} />
            </div>
            <div className={`${isCollapsed ? "lg:hidden" : "block"} transition-opacity duration-200`}>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none block whitespace-nowrap">
                SDLC
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold tracking-tight leading-none block mt-0.5 whitespace-nowrap">
                研发效能平台
              </span>
            </div>
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
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              if (item.label === "系统管理" && !user.isAdmin) {
                return null;
              }
              if ("children" in item && item.children) {
                const isSysActive = item.children.some(child => isActive(child.href));
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setSystemMenuOpen(true);
                        } else {
                          setSystemMenuOpen(!systemMenuOpen);
                        }
                      }}
                      title={item.label}
                      className={`
                        group flex items-center rounded-xl transition-all duration-200
                        ${isCollapsed 
                          ? "lg:w-10 lg:h-10 lg:mx-auto lg:p-0 lg:justify-center w-full px-3 py-2.5 justify-between" 
                          : "w-full px-3 py-2.5 justify-between text-sm font-medium"
                        }
                        ${
                          isSysActive
                            ? "text-white font-semibold bg-indigo-600/20 dark:bg-indigo-500/20 border border-indigo-500/30"
                            : "text-sidebar-foreground hover:bg-accent hover:text-white"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isSysActive
                              ? "text-indigo-400"
                              : "text-muted-foreground group-hover:text-white"
                          }`}
                        />
                        <span className={isCollapsed ? "lg:hidden text-sm" : "block text-sm"}>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          systemMenuOpen ? "rotate-180" : ""
                        } ${isCollapsed ? "lg:hidden" : "block"}`}
                      />
                    </button>
                    {systemMenuOpen && (
                      <ul className="mt-1 space-y-1">
                        {item.children.map((child) => {
                          const active = isActive(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                prefetch={true}
                                onClick={() => setSidebarOpen(false)}
                                title={child.label}
                                className={`
                                  group flex items-center rounded-xl transition-all duration-200 relative
                                  ${isCollapsed
                                    ? "lg:w-10 lg:h-10 lg:mx-auto lg:p-0 lg:justify-center pl-9 pr-3 py-2"
                                    : "pl-9 pr-3 py-2 text-xs font-medium"
                                  }
                                  ${
                                    active
                                      ? "bg-indigo-600/20 text-indigo-600 dark:text-white shadow-sm font-semibold border border-indigo-500/30"
                                      : "text-sidebar-foreground/80 hover:bg-accent hover:text-foreground"
                                  }
                                `}
                              >
                                {active && !isCollapsed && (
                                  <div className="absolute left-4 h-4 w-1 rounded-r-full bg-sidebar-active" />
                                )}
                                <child.icon
                                  className={`h-4 w-4 shrink-0 transition-colors ${
                                    active
                                      ? "text-indigo-600 dark:text-indigo-400"
                                      : "text-muted-foreground group-hover:text-foreground"
                                  }`}
                                />
                                <span className={isCollapsed ? "lg:hidden" : "block"}>{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => setSidebarOpen(false)}
                    title={item.label}
                    className={`
                      group flex items-center rounded-xl transition-all duration-200 relative
                      ${isCollapsed
                        ? "lg:w-10 lg:h-10 lg:mx-auto lg:p-0 lg:justify-center px-3 py-2.5"
                        : "px-3 py-2.5 text-sm font-medium"
                      }
                      ${
                        active
                          ? "bg-blue-50/90 text-[#0066CC] border border-blue-200/80 shadow-xs font-semibold dark:bg-gradient-to-r dark:from-indigo-600/25 dark:to-purple-600/15 dark:text-white dark:border-indigo-500/30"
                          : "text-sidebar-foreground hover:bg-accent hover:text-foreground"
                      }
                    `}
                  >
                    {/* 激活指示条 (仅在展开模式显示) */}
                    {active && !isCollapsed && (
                      <div className="absolute left-0 h-5 w-1 rounded-r-full bg-[#0066CC] dark:bg-sidebar-active" />
                    )}
                    <item.icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        active
                          ? "text-[#0066CC] dark:text-indigo-400"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <span className={isCollapsed ? "lg:hidden" : "block"}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部用户信息（侧边栏） */}
        <div className={`border-t border-border p-2 pb-4 bg-muted/20 transition-all ${isCollapsed ? "lg:pb-5" : ""}`}>
          <div
            className={`flex items-center rounded-xl text-sm text-sidebar-foreground transition-all ${
              isCollapsed ? "lg:w-10 lg:h-10 lg:mx-auto lg:p-0 lg:justify-center px-3 py-2.5 gap-3" : "px-3 py-2.5 gap-3"
            }`}
            title={`${user.name || "未指定姓名"} (@${user.username || "未设置"})`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase shadow-sm">
              {userInitials}
            </div>
            <div className={`flex-1 min-w-0 ${isCollapsed ? "lg:hidden" : "block"}`}>
              <p className="text-sm font-medium text-foreground truncate">{user.name || "未指定姓名"}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username || "未设置登录名"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== 主内容区域 ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          {/* 左侧：汉堡菜单/折叠切换 + 搜索 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>

            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="搜索项目、任务、成员..."
                className="w-64 rounded-lg border border-border bg-input py-2 pl-10 pr-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary lg:w-80"
              />

              {/* 搜索结果下拉面板 */}
              {showResults && searchVal.trim() !== "" && (
                <>
                  {/* 点击外部关闭 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                  />
                  <div className="absolute left-0 mt-2 z-50 w-80 rounded-xl border border-border bg-card p-3 shadow-2xl shadow-black/40 animate-fade-in max-h-[400px] overflow-y-auto lg:w-[360px]">
                    {isSearching ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        正在搜索中...
                      </div>
                    ) : results.projects.length === 0 && results.tasks.length === 0 && results.members.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        未找到相关结果
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 项目结果 */}
                        {results.projects.length > 0 && (
                          <div>
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2">
                              项目
                            </div>
                            <div className="space-y-0.5">
                              {results.projects.map((proj) => (
                                <Link
                                  key={proj.id}
                                  href={`/projects/${proj.id}`}
                                  onClick={() => {
                                    setShowResults(false);
                                    setSearchVal("");
                                  }}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white hover:bg-accent transition"
                                >
                                  <FolderKanban className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                  <span className="font-semibold text-indigo-300">[{proj.key}]</span>
                                  <span className="truncate">{proj.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 任务结果 */}
                        {results.tasks.length > 0 && (
                          <div>
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2">
                              任务
                            </div>
                            <div className="space-y-0.5">
                              {results.tasks.map((task) => (
                                <Link
                                  key={task.id}
                                  href={`/managed-tasks?search=${encodeURIComponent(task.title)}`}
                                  onClick={() => {
                                    setShowResults(false);
                                    setSearchVal("");
                                  }}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white hover:bg-accent transition"
                                >
                                  <ClipboardList className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                  <span className="font-semibold text-purple-300">#{task.sequenceNo}</span>
                                  <span className="truncate">{task.title}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 成员结果 */}
                        {results.members.length > 0 && (
                          <div>
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2">
                              成员
                            </div>
                            <div className="space-y-0.5">
                              {results.members.map((member) => (
                                <Link
                                  key={member.id}
                                  href={`/team`}
                                  onClick={() => {
                                    setShowResults(false);
                                    setSearchVal("");
                                  }}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white hover:bg-accent transition"
                                >
                                  <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span className="font-medium">{member.name}</span>
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {member.department ? `@${member.department}` : ""}
                                    {member.position ? ` · ${member.position}` : ""}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右侧：主题切换 + 用户 */}
          <div className="flex items-center gap-3">
            {/* 主题切换按钮 */}
            <ThemeToggle />

            {/* 用户下拉 */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-white transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                  {userInitials}
                </div>
                <span className="hidden font-medium text-foreground md:inline">
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
        <main className="flex-1 overflow-y-auto p-3 lg:p-4.5">{children}</main>
      </div>
    </div>
  );
}
