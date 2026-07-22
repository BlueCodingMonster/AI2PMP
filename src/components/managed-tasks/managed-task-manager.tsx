"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Edit3,
  Folder,
  Info,
  Layers3,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  createManagedTask,
  deleteOrCancelManagedTask,
  saveWorkCalendar,
  updateManagedTask,
} from "@/actions/managed-tasks";

type IdName = { id: string; name: string };
type VersionOption = { id: string; label: string };
type MonthlyItem = { planId: string; itemType: string; itemId: string; label: string };
type TaskItem = {
  id: string;
  sequenceNo: number;
  title: string;
  description: string | null;
  level: number;
  parentId: string | null;
  category: string | null;
  sdlcNode: string | null;
  status: string;
  planStartDate: string | null;
  planEndDate: string | null;
  plannedWorkdays: number;
  actualWorkdays: number;
  progressPercent: number;
  actualStartAt: string | null;
  actualFinishAt: string | null;
  executorId: string | null;
  productLineTeam: IdName;
  createdBy: IdName;
  executor: (IdName & { position?: string | null }) | null;
  monthlyPlanId: string | null;
  monthlyItemType: string | null;
  monthlyItemId: string | null;
  versionType: string | null;
  productVersionId: string | null;
  projectVersionId: string | null;
  notes: string | null;
  children: Array<{ id: string }>;
};
type CalendarItem = {
  id: string;
  year: number;
  status: string;
  standardHours: number;
  days: Array<{ date: string; type: string; standardHours: number | null; label: string | null; notes: string | null }>;
};
type Context = {
  users: (IdName & { position?: string | null; level?: string | null })[];
  teams: Array<IdName & { members: Array<{ userId: string; role: string }> }>;
  versions: { products: VersionOption[]; projects: VersionOption[] };
  monthlyItems: MonthlyItem[];
};
type ViewMode = "wbs" | "person";
type TimelineRow = { 
  id: string; 
  kind: "group" | "task"; 
  label: string; 
  subtitle?: string; 
  task?: TaskItem; 
  depth?: number;
  planStartDate?: string | null;
  planEndDate?: string | null;
  progressPercent?: number;
  isOverallocated?: boolean;
};

const statusLabels: Record<string, string> = {
  UNSCHEDULED: "待排期",
  TODO: "待开始",
  IN_PROGRESS: "进行中",
  PAUSED: "已暂停",
  DONE: "已完成",
  CANCELLED: "已取消",
};
const sdlcLabels: Record<string, string> = {
  REQUIREMENT_ANALYSIS: "需求分析",
  SOLUTION_DESIGN: "方案设计",
  DEVELOPMENT: "开发",
  INTEGRATION: "联调",
  TESTING: "测试",
  RELEASE: "发布",
  ACCEPTANCE: "验收",
  OPERATION_OBSERVATION: "运维观察",
  OTHER: "其他",
};
const dayTypeLabels: Record<string, string> = {
  REGULAR_WORKDAY: "普通工作日",
  REGULAR_WEEKEND: "普通周末",
  LEGAL_HOLIDAY: "法定节假日",
  ADJUSTED_WORKDAY: "调休工作日",
  SPECIAL_REST_DAY: "特殊休息日",
  SPECIAL_WORKDAY: "特殊工作日",
};
const statuses = Object.keys(statusLabels);
const sdlcNodes = Object.keys(sdlcLabels);
const dayTypes = Object.keys(dayTypeLabels);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

const initialForm = {
  parentId: "",
  title: "",
  description: "",
  category: "DEVELOPMENT",
  sdlcNode: "",
  status: "UNSCHEDULED",
  planStartDate: "",
  planEndDate: "",
  plannedWorkdays: 0,
  actualWorkdays: 0,
  progressPercent: 0,
  actualStartAt: "",
  actualFinishAt: "",
  executorId: "",
  monthlyPlanId: "",
  monthlyItemType: "",
  monthlyItemId: "",
  versionType: "",
  versionId: "",
  notes: "",
};
const initialCalendar = {
  productLineTeamId: "",
  year: new Date().getFullYear(),
  status: "DRAFT",
  standardHours: 8,
  days: [] as Array<{ date: string; type: string; standardHours: number | ""; label: string; notes: string }>,
};

const controlClass = "min-h-10 rounded-lg border border-border bg-input px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

