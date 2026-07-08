"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { changeTaskStatus } from "@/actions/tasks";
import { TaskStatus, Priority, TaskType } from "@prisma/client";
import {
  KanbanSquare,
  ListFilter,
  Plus,
  Search,
  CheckSquare,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 看板状态列定义
const columns: { status: TaskStatus; label: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { status: TaskStatus.TODO, label: "待办 (Todo)", bgClass: "bg-gray-900/40", textClass: "text-gray-400", borderClass: "border-gray-500/20" },
  { status: TaskStatus.IN_PROGRESS, label: "进行中 (In Progress)", bgClass: "bg-blue-950/20", textClass: "text-blue-400", borderClass: "border-blue-500/20" },
  { status: TaskStatus.IN_REVIEW, label: "评审中 (In Review)", bgClass: "bg-purple-950/20", textClass: "text-purple-400", borderClass: "border-purple-500/20" },
  { status: TaskStatus.DONE, label: "已完成 (Done)", bgClass: "bg-emerald-950/20", textClass: "text-emerald-400", borderClass: "border-emerald-500/20" },
  { status: TaskStatus.CANCELLED, label: "已取消 (Cancelled)", bgClass: "bg-rose-950/20", textClass: "text-rose-400", borderClass: "border-rose-500/20" },
];

const priorityMap: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "紧急", className: "bg-rose-500/10 text-rose-400" },
  HIGH: { label: "高", className: "bg-orange-500/10 text-orange-400" },
  MEDIUM: { label: "中", className: "bg-blue-500/10 text-blue-400" },
  LOW: { label: "低", className: "bg-gray-500/10 text-muted-foreground" },
};

const typeLabels: Record<TaskType, string> = {
  FEATURE: "功能",
  IMPROVEMENT: "改进",
  TASK: "开发",
  SUBTASK: "子任务",
};

interface TaskBoardClientProps {
  initialTasks: any[];
  projects: { id: string; name: string; key: string }[];
  users: { id: string; name: string }[];
}

export default function TaskBoardClient({ initialTasks, projects, users }: TaskBoardClientProps) {
  const [isPending, startTransition] = useTransition();

  // 视图类型
  const [view, setView] = useState<"kanban" | "list">("kanban");
  
  // 筛选器状态
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  // 处理拖放 logic (HTML5 Drag & Drop)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 必须调用 preventDefault 才能触发 drop
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    if (!taskId) return;

    // 状态相同不触发流转
    const currentTask = initialTasks.find((t) => t.id === taskId);
    if (currentTask && currentTask.status === targetStatus) return;

    startTransition(async () => {
      try {
        const res = await changeTaskStatus(taskId, targetStatus);
        if (!res.success) {
          alert(res.error || "状态流转失败");
        }
      } catch (err) {
        console.error("更新状态出错:", err);
      }
    });
  };

  // 客户端筛选逻辑
  const filteredTasks = initialTasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchProject = selectedProjectId ? task.projectId === selectedProjectId : true;
    const matchAssignee = selectedAssigneeId ? task.assigneeId === selectedAssigneeId : true;
    const matchPriority = selectedPriority ? task.priority === selectedPriority : true;

    return matchSearch && matchProject && matchAssignee && matchPriority;
  });

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      {/* 筛选器控制条 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex flex-wrap flex-1 gap-3 items-center">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="搜索任务名称/描述..."
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

          {/* 优先级过滤 */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">全部优先级</option>
            <option value="URGENT">紧急</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>

        {/* 视图切换及新建按钮 */}
        <div className="flex flex-wrap gap-3 items-center shrink-0">
          <div className="flex bg-input/40 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded font-medium transition-all ${
                view === "kanban" ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-white"
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              看板视图
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded font-medium transition-all ${
                view === "list" ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-white"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              列表视图
            </button>
          </div>

          <Link
            href="/tasks/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500"
          >
            <Plus className="h-4 w-4" />
            分解新任务
          </Link>
        </div>
      </div>

      {/* 1. 看板视图 (Kanban Board) */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto lg:grid-cols-5 min-h-[500px]">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((task) => task.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl border ${col.borderClass} ${col.bgClass} p-4 flex flex-col space-y-4 min-w-[240px]`}
              >
                {/* 列头 */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className={`font-bold ${col.textClass}`}>{col.label}</h3>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">
                    {columnTasks.length}
                  </span>
                </div>

                {/* 卡片列表 */}
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-0.5">
                  {columnTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground text-[10px] py-12 border border-dashed border-border/20 rounded-xl">
                      暂无相关任务
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priorityConfig = priorityMap[task.priority as Priority] || {
                        label: task.priority,
                        className: "",
                      };
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className="glass rounded-xl border border-border/60 p-4 space-y-3 cursor-grab active:cursor-grabbing hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                              {task.project.key}-{task.id.slice(0, 4).toUpperCase()}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${priorityConfig.className}`}
                            >
                              {priorityConfig.label}
                            </span>
                          </div>

                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-bold text-white hover:text-indigo-300 transition-colors block text-xs"
                          >
                            {task.title}
                          </Link>

                          {/* 底部指标信息 */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/30 text-[9px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              <span>{task.assignee?.name || "未指派"}</span>
                            </div>

                            {task.estimatedHours && (
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{task.estimatedHours}h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. 列表视图 (List View Table) */}
      {view === "list" && (
        <div className="glass rounded-xl overflow-hidden border border-border/60">
          {filteredTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              暂无匹配的任务清单。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                    <th className="p-3">任务ID</th>
                    <th className="p-3">任务标题</th>
                    <th className="p-3">所属项目</th>
                    <th className="p-3">类型</th>
                    <th className="p-3">负责人</th>
                    <th className="p-3">优先级</th>
                    <th className="p-3">当前状态</th>
                    <th className="p-3">截止日期</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredTasks.map((task) => {
                    const priorityConfig = priorityMap[task.priority as Priority] || { label: task.priority, className: "" };
                    const statusConfig = columns.find(c => c.status === task.status) || { label: task.status, textClass: "" };

                    return (
                      <tr key={task.id} className="hover:bg-muted/10 transition-all">
                        <td className="p-3 font-semibold text-indigo-400 uppercase">
                          {task.project.key}-{task.id.slice(0, 4).toUpperCase()}
                        </td>
                        <td className="p-3 font-bold text-white max-w-[200px] truncate">
                          <Link href={`/tasks/${task.id}`} className="hover:text-indigo-300">
                            {task.title}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {task.project.name}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {typeLabels[task.type as TaskType]}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {task.assignee?.name || <span className="italic text-gray-600">未指派</span>}
                        </td>
                        <td className="p-3">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${priorityConfig.className}`}>
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-bold ${statusConfig.textClass}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd", { locale: zhCN }) : "未设置"}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/tasks/${task.id}`}
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
      )}
    </div>
  );
}
