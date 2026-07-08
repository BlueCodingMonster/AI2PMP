"use client";

import { useState } from "react";
import Link from "next/link";
import { BugStatus, BugSeverity, Priority } from "@prisma/client";
import { Search, Plus, AlertTriangle, Monitor, User, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const statusLabels: Record<BugStatus, { label: string; className: string }> = {
  OPEN: { label: "新建 (Open)", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  CONFIRMED: { label: "已确认", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  IN_PROGRESS: { label: "修复中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  FIXED: { label: "已修复", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  CLOSED: { label: "已关闭", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  WONT_FIX: { label: "不予修复", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const severityLabels: Record<BugSeverity, { label: string; className: string }> = {
  BLOCKER: { label: "崩溃 (Blocker)", className: "bg-red-600/90 text-white border-red-500/30" },
  CRITICAL: { label: "严重 (Critical)", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  MAJOR: { label: "主要 (Major)", className: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  MINOR: { label: "次要 (Minor)", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  TRIVIAL: { label: "轻微 (Trivial)", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const priorityLabels: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "紧急", className: "bg-red-500/15 text-red-400" },
  HIGH: { label: "高", className: "bg-orange-500/15 text-orange-400" },
  MEDIUM: { label: "中", className: "bg-blue-500/15 text-blue-400" },
  LOW: { label: "低", className: "bg-gray-500/15 text-gray-400" },
};

interface BugListClientProps {
  initialBugs: any[];
  projects: { id: string; name: string; key: string }[];
  users: { id: string; name: string }[];
}

export default function BugListClient({ initialBugs, projects, users }: BugListClientProps) {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const filteredBugs = initialBugs.filter((bug) => {
    const matchSearch =
      bug.title.toLowerCase().includes(search.toLowerCase()) ||
      (bug.description && bug.description.toLowerCase().includes(search.toLowerCase()));

    const matchProject = selectedProjectId ? bug.projectId === selectedProjectId : true;
    const matchAssignee = selectedAssigneeId ? bug.assigneeId === selectedAssigneeId : true;
    const matchSeverity = selectedSeverity ? bug.severity === selectedSeverity : true;
    const matchStatus = selectedStatus ? bug.status === selectedStatus : true;

    return matchSearch && matchProject && matchAssignee && matchSeverity && matchStatus;
  });

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      {/* 过滤面板 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex flex-wrap flex-1 gap-3 items-center">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="搜索 Bug 标题或内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-1.5 pl-9 pr-4 text-xs text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* 项目过滤 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          {/* 负责人过滤 */}
          <select
            value={selectedAssigneeId}
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">全部负责人</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* 严重程度过滤 */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">全部严重程度</option>
            <option value="BLOCKER">崩溃 (Blocker)</option>
            <option value="CRITICAL">严重 (Critical)</option>
            <option value="MAJOR">主要 (Major)</option>
            <option value="MINOR">次要 (Minor)</option>
            <option value="TRIVIAL">轻微 (Trivial)</option>
          </select>

          {/* 状态过滤 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">全部状态</option>
            <option value="OPEN">新建 (Open)</option>
            <option value="CONFIRMED">已确认</option>
            <option value="IN_PROGRESS">修复中</option>
            <option value="FIXED">已修复</option>
            <option value="CLOSED">已关闭</option>
            <option value="WONT_FIX">不予修复</option>
          </select>
        </div>

        <Link
          href="/bugs/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 shrink-0"
        >
          <Plus className="h-4 w-4" />
          提交 Bug 缺陷
        </Link>
      </div>

      {/* 缺陷表格 */}
      <div className="glass rounded-xl overflow-hidden border border-border/60">
        {filteredBugs.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            未筛选到符合条件的 Bug 缺陷。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                  <th className="p-3">缺陷ID</th>
                  <th className="p-3">缺陷摘要标题</th>
                  <th className="p-3">所属项目</th>
                  <th className="p-3">严重程度</th>
                  <th className="p-3">优先级</th>
                  <th className="p-3">负责人</th>
                  <th className="p-3">当前状态</th>
                  <th className="p-3">提交日期</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredBugs.map((bug) => {
                  const severityConfig = severityLabels[bug.severity as BugSeverity] || { label: bug.severity, className: "" };
                  const priorityConfig = priorityLabels[bug.priority as Priority] || { label: bug.priority, className: "" };
                  const statusConfig = statusLabels[bug.status as BugStatus] || { label: bug.status, className: "" };

                  return (
                    <tr key={bug.id} className="hover:bg-muted/10 transition-all">
                      <td className="p-3 font-semibold text-indigo-400 uppercase">
                        {bug.project.key}-BUG-{bug.id.slice(0, 4).toUpperCase()}
                      </td>
                      <td className="p-3 font-bold text-white max-w-[200px] truncate">
                        <Link href={`/bugs/${bug.id}`} className="hover:text-indigo-300">
                          {bug.title}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{bug.project.name}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${severityConfig.className}`}
                        >
                          {severityConfig.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${priorityConfig.className}`}>
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {bug.assignee?.name || <span className="italic text-gray-600">未指派</span>}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {format(new Date(bug.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/bugs/${bug.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5"
                        >
                          详情
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