function shortDate(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function dateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function taskNo(task: TaskItem) {
  return `TASK-${String(task.sequenceNo).padStart(4, "0")}`;
}

function getDisplayRange(tasks: TaskItem[]) {
  const dates = tasks
    .flatMap((task) => [task.planStartDate, task.planEndDate, task.actualStartAt, task.actualFinishAt])
    .filter(Boolean)
    .map((value) => new Date(value as string));
  const base = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const end = new Date(year, month + 1, 0);
  return Array.from({ length: end.getDate() }, (_, index) => new Date(year, month, index + 1));
}

function buildWbsRows(tasks: TaskItem[], collapsedIds: Set<string>) {
  const byParent = new Map<string, TaskItem[]>();
  tasks.forEach((task) => byParent.set(task.parentId || "root", [...(byParent.get(task.parentId || "root") || []), task]));
  const rows: TimelineRow[] = [];
  const walk = (parentId: string) =>
    (byParent.get(parentId) || []).forEach((task) => {
      rows.push({
        id: task.id,
        kind: "task",
        label: task.title,
        subtitle: `计划：${task.plannedWorkdays}天 ｜ 实际：${task.actualStartAt ? `${task.actualWorkdays ?? 0}天` : "未开始"} ｜ 执行人：${task.executor?.name || "未分配"}`,
        task,
        depth: task.level - 1,
      });
      if (!collapsedIds.has(task.id)) {
        walk(task.id);
      }
    });
  walk("root");
  return rows;
}

function checkOverallocation(items: TaskItem[], days: Date[]): boolean {
  const activeTasks = items.filter(task => {
    if (!task.planStartDate || !task.planEndDate) return false;
    if (task.status === "CANCELLED" || task.status === "DONE") return false;
    return true;
  });

  if (activeTasks.length < 2) return false;

  const taskRanges = activeTasks.map(task => {
    const [sy, sm, sd] = task.planStartDate!.slice(0, 10).split("-").map(Number);
    const [ey, em, ed] = task.planEndDate!.slice(0, 10).split("-").map(Number);
    return {
      start: new Date(sy, sm - 1, sd).getTime(),
      end: new Date(ey, em - 1, ed).getTime()
    };
  });

  for (const day of days) {
    const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    let count = 0;
    for (const range of taskRanges) {
      if (dayTime >= range.start && dayTime <= range.end) {
        count++;
        if (count >= 2) return true;
      }
    }
  }
  return false;
}

function buildGroupedRows(tasks: TaskItem[], mode: Exclude<ViewMode, "wbs">, positionMap: Map<string, string>, collapsedIds: Set<string>, context: Context, days: Date[]) {
  const leaves = tasks.filter((task) => task.children.length === 0);

  // 按执行人分组任务
  const tasksByExecutor = new Map<string, TaskItem[]>();
  const unassigned: TaskItem[] = [];
  leaves.forEach((task) => {
    if (task.executorId) {
      const existing = tasksByExecutor.get(task.executorId);
      if (existing) existing.push(task);
      else tasksByExecutor.set(task.executorId, [task]);
    } else {
      unassigned.push(task);
    }
  });

  // 构建 userId -> teamName 映射，用于按小组排序
  const userTeamMap = new Map<string, string>();
  // 同时构建 userId -> 小组内角色映射，用于按岗位排序
  const userRoleMap = new Map<string, string>();
  context.teams.forEach((team) => {
    team.members.forEach((m) => {
      // 如果一个人在多个小组，取第一个（按小组名排序后的）
      if (!userTeamMap.has(m.userId)) {
        userTeamMap.set(m.userId, team.name);
      }
      if (!userRoleMap.has(m.userId)) {
        userRoleMap.set(m.userId, m.role);
      }
    });
  });

  // 岗位排序权重：组长 > 产品经理 > 前端 > 后端 > 测试
  const roleOrder: Record<string, number> = { LEADER: 0, PM: 1, FRONTEND: 2, BACKEND: 3, TESTER: 4 };

  // 获取所有活跃用户（排除部门经理），按小组名排序，同组内按岗位排序
  const allUsers = context.users
    .filter((u) => u.level !== "部门经理")
    .sort((a, b) => {
      const teamA = userTeamMap.get(a.id) || "zzz_无小组";
      const teamB = userTeamMap.get(b.id) || "zzz_无小组";
      if (teamA !== teamB) return teamA.localeCompare(teamB, "zh-CN");
      const roleA = roleOrder[userRoleMap.get(a.id) || ""] ?? 99;
      const roleB = roleOrder[userRoleMap.get(b.id) || ""] ?? 99;
      if (roleA !== roleB) return roleA - roleB;
      return a.name.localeCompare(b.name, "zh-CN");
    });

  const rows: TimelineRow[] = [];

  // 先为每个用户生成 group 行和任务行
  allUsers.forEach((user) => {
    const items = tasksByExecutor.get(user.id) || [];
    const teamName = userTeamMap.get(user.id);
    const roleLabel = positionMap.get(user.id) || user.position || null;
    const subtitleParts: string[] = [];
    if (teamName) subtitleParts.push(teamName);
    if (roleLabel) subtitleParts.push(roleLabel);
    const groupId = `${mode}-${user.name}`;
    const isCollapsed = collapsedIds.has(groupId);

    const validDates = items.flatMap((task) => [task.planStartDate, task.planEndDate]).filter(Boolean);
    const planStartDate = validDates.length ? new Date(Math.min(...validDates.map(d => new Date(d as string).getTime()))).toISOString().slice(0, 10) : null;
    const planEndDate = validDates.length ? new Date(Math.max(...validDates.map(d => new Date(d as string).getTime()))).toISOString().slice(0, 10) : null;
    const progressPercent = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.progressPercent, 0) / items.length)
      : 0;

    const isOverallocated = checkOverallocation(items, days);

    rows.push({
      id: groupId,
      kind: "group" as const,
      label: user.name,
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : (items.length === 0 ? "暂无任务" : undefined),
      planStartDate,
      planEndDate,
      progressPercent,
      isOverallocated,
    });

    if (!isCollapsed) {
      items.forEach((task) => {
        rows.push({
          id: task.id,
          kind: "task" as const,
          label: task.title,
          subtitle: `计划：${task.plannedWorkdays}天 ｜ 实际：${task.actualStartAt ? `${task.actualWorkdays ?? 0}天` : "未开始"}`,
          task,
          depth: 0,
        });
      });
    }
  });

  // 最后追加未分配任务组
  if (unassigned.length > 0) {
    const groupId = `${mode}-未分配任务`;
    const isCollapsed = collapsedIds.has(groupId);
    const validDates = unassigned.flatMap((task) => [task.planStartDate, task.planEndDate]).filter(Boolean);
    const planStartDate = validDates.length ? new Date(Math.min(...validDates.map(d => new Date(d as string).getTime()))).toISOString().slice(0, 10) : null;
    const planEndDate = validDates.length ? new Date(Math.max(...validDates.map(d => new Date(d as string).getTime()))).toISOString().slice(0, 10) : null;
    const progressPercent = Math.round(unassigned.reduce((sum, item) => sum + item.progressPercent, 0) / unassigned.length);

    rows.push({
      id: groupId,
      kind: "group" as const,
      label: "未分配任务",
      subtitle: `${unassigned.length} 个任务未分配执行人`,
      planStartDate,
      planEndDate,
      progressPercent,
    });

    if (!isCollapsed) {
      unassigned.forEach((task) => {
        rows.push({
          id: task.id,
          kind: "task" as const,
          label: task.title,
          subtitle: `计划：${task.plannedWorkdays}天 ｜ 实际：${task.actualStartAt ? `${task.actualWorkdays ?? 0}天` : "未开始"}`,
          task,
          depth: 0,
        });
      });
    }
  }

  return rows;
}

