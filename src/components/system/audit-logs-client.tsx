"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  User,
  Activity,
  Terminal,
} from "lucide-react";
import { clearAllAuditLogs } from "@/actions/audit-logs";

interface AuditLog {
  id: string;
  userId: string | null;
  username: string;
  name: string;
  action: string;
  module: string;
  details: string;
  ip: string | null;
  createdAt: Date;
}

interface AuditLogsClientProps {
  initialData: {
    logs: AuditLog[];
    total: number;
    totalPages: number;
    currentPage: number;
  };
  currentUser: {
    id: string;
    name?: string | null;
    username?: string | null;
    isAdmin?: boolean;
  };
}

export default function AuditLogsClient({ initialData, currentUser }: AuditLogsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [selectedModule, setSelectedModule] = useState(searchParams.get("module") || "ALL");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const modules = [
    { value: "ALL", label: "所有模块" },
    { value: "PROJECT", label: "项目管理" },
    { value: "WBS", label: "WBS 任务" },
    { value: "REQUIREMENT", label: "需求池" },
    { value: "USER", label: "用户/团队" },
    { value: "SYSTEM", label: "系统管理" },
  ];

  // 更新搜索参数并跳转路由（触发服务器端获取新数据）
  const handleFilter = (query: string, mod: string, pageNum: number = 1) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (mod && mod !== "ALL") params.set("module", mod);
    if (pageNum > 1) params.set("page", pageNum.toString());

    startTransition(() => {
      router.push(`/system/audit-logs?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter(searchTerm, selectedModule, 1);
  };

  const handleClearLogs = async () => {
    try {
      const res = await clearAllAuditLogs();
      if (res.success) {
        setShowConfirmClear(false);
        router.refresh();
      } else {
        alert(res.error || "清空日志失败");
      }
    } catch (err) {
      alert("清空操作异常");
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "UPDATE":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "DELETE":
      case "DELETE_ALL":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "DISABLE":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            审计日志
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            追踪全系统成员的所有关键操作及状态变更记录，保障系统可审计性与数据安全。
          </p>
        </div>

        {/* 管理员清空按钮 */}
        {currentUser.isAdmin && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            清空日志
          </button>
        )}
      </div>

      {/* 搜索过滤控制区 */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-card border border-border p-4 rounded-2xl"
      >
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索用户名/姓名/操作内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-input py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              handleFilter(searchTerm, e.target.value, 1);
            }}
            className="w-full appearance-none rounded-xl border border-border bg-input py-2 pl-10 pr-8 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
          >
            {modules.map((m) => (
              <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {isPending ? "检索中..." : "查询"}
          </button>
        </div>
      </form>

      {/* 日志内容表格 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-muted-foreground">
            <thead className="bg-muted/30 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-border">
              <tr>
                <th className="px-6 py-4">操作时间</th>
                <th className="px-6 py-4">操作用户</th>
                <th className="px-6 py-4">操作模块</th>
                <th className="px-6 py-4">动作</th>
                <th className="px-6 py-4">详情描述</th>
                <th className="px-6 py-4">IP地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {initialData.logs.length > 0 ? (
                initialData.logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/10">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-900 dark:text-slate-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(log.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {log.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{log.name}</div>
                          <div className="text-xs text-muted-foreground">@{log.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 border border-border/80 px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <Activity className="h-3 w-3" />
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-900 dark:text-slate-200 max-w-md break-words">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {log.ip || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm">
                    没有找到符合条件的审计日志。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制区 */}
        {initialData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-white/2">
            <span className="text-xs text-muted-foreground">
              共 {initialData.total} 条日志 · 第 {initialData.currentPage}/{initialData.totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={initialData.currentPage <= 1 || isPending}
                onClick={() => handleFilter(searchTerm, selectedModule, initialData.currentPage - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white/3 transition hover:bg-white/5 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={initialData.currentPage >= initialData.totalPages || isPending}
                onClick={() => handleFilter(searchTerm, selectedModule, initialData.currentPage + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white/3 transition hover:bg-white/5 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 确认清空 Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-slate-900 p-6 shadow-xl animate-scale-up">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <ShieldAlert className="h-8 w-8" />
              <h3 className="text-lg font-bold text-white">确定清空审计日志？</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              此操作会**永久删除**系统中积累的所有审计日志，清除后不可恢复，请谨慎操作！
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                取消
              </button>
              <button
                onClick={handleClearLogs}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                确定清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