function barGeometry(task: TaskItem, days: Date[]) {
  if (!task.planStartDate || !task.planEndDate) return null;
  const start = new Date(task.planStartDate);
  const end = new Date(task.planEndDate);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  if (end < rangeStart || start > rangeEnd) return null;
  const visibleStart = start < rangeStart ? rangeStart : start;
  const visibleEnd = end > rangeEnd ? rangeEnd : end;
  const startIdx = Math.max(0, Math.floor((visibleStart.getTime() - rangeStart.getTime()) / 86400000));
  const spanDays = Math.floor((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1;
  const left = (startIdx / days.length) * 100;
  const width = (spanDays / days.length) * 100;
  return { left, width };
}



function TimelineBoard({
  rows,
  days,
  mode,
  onCreateChild,
  onEdit,
  onRemove,
  getDayInfo,
  collapsedIds,
  toggleCollapse,
  taskIdToL1Title,
}: {
  rows: TimelineRow[];
  days: Date[];
  mode: ViewMode;
  onCreateChild: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onRemove: (id: string) => void;
  getDayInfo: (date: Date) => { type: string; isWorkday: boolean; isRest: boolean; label: string | null };
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  taskIdToL1Title?: Map<string, string>;
}) {
  const leftWidth = 480;
  const [hoveredBar, setHoveredBar] = useState<{
    task: TaskItem;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);

  return (
    <div 
      className="overflow-x-auto overflow-y-scroll rounded-xl border border-border bg-card shadow-xl shadow-black/10"
      onScroll={() => setHoveredBar(null)}
    >
      <div className="w-full min-w-[1000px]">
        <div className="sticky top-0 z-20 grid border-b border-border bg-card" style={{ gridTemplateColumns: `${leftWidth}px 1fr` }}>
          <div className="flex items-center justify-between border-r border-border px-4 py-3">
            <div className="text-sm font-semibold text-muted-foreground">
              {mode === "wbs" ? "核心任务及 WBS 分解阶层" : "个人甘特"}
            </div>
            <span className="rounded border border-border bg-input px-2 py-1 text-xs text-muted-foreground">
              {days[0].getFullYear()}年{(days[0].getMonth() + 1).toString().padStart(2, "0")}月
            </span>
          </div>
          <div className="flex bg-white/[0.025] flex-1">
            {days.map((day, index) => {
              const dayInfo = getDayInfo(day);
              const isWeekend = dayInfo.type === "REGULAR_WEEKEND";
              const isHoliday = dayInfo.type === "LEGAL_HOLIDAY" || dayInfo.type === "SPECIAL_REST_DAY";
              const isAdjustedWork = dayInfo.type === "ADJUSTED_WORKDAY" || dayInfo.type === "SPECIAL_WORKDAY";
              
              let bgClass = "text-card-foreground";
              let labelChar = "";
              if (isHoliday) {
                bgClass = "bg-rose-500/25 text-rose-200 border-r border-rose-500/10";
                labelChar = "休";
              } else if (isWeekend) {
                bgClass = "bg-sky-500/20 text-sky-200 border-r border-sky-500/10";
                labelChar = "末";
              } else if (isAdjustedWork) {
                bgClass = "bg-amber-500/25 text-amber-200 border-r border-amber-500/10";
                labelChar = "班";
              }

              return (
                <div key={day.toISOString()} className={`flex-1 min-w-[24px] border-r border-border py-1 text-center text-[10px] relative ${bgClass}`}>
                  <div className="text-[9px] text-muted-foreground">{index % 7 === 0 ? `W${Math.floor(index / 7) + 1}` : ""}</div>
                  <div className="font-semibold relative z-10" title={dayInfo.label || undefined}>
                    {day.getDate()}
                    {labelChar && (
                      <span className={`absolute -right-1 -top-1.5 text-[7px] font-extrabold scale-75 opacity-90 px-0.5 rounded-sm ${
                        isHoliday ? "text-rose-400 bg-rose-500/10" : isAdjustedWork ? "text-amber-400 bg-amber-500/10" : "text-sky-400 bg-sky-500/10"
                      }`}>{labelChar}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {rows.length === 0 && <div className="px-4 py-16 text-center text-sm text-muted-foreground">暂无任务</div>}
        {rows.map((row) => {
          if (row.kind === "group") {
            const isCollapsed = collapsedIds.has(row.id);
            const groupBar = (row.planStartDate && row.planEndDate) 
              ? barGeometry({ planStartDate: row.planStartDate, planEndDate: row.planEndDate } as TaskItem, days)
              : null;
            return (
              <div 
                key={row.id} 
                className="grid border-b border-border bg-white/[0.025] cursor-pointer hover:bg-white/[0.05]" 
                style={{ gridTemplateColumns: `${leftWidth}px 1fr` }}
                onClick={() => toggleCollapse(row.id)}
              >
                <div className="flex items-center gap-2 border-r border-border px-4 py-3 text-sm font-semibold select-none">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  {row.isOverallocated ? (
                    <UserRound className="h-4 w-4 text-yellow-500 shrink-0 animate-pulse" />
                  ) : (
                    <UserRound className="h-4 w-4 text-indigo-400 shrink-0" />
                  )}
                  <span className={row.isOverallocated ? "text-red-500 font-bold" : "text-white"}>{row.label}</span>

                  {row.subtitle && <span className="text-xs font-normal text-muted-foreground">({row.subtitle})</span>}
                </div>
                <div className="relative h-[44px]">
                  <div className="absolute inset-0 flex">
                    {days.map((day) => {
                      const dayInfo = getDayInfo(day);
                      const isWeekend = dayInfo.type === "REGULAR_WEEKEND";
                      const isHoliday = dayInfo.type === "LEGAL_HOLIDAY" || dayInfo.type === "SPECIAL_REST_DAY";
                      const isAdjustedWork = dayInfo.type === "ADJUSTED_WORKDAY" || dayInfo.type === "SPECIAL_WORKDAY";
                      
                      let bgClass = "";
                      if (isHoliday) {
                        bgClass = "bg-rose-500/10 border-r border-rose-500/5";
                      } else if (isWeekend) {
                        bgClass = "bg-sky-500/5 border-r border-sky-500/5";
                      } else if (isAdjustedWork) {
                        bgClass = "bg-amber-500/10 border-r border-amber-500/5";
                      }
                      
                      return (
                        <div key={day.toISOString()} className={`flex-1 min-w-[24px] border-r border-border/70 ${bgClass}`} />
                      );
                    })}
                  </div>
                  {groupBar && (
                    <div 
                      className="absolute top-2 h-6 rounded border px-2 py-0.5 shadow-sm bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                      style={{ left: `calc(${groupBar.left}% + 2px)`, width: `calc(${groupBar.width}% - 4px)` }}
                    >
                      <div className="truncate text-[10px] font-bold flex items-center justify-between">
                        <span>排期汇总：{row.progressPercent}%</span>
                      </div>
                      <div className="h-0.5 rounded-full bg-black/20 mt-0.5">
                        <div className="h-0.5 rounded-full bg-indigo-400" style={{ width: `${row.progressPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          const task = row.task!;
          const bar = barGeometry(task, days);
          const isParent = task.children.length > 0;
          const barColor = mode === "person" ? "bg-blue-500/15 border-blue-500/30 text-blue-200" : isParent ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-200" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200";
          return (
            <div key={`${row.id}-${mode}`} className="group grid min-h-[62px] border-b border-border relative hover:z-30" style={{ gridTemplateColumns: `${leftWidth}px 1fr` }}>
              <div className="flex items-start gap-2 border-r border-border px-4 py-3" style={{ paddingLeft: 16 + (mode === "wbs" ? (row.depth || 0) * 18 : 0) }}>
                {mode === "wbs" && (
                  task.children.length > 0 ? (
                    <button
                      onClick={() => toggleCollapse(task.id)}
                      className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-white shrink-0"
                    >
                      {collapsedIds.has(task.id) ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <div className="h-5 w-5 shrink-0" />
                  )
                )}
                <Layers3 className={`mt-1 h-4 w-4 shrink-0 ${isParent ? "text-indigo-400" : "text-emerald-400"}`} />
                <div className="min-w-0 flex-1">
                  {mode === "person" && task.level > 1 && taskIdToL1Title?.get(task.id) && (
                    <div className="text-[10px] font-medium text-indigo-400/90 mb-0.5">
                      一级任务：{taskIdToL1Title.get(task.id)}
                    </div>
                  )}
                  <div className="truncate text-sm font-semibold text-white">{task.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.subtitle}</div>
                  {(task.monthlyItemType || task.versionType) && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Folder className="h-3 w-3 text-amber-400" />
                        {task.monthlyItemType ? "已关联月度事项" : "已关联版本"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden shrink-0 gap-1 group-hover:flex">
                  <button title="新增子任务" onClick={() => onCreateChild(task.id)} disabled={task.level >= 3} className="rounded p-1.5 text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                  <button title="编辑" onClick={() => onEdit(task)} className="rounded p-1.5 text-sky-300 hover:bg-sky-500/10"><Edit3 className="h-4 w-4" /></button>
                  <button title="删除/取消" onClick={() => onRemove(task.id)} className="rounded p-1.5 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex">
                  {days.map((day) => {
                    const dayInfo = getDayInfo(day);
                    const isWeekend = dayInfo.type === "REGULAR_WEEKEND";
                    const isHoliday = dayInfo.type === "LEGAL_HOLIDAY" || dayInfo.type === "SPECIAL_REST_DAY";
                    const isAdjustedWork = dayInfo.type === "ADJUSTED_WORKDAY" || dayInfo.type === "SPECIAL_WORKDAY";
                    
                    let bgClass = "";
                    if (isHoliday) {
                      bgClass = "bg-rose-500/20 border-r border-rose-500/10";
                    } else if (isWeekend) {
                      bgClass = "bg-sky-500/15 border-r border-sky-500/10";
                    } else if (isAdjustedWork) {
                      bgClass = "bg-amber-500/15 border-r border-amber-500/10";
                    }
                    
                    return (
                      <div key={day.toISOString()} className={`flex-1 min-w-[24px] border-r border-border/70 ${bgClass}`} />
                    );
                  })}
                </div>
                {bar && (
                  <div 
                    className={`group/bar absolute top-4 h-8 rounded-lg border px-2 py-1 shadow-sm cursor-pointer hover:shadow-md ${barColor}`} 
                    style={{ left: `calc(${bar.left}% + 2px)`, width: `calc(${bar.width}% - 4px)` }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredBar({
                        task,
                        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                      });
                    }}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="truncate text-[11px] font-semibold">{task.progressPercent}% - {task.title}</div>
                    <div className="mt-1 h-1 rounded-full bg-black/20">
                      <div className="h-1 rounded-full bg-current" style={{ width: `${task.progressPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredBar && (() => {
        const { task, rect } = hoveredBar;
        const popDown = rect.top < 220;
        
        const barCenter = rect.left + rect.width / 2;
        let left = barCenter - 144;
        let arrowLeft = 140; // 144 - 4px half-width of arrow
        
        // Align with bar left if tooltip left goes past the bar left
        if (left < rect.left) {
          left = rect.left;
          arrowLeft = Math.min(rect.width / 2 - 4, 140);
          if (arrowLeft < 12) arrowLeft = 12;
        }
        
        // Align with bar right if tooltip right goes past the bar right
        if (left + 288 > rect.left + rect.width) {
          left = rect.left + rect.width - 288;
          arrowLeft = 288 - Math.min(rect.width / 2 + 4, 140);
          if (arrowLeft > 264) arrowLeft = 264;
        }
        
        // Safe check viewport boundary
        if (left < 16) {
          left = 16;
          arrowLeft = barCenter - left - 4;
        } else if (left + 288 > window.innerWidth - 16) {
          left = window.innerWidth - 288 - 16;
          arrowLeft = barCenter - left - 4;
        }
        
        if (arrowLeft < 12) arrowLeft = 12;
        if (arrowLeft > 264) arrowLeft = 264;
        
        const top = popDown 
          ? rect.top + rect.height + 8 
          : rect.top - 160 - 8; // Estimate tooltip height is ~160px
        
        return (
          <div 
            className="pointer-events-none fixed z-50 w-72 rounded-lg border border-slate-800 bg-[#0f172a]/95 p-3.5 shadow-2xl backdrop-blur-md text-white text-left"
            style={{
              left,
              top,
            }}
          >
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2 break-words whitespace-normal leading-relaxed text-left">
              {task.title}
            </div>
            <div className="space-y-1.5 text-[11px] text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">负责人</span>
                <span className="font-medium text-slate-200">{task.executor?.name || "未分配"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">计划起止</span>
                <span className="font-medium text-slate-200">{shortDate(task.planStartDate)} 至 {shortDate(task.planEndDate)}</span>
              </div>
              {task.actualStartAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">实际起止</span>
                  <span className="font-medium text-slate-200">
                    {shortDate(task.actualStartAt)} 至 {task.actualFinishAt ? shortDate(task.actualFinishAt) : "进行中"}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">当前进度</span>
                <span className="font-semibold text-indigo-400">{task.progressPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">当前状态</span>
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${
                  task.status === "DONE" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                  task.status === "IN_PROGRESS" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                  task.status === "PAUSED" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                  task.status === "CANCELLED" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  "bg-slate-500/10 border-slate-500/30 text-slate-400"
                }`}>
                  {statusLabels[task.status] || task.status}
                </span>
              </div>
            </div>
            
            {/* 气泡小箭头 */}
            <div 
              className="absolute h-2 w-2 rotate-45 border-slate-800 bg-[#0f172a]/95"
              style={{
                left: arrowLeft,
                ...(popDown 
                  ? { bottom: "100%", borderTopWidth: 1, borderLeftWidth: 1, transform: "translateY(4px) rotate(45deg)" } 
                  : { top: "100%", borderBottomWidth: 1, borderRightWidth: 1, transform: "translateY(-4px) rotate(45deg)" }
                )
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}

export default function ManagedTaskManager({ tasks, calendars, context }: { tasks: TaskItem[]; calendars: CalendarItem[]; context: Context }) {
  const [view, setView] = useState<ViewMode>("wbs");
  const [query, setQuery] = useState("");
  const [filterYM, setFilterYM] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search");
      if (search) {
        setQuery(search);
        setFilterYM(""); // 清除月份筛选，显示搜索到的任务
      }
    }
  }, []);
  const [teamFilter, setTeamFilter] = useState("");
  const [executorFilter, setExecutorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [filterYear, filterMonth] = useMemo(() => {
    if (!filterYM) return [null, null];
    const [y, m] = filterYM.split("-").map(Number);
    return [y, m];
  }, [filterYM]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      if (task.children && task.children.length > 0) {
        set.add(task.id);
      }
    });
    return set;
  });
  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    // 第一轮：按条件直接匹配的任务
    const directMatchIds = new Set<string>();
    tasks.forEach((task) => {
      const text = `${task.title} ${taskNo(task)} ${task.executor?.name || ""} ${task.productLineTeam.name}`.toLowerCase();

      let matchesDate = true;
      if (filterYear && filterMonth) {
        const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
        const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
        if (task.planStartDate && task.planEndDate) {
          const start = new Date(task.planStartDate);
          const end = new Date(task.planEndDate);
          matchesDate = start <= endOfMonth && end >= startOfMonth;
        } else {
          matchesDate = false;
        }
      }

      if (matchesDate && (!query || text.includes(query.toLowerCase())) && (!teamFilter || task.productLineTeam.id === teamFilter) && (!executorFilter || task.executorId === executorFilter) && (!statusFilter || task.status === statusFilter)) {
        directMatchIds.add(task.id);
      }
    });

    // 非 WBS 模式直接返回匹配结果
    if (view !== "wbs") {
      return tasks.filter((t) => directMatchIds.has(t.id));
    }

    // WBS 模式：保证树结构完整性
    // 向上补全祖先，向下补全后代
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const includedIds = new Set(directMatchIds);

    // 向上：把每个匹配任务的所有祖先加进来
    directMatchIds.forEach((id) => {
      let current = taskMap.get(id);
      while (current?.parentId) {
        if (includedIds.has(current.parentId)) break; // 已经在集合中，上层链路也已加过
        includedIds.add(current.parentId);
        current = taskMap.get(current.parentId);
      }
    });

    // 向下：把每个匹配任务的所有后代加进来
    const addDescendants = (parentId: string) => {
      tasks.forEach((t) => {
        if (t.parentId === parentId && !includedIds.has(t.id)) {
          includedIds.add(t.id);
          addDescendants(t.id);
        }
      });
    };
    directMatchIds.forEach((id) => addDescendants(id));

    return tasks.filter((t) => includedIds.has(t.id));
  }, [tasks, query, teamFilter, executorFilter, statusFilter, filterYear, filterMonth, view]);

  useEffect(() => {
    if (view === "person") {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        // 为所有非部门经理用户初始化折叠状态
        context.users
          .filter((u) => u.level !== "部门经理")
          .forEach((u) => next.add(`person-${u.name}`));
        // 未分配任务组也折叠
        next.add("person-未分配任务");
        return next;
      });
    }
  }, [view, context.users]);
  const positionMap = useMemo(() => {
    const map = new Map<string, string>();
    context.users.forEach((u) => {
      if (u.position) {
        map.set(u.id, u.position);
      }
    });
    return map;
  }, [context.users]);
  const taskIdToL1Title = useMemo(() => {
    const map = new Map<string, string>();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    tasks.forEach((t) => {
      let current = t;
      while (current.parentId && current.level > 1) {
        const parent = taskMap.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      if (current.level === 1) {
        map.set(t.id, current.title);
      }
    });
    return map;
  }, [tasks]);
  const days = useMemo(() => {
    if (filterYear && filterMonth) {
      const year = Number(filterYear);
      const month = Number(filterMonth) - 1;
      const end = new Date(year, month + 1, 0);
      return Array.from({ length: end.getDate() }, (_, index) => new Date(year, month, index + 1));
    }
    return getDisplayRange(filteredTasks.length ? filteredTasks : tasks);
  }, [filteredTasks, tasks, filterYear, filterMonth]);
  const rows = useMemo(() => (view === "wbs" ? buildWbsRows(filteredTasks, collapsedIds) : buildGroupedRows(filteredTasks, view, positionMap, collapsedIds, context, days)), [filteredTasks, view, collapsedIds, positionMap, context, days]);
  const parentOptions = tasks.filter((task) => task.level < 3);
  const selectedParent = tasks.find((task) => task.id === form.parentId);
  const versionOptions = form.versionType === "PRODUCT" ? context.versions.products : form.versionType === "PROJECT" ? context.versions.projects : [];
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) : null;
  const hasChildren = editingTask ? editingTask.children.length > 0 : false;
  const warnings = tasks.flatMap((task) => {
    const list: string[] = [];
    if (task.children.length === 0 && !task.executorId) list.push(`${task.title}：未分配执行人`);
    if (!task.planStartDate || !task.planEndDate) list.push(`${task.title}：排期不完整`);
    return list;
  });

  const openCreate = (parentId = "") => {
    setEditingId(null);
    setForm({ ...initialForm, parentId });
    setError("");
    setModalOpen(true);
  };
  const openEdit = (task: TaskItem) => {
    setEditingId(task.id);
    setForm({
      parentId: task.parentId || "",
      title: task.title,
      description: task.description || "",
      category: task.category || "DEVELOPMENT",
      sdlcNode: task.sdlcNode || "",
      status: task.status,
      planStartDate: task.planStartDate ? shortDate(task.planStartDate) : "",
      planEndDate: task.planEndDate ? shortDate(task.planEndDate) : "",
      plannedWorkdays: task.plannedWorkdays,
      actualWorkdays: task.actualWorkdays,
      progressPercent: task.progressPercent,
      actualStartAt: dateTimeLocal(task.actualStartAt),
      actualFinishAt: dateTimeLocal(task.actualFinishAt),
      executorId: task.executorId || "",
      monthlyPlanId: task.monthlyPlanId || "",
      monthlyItemType: task.monthlyItemType || "",
      monthlyItemId: task.monthlyItemId || "",
      versionType: task.versionType || "",
      versionId: task.productVersionId || task.projectVersionId || "",
      notes: task.notes || "",
    });
    setError("");
    setModalOpen(true);
  };
  const submit = () =>
    startTransition(async () => {
      setError("");
      const payload = { ...form, sdlcNode: form.sdlcNode || null, category: form.category || null, executorId: form.executorId || null, monthlyPlanId: form.monthlyPlanId || null, monthlyItemType: form.monthlyItemType || null, monthlyItemId: form.monthlyItemId || null, versionType: form.versionType || null, versionId: form.versionId || null };
      const result = editingId ? await updateManagedTask(editingId, payload as never) : await createManagedTask(payload as never);
      if (!result.success) return setError(result.error || "保存失败");
      setModalOpen(false);
    });
  const remove = (id: string) => {
    if (!confirm("无执行数据的任务会删除；已有执行数据的任务会改为已取消。确认继续？")) return;
    startTransition(async () => {
      const result = await deleteOrCancelManagedTask(id);
      if (!result.success) alert(result.error);
    });
  };

  const calendarForYear = useMemo(() => {
    if (!days.length) return null;
    const year = days[0].getFullYear();
    return calendars.find((c) => c.year === year);
  }, [calendars, days]);

  const dayTypesMap = useMemo(() => {
    const map = new Map<string, { type: string; label: string | null }>();
    if (calendarForYear) {
      calendarForYear.days.forEach((day) => {
        const key = day.date.slice(0, 10);
        map.set(key, { type: day.type, label: day.label });
      });
    }
    return map;
  }, [calendarForYear]);

  const getDayInfo = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const override = dayTypesMap.get(key);
    if (override) {
      return {
        type: override.type,
        isWorkday: override.type === "ADJUSTED_WORKDAY" || override.type === "SPECIAL_WORKDAY" || override.type === "REGULAR_WORKDAY",
        isRest: override.type === "LEGAL_HOLIDAY" || override.type === "SPECIAL_REST_DAY" || override.type === "REGULAR_WEEKEND",
        label: override.label,
      };
    }
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    return {
      type: isWeekend ? "REGULAR_WEEKEND" : "REGULAR_WORKDAY",
      isWorkday: !isWeekend,
      isRest: isWeekend,
      label: null,
    };
  };

  const calculateWorkdaysFrontend = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr.includes("T") ? startStr.slice(0, 10) : startStr);
    const end = new Date(endStr.includes("T") ? endStr.slice(0, 10) : endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
    
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayInfo = getDayInfo(current);
      if (dayInfo.isWorkday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  useEffect(() => {
    const planned = calculateWorkdaysFrontend(form.planStartDate, form.planEndDate);
    
    let actual = 0;
    if (form.actualStartAt) {
      const endStr = form.actualFinishAt ? (form.actualFinishAt.includes("T") ? form.actualFinishAt.slice(0, 10) : form.actualFinishAt) : new Date().toISOString().slice(0, 10);
      actual = calculateWorkdaysFrontend(form.actualStartAt, endStr);
    }
    
    if (planned !== form.plannedWorkdays || actual !== form.actualWorkdays) {
      setForm((current) => ({
        ...current,
        plannedWorkdays: planned,
        actualWorkdays: actual,
      }));
    }
  }, [form.planStartDate, form.planEndDate, form.actualStartAt, form.actualFinishAt, dayTypesMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm sm:grid-cols-2">
          {[
            { key: "wbs", label: "WBS 任务视图", icon: Layers3 },
            { key: "person", label: "个人甘特", icon: CalendarDays },
          ].map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button key={item.key} onClick={() => setView(item.key as ViewMode)} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${active ? "bg-accent text-white ring-1 ring-border" : "text-muted-foreground hover:bg-accent hover:text-white"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务名称/成果书..." className="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500" />
          </label>
          <div className="relative">
            <input
              type="month"
              value={filterYM}
              onChange={(event) => setFilterYM(event.target.value)}
              className={`${controlClass} text-white cursor-pointer pr-8`}
              style={{ colorScheme: "dark" }}
            />
            {filterYM && (
              <button
                onClick={() => setFilterYM("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-white hover:bg-accent transition"
                title="清除月份筛选，显示全部任务"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className={controlClass}><option value="">所有团队</option>{context.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
          <select value={executorFilter} onChange={(event) => setExecutorFilter(event.target.value)} className={controlClass}><option value="">所有经办人</option>{context.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={controlClass}><option value="">所有状态</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          <button onClick={() => openCreate()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"><Plus className="h-4 w-4" />创建任务</button>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-card px-5 py-4 text-sm text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 font-semibold text-white"><Info className="h-5 w-5 text-indigo-400" />Waterfall SDLC 瀑布周期里程碑及单据规范：</div>
          <div className="text-muted-foreground">任务可按树级拆分，每个开发阶段推荐关联标准产出单据记录，例如需求说明书、WBS 拆解表、详细设计文档、发版记录等。</div>
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground"><span>图例:</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-sky-500/20 ring-1 ring-sky-500/40" />周末（双休）</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-rose-500/25 ring-1 ring-rose-500/40" />法定节假日</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-500/25 ring-1 ring-amber-500/40" />调休上班</span></div>
        </div>
      </div>

      {warnings.length > 0 && <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{warnings.slice(0, 4).join("；")}{warnings.length > 4 ? `；另有 ${warnings.length - 4} 项提醒` : ""}</div>}

      <TimelineBoard rows={rows} days={days} mode={view} onCreateChild={openCreate} onEdit={openEdit} onRemove={remove} getDayInfo={getDayInfo} collapsedIds={collapsedIds} toggleCollapse={toggleCollapse} taskIdToL1Title={taskIdToL1Title} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-white">{editingId ? "编辑任务" : "新建任务"}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">{error}</div>}
            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <label className="space-y-1 text-xs text-muted-foreground">上级任务<select value={form.parentId} disabled={Boolean(editingId)} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))} className={`${controlClass} w-full`}><option value="">一级任务</option>{parentOptions.map((task) => <option key={task.id} value={task.id}>L{task.level} / {task.title}</option>)}</select></label>
              {!selectedParent && <label className="space-y-1 text-xs text-muted-foreground">一级任务分类<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={`${controlClass} w-full`}><option value="DEVELOPMENT">研发任务</option><option value="OTHER">其他</option></select></label>}
              {selectedParent?.category === "DEVELOPMENT" && selectedParent.level === 1 && <label className="space-y-1 text-xs text-muted-foreground">SDLC 节点<select value={form.sdlcNode} onChange={(event) => setForm((current) => ({ ...current, sdlcNode: event.target.value }))} className={`${controlClass} w-full`}><option value="">不选择</option>{sdlcNodes.map((node) => <option key={node} value={node}>{sdlcLabels[node]}</option>)}</select></label>}
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">任务名称<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={`${controlClass} w-full`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">任务说明<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className={`${controlClass} w-full`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">计划开始<input type="date" value={form.planStartDate} onChange={(event) => setForm((current) => ({ ...current, planStartDate: event.target.value }))} className={`${controlClass} w-full`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">计划结束<input type="date" value={form.planEndDate} onChange={(event) => setForm((current) => ({ ...current, planEndDate: event.target.value }))} className={`${controlClass} w-full`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">计划人日（系统自动计算）<input type="number" value={form.plannedWorkdays} readOnly className={`${controlClass} w-full bg-input/50 cursor-not-allowed`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">实际人日（系统自动计算）<input type="number" value={form.actualWorkdays} readOnly className={`${controlClass} w-full bg-input/50 cursor-not-allowed`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">执行人<select value={form.executorId} onChange={(event) => setForm((current) => ({ ...current, executorId: event.target.value, status: event.target.value ? current.status : "UNSCHEDULED", progressPercent: event.target.value ? current.progressPercent : 0 }))} className={`${controlClass} w-full`}><option value="">未分配</option>{context.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              <label className="space-y-1 text-xs text-muted-foreground">状态<select value={form.status} disabled={hasChildren} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={`${controlClass} w-full ${hasChildren ? "bg-input/50 cursor-not-allowed" : ""}`}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
              <label className="space-y-1 text-xs text-muted-foreground">进度<input type="number" min={0} max={100} value={form.progressPercent} readOnly={hasChildren} onChange={(event) => setForm((current) => ({ ...current, progressPercent: Number(event.target.value) }))} className={`${controlClass} w-full ${hasChildren ? "bg-input/50 cursor-not-allowed" : ""}`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">实际开始<input type="datetime-local" value={form.actualStartAt} onChange={(event) => setForm((current) => ({ ...current, actualStartAt: event.target.value }))} className={`${controlClass} w-full`} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">实际完成<input type="datetime-local" value={form.actualFinishAt} onChange={(event) => setForm((current) => ({ ...current, actualFinishAt: event.target.value }))} className={`${controlClass} w-full`} /></label>
              {!selectedParent && <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">关联月度计划事项<select value={`${form.monthlyPlanId}|${form.monthlyItemType}|${form.monthlyItemId}`} onChange={(event) => { const [monthlyPlanId, monthlyItemType, monthlyItemId] = event.target.value.split("|"); setForm((current) => ({ ...current, monthlyPlanId: monthlyPlanId || "", monthlyItemType: monthlyItemType || "", monthlyItemId: monthlyItemId || "" })); }} className={`${controlClass} w-full`}><option value="||">不关联月度计划事项</option>{context.monthlyItems.map((item) => <option key={`${item.itemType}-${item.itemId}`} value={`${item.planId}|${item.itemType}|${item.itemId}`}>{item.label}</option>)}</select></label>}
              {!selectedParent && <><label className="space-y-1 text-xs text-muted-foreground">关联版本类型<select value={form.versionType} onChange={(event) => setForm((current) => ({ ...current, versionType: event.target.value, versionId: "" }))} className={`${controlClass} w-full`}><option value="">不关联</option><option value="PRODUCT">产品版本</option><option value="PROJECT">项目版本</option></select></label><label className="space-y-1 text-xs text-muted-foreground">关联版本<select value={form.versionId} disabled={!form.versionType} onChange={(event) => setForm((current) => ({ ...current, versionId: event.target.value }))} className={`${controlClass} w-full`}><option value="">请选择</option>{versionOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></>}
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">备注<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className={`${controlClass} w-full`} /></label>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4"><div className="min-h-5 flex-1 text-sm text-red-300">{error}</div><div className="flex gap-3"><button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground">取消</button><button onClick={submit} disabled={pending} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white disabled:opacity-50">{pending ? "保存中..." : "保存"}</button></div></div>
          </div>
        </div>
      )}

    </div>
  );
}
