"use client";

import { useState, useTransition, useMemo, memo, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers3,
  CheckCircle2,
  Loader2,
  Folder,
  Tag,
  User,
  Calendar,
  FileText,
  Activity,
  Percent,
} from "lucide-react";
import { createManagedTask, updateManagedTask } from "@/actions/managed-tasks";

export type IdName = { id: string; name: string };
export type VersionOption = { id: string; label: string };
export type MonthlyItem = { teamId?: string; planId: string; itemType: string; itemId: string; label: string };

export type TaskItem = {
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
  isDraft?: boolean;
};

export type Context = {
  users: (IdName & { position?: string | null; level?: string | null })[];
  teams: Array<IdName & { members: Array<{ userId: string; role: string }> }>;
  versions: { products: VersionOption[]; projects: VersionOption[] };
  monthlyItems: MonthlyItem[];
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

const sdlcBadgeColors: Record<string, string> = {
  REQUIREMENT_ANALYSIS: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  SOLUTION_DESIGN: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  DEVELOPMENT: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  INTEGRATION: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  TESTING: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  RELEASE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  ACCEPTANCE: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  OPERATION_OBSERVATION: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  OTHER: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
};

const statusLabels: Record<string, string> = {
  UNSCHEDULED: "待排期",
  TODO: "待办",
  IN_PROGRESS: "进行中",
  PAUSED: "已暂停",
  DONE: "已完成",
  CANCELLED: "已取消",
};

const statusBadgeColors: Record<string, string> = {
  UNSCHEDULED: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
  TODO: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  PAUSED: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

// Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
function formatToDatetimeLocal(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const cellInputClass =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-foreground transition focus:border-indigo-500 focus:bg-input focus:outline-none hover:bg-white/[0.04]";
const cellSelectClass =
  "w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs text-foreground cursor-pointer transition focus:border-indigo-500 focus:bg-input focus:outline-none hover:bg-white/[0.04]";

// 行内 Autocomplete 负责人选择器：小组成员优先、支持打字搜索
const ExecutorAutocomplete = memo(function ExecutorAutocomplete({
  value,
  teamId,
  context,
  onChange,
}: {
  value: string | null;
  teamId: string;
  context: Context;
  onChange: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当前选中的用户名
  const selectedUser = context.users.find((u) => u.id === value);
  const displayName = selectedUser ? selectedUser.name : "";

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // 小组成员 ID 集合
  const teamMemberIds = useMemo(() => {
    const team = context.teams.find((t) => t.id === teamId);
    if (!team) return new Set<string>();
    return new Set(team.members.map((m) => m.userId));
  }, [context.teams, teamId]);

  // 分组 & 搜索过滤后的用户列表
  const { teamUsers, otherUsers } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? context.users.filter((u) => u.name.toLowerCase().includes(q))
      : context.users;
    const team: typeof filtered = [];
    const other: typeof filtered = [];
    filtered.forEach((u) => {
      if (teamMemberIds.has(u.id)) team.push(u);
      else other.push(u);
    });
    return { teamUsers: team, otherUsers: other };
  }, [context.users, teamMemberIds, search]);

  const handleSelect = useCallback((userId: string) => {
    onChange(userId);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        value={open ? search : displayName}
        placeholder="-- 未分配 --"
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => { setOpen(true); setSearch(""); }}
        className={`${cellInputClass} cursor-pointer`}
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-0.5 max-h-52 w-44 overflow-auto rounded-lg border border-border bg-card shadow-xl">
          {/* 清空选项 */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect("")}
            className="w-full px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-indigo-500/10 transition"
          >
            -- 未分配 --
          </button>
          {/* 本小组成员 */}
          {teamUsers.length > 0 && (
            <>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/5 select-none">
                本组成员
              </div>
              {teamUsers.map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(u.id)}
                  className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-indigo-500/10 transition flex items-center gap-1.5 ${
                    u.id === value ? "bg-indigo-500/15 text-indigo-400 font-semibold" : "text-foreground"
                  }`}
                >
                  <span className="text-indigo-400">★</span> {u.name}
                </button>
              ))}
            </>
          )}
          {/* 其他人员 */}
          {otherUsers.length > 0 && (
            <>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground/60 bg-white/[0.02] select-none">
                其他人员
              </div>
              {otherUsers.map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(u.id)}
                  className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-white/[0.06] transition ${
                    u.id === value ? "bg-indigo-500/10 text-indigo-400 font-semibold" : "text-foreground"
                  }`}
                >
                  👤 {u.name}
                </button>
              ))}
            </>
          )}
          {teamUsers.length === 0 && otherUsers.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-muted-foreground/50 text-center">无匹配人员</div>
          )}
        </div>
      )}
    </div>
  );
});

// High-performance memoized single row component
const GridRow = memo(function GridRow({
  task,
  depth,
  hasChildren,
  isCollapsed,
  context,
  onToggleCollapse,
  onCreateSubTask,
  onRemove,
  onFieldChange,
  onSaveDraft,
  onDiscardDraft,
  savingTaskId,
  savedTaskId,
}: {
  task: TaskItem;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  context: Context;
  onToggleCollapse: (id: string) => void;
  onCreateSubTask: (parentTask: TaskItem) => void;
  onRemove: (id: string) => void;
  onFieldChange: (task: TaskItem, fields: Partial<TaskItem>) => void;
  onSaveDraft: (draftTask: TaskItem, title: string) => void;
  onDiscardDraft: (draftTaskId: string) => void;
  savingTaskId: string | null;
  savedTaskId: string | null;
}) {
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descDraft, setDescDraft] = useState(task.description || "");

  // Synchronize drafts when task prop updates from server
  useEffect(() => {
    setTitleDraft(task.title);
  }, [task.title]);

  useEffect(() => {
    setDescDraft(task.description || "");
  }, [task.description]);

  const isSaving = savingTaskId === task.id;
  const isSaved = savedTaskId === task.id;

  // Combined value for monthly items
  const currentMonthlyVal = task.monthlyPlanId
    ? `${task.monthlyPlanId}|${task.monthlyItemType || ""}|${task.monthlyItemId || ""}`
    : "";

  // Combined value for versions
  const currentVersionVal =
    task.versionType === "PRODUCT"
      ? `PRODUCT|${task.productVersionId || ""}`
      : task.versionType === "PROJECT"
      ? `PROJECT|${task.projectVersionId || ""}`
      : "";

  const handleVersionChange = (combinedValue: string) => {
    if (!combinedValue) {
      onFieldChange(task, { versionType: "", productVersionId: "", projectVersionId: "" });
      return;
    }
    const [vType, vId] = combinedValue.split("|");
    if (vType === "PRODUCT") {
      onFieldChange(task, { versionType: "PRODUCT", productVersionId: vId, projectVersionId: "" });
    } else {
      onFieldChange(task, { versionType: "PROJECT", productVersionId: "", projectVersionId: vId });
    }
  };

  const handleMonthlyItemChange = (combinedValue: string) => {
    if (!combinedValue) {
      onFieldChange(task, { monthlyPlanId: "", monthlyItemType: "", monthlyItemId: "" });
      return;
    }
    const [planId, itemType, itemId] = combinedValue.split("|");
    onFieldChange(task, { monthlyPlanId: planId, monthlyItemType: itemType, monthlyItemId: itemId });
  };

  const isLevel1 = task.level === 1;

  // 限定在当前一级任务所属小组范畴内的月度事项
  const teamMonthlyItems = useMemo(() => {
    if (!task.productLineTeam?.id) return context.monthlyItems;
    return context.monthlyItems.filter((item) => {
      if (!item.teamId || item.teamId === task.productLineTeam.id) return true;
      if (task.monthlyPlanId && item.planId === task.monthlyPlanId && item.itemType === task.monthlyItemType && item.itemId === task.monthlyItemId) return true;
      return false;
    });
  }, [context.monthlyItems, task.productLineTeam?.id, task.monthlyPlanId, task.monthlyItemType, task.monthlyItemId]);

  return (
    <div className={`group flex border-b border-border/80 text-xs transition ${task.isDraft ? "bg-indigo-500/10 dark:bg-indigo-500/15" : "hover:bg-white/[0.02]"}`}>
      {/* 1. 操作列 */}
      <div className="w-14 shrink-0 border-r border-border px-1.5 py-2 flex items-center justify-center gap-1 sticky left-0 z-10 bg-card group-hover:bg-card">
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
        ) : isSaved ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <>
            {!task.isDraft && task.level < 3 && (
              <button
                title="增加本地子任务行"
                onClick={() => onCreateSubTask(task)}
                className="rounded p-0.5 text-indigo-400 hover:bg-indigo-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              title={task.isDraft ? "撤销草稿行" : "删除任务"}
              onClick={() => (task.isDraft ? onDiscardDraft(task.id) : onRemove(task.id))}
              className="rounded p-0.5 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* 2. 功能 / 任务名称 (WBS 树缩进 & 折叠) */}
      <div
        className="w-44 shrink-0 border-r border-border px-1.5 py-1 flex items-center gap-0.5"
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggleCollapse(task.id)}
            className="rounded p-0.5 text-slate-400 hover:bg-white/10 shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Layers3
          className={`h-3.5 w-3.5 shrink-0 ${task.isDraft ? "text-amber-400 animate-pulse" : hasChildren ? "text-indigo-400" : "text-emerald-400"}`}
        />
        <input
          autoFocus={task.isDraft}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => {
            if (task.isDraft) {
              if (titleDraft.trim() !== "") {
                onSaveDraft(task, titleDraft.trim());
              } else {
                onDiscardDraft(task.id);
              }
            } else {
              if (titleDraft !== task.title) {
                onFieldChange(task, { title: titleDraft });
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (task.isDraft) {
                if (titleDraft.trim() !== "") {
                  onSaveDraft(task, titleDraft.trim());
                  onCreateSubTask(task);
                } else {
                  onDiscardDraft(task.id);
                }
              } else {
                if (titleDraft !== task.title) {
                  onFieldChange(task, { title: titleDraft });
                }
                if (task.level < 3) {
                  onCreateSubTask(task);
                }
              }
            }
          }}
          className={`${cellInputClass} font-medium ${task.isDraft ? "border-indigo-500/50 bg-indigo-500/10 placeholder:text-muted-foreground/50" : ""}`}
          placeholder={task.isDraft ? "输入任务名称，按 Enter 保存..." : "输入任务名称..."}
        />
      </div>

      {/* 3. SDLC 节点 */}
      <div className="w-24 shrink-0 border-r border-border p-1 flex items-center justify-center">
        <select
          value={task.sdlcNode || ""}
          onChange={(e) => onFieldChange(task, { sdlcNode: e.target.value })}
          className={`${cellSelectClass} text-center ${
            task.sdlcNode ? sdlcBadgeColors[task.sdlcNode] || "" : ""
          }`}
        >
          <option value="">-- 节点 --</option>
          {Object.entries(sdlcLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. 负责人 (Autocomplete + 本组优先) */}
      <div className="w-24 shrink-0 border-r border-border p-1 flex items-center">
        <ExecutorAutocomplete
          value={task.executorId}
          teamId={task.productLineTeam?.id || ""}
          context={context}
          onChange={(userId) => onFieldChange(task, { executorId: userId })}
        />
      </div>

      {/* 5. 功能描述 (验收标准) */}
      <div className="w-36 shrink-0 border-r border-border p-1 flex items-center">
        <input
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={() => {
            if (!task.isDraft && descDraft !== (task.description || "")) {
              onFieldChange(task, { description: descDraft });
            }
          }}
          className={cellInputClass}
          placeholder="验收标准说明..."
        />
      </div>

      {/* 6. 计划开始时间 */}
      <div className="w-32 shrink-0 border-r border-border p-1 flex items-center">
        <input
          type="datetime-local"
          value={formatToDatetimeLocal(task.planStartDate)}
          onChange={(e) => onFieldChange(task, { planStartDate: e.target.value })}
          className={cellInputClass}
        />
      </div>

      {/* 7. 计划完成时间 */}
      <div className="w-32 shrink-0 border-r border-border p-1 flex items-center">
        <input
          type="datetime-local"
          value={formatToDatetimeLocal(task.planEndDate)}
          onChange={(e) => onFieldChange(task, { planEndDate: e.target.value })}
          className={cellInputClass}
        />
      </div>

      {/* 8. 实际开始时间 */}
      <div className="w-32 shrink-0 border-r border-border p-1 flex items-center">
        <input
          type="datetime-local"
          value={formatToDatetimeLocal(task.actualStartAt)}
          onChange={(e) => {
            const val = e.target.value;
            const nextStatus = val && task.status === "UNSCHEDULED" ? "IN_PROGRESS" : task.status;
            onFieldChange(task, { actualStartAt: val, status: nextStatus });
          }}
          className={cellInputClass}
        />
      </div>

      {/* 9. 实际完成时间 */}
      <div className="w-32 shrink-0 border-r border-border p-1 flex items-center">
        <input
          type="datetime-local"
          value={formatToDatetimeLocal(task.actualFinishAt)}
          onChange={(e) => {
            const val = e.target.value;
            const nextStatus = val ? "DONE" : task.status;
            const nextProgress = val ? 100 : task.progressPercent;
            onFieldChange(task, { actualFinishAt: val, status: nextStatus, progressPercent: nextProgress });
          }}
          className={cellInputClass}
        />
      </div>

      {/* 10. 任务状态 (新增列：放在实际完成之后) */}
      <div className="w-24 shrink-0 border-r border-border p-1 flex items-center justify-center">
        {hasChildren ? (
          <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${statusBadgeColors[task.status] || ""}`}>
            {statusLabels[task.status] || task.status}
          </span>
        ) : (
          <select
            value={task.status}
            onChange={(e) => onFieldChange(task, { status: e.target.value })}
            className={`${cellSelectClass} text-center font-medium ${statusBadgeColors[task.status] || ""}`}
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 11. 进度 (%) */}
      <div className="w-20 shrink-0 border-r border-border p-1 flex items-center justify-center">
        {hasChildren ? (
          <span className="text-xs font-semibold text-indigo-400 px-1">{task.progressPercent}</span>
        ) : (
          <input
            type="number"
            min={0}
            max={100}
            value={task.progressPercent}
            onChange={(e) => onFieldChange(task, { progressPercent: Number(e.target.value) })}
            className={`${cellInputClass} text-center font-semibold text-indigo-400`}
          />
        )}
      </div>

      {/* 12. 关联月度事项 (放在新增列之后) */}
      <div className="w-32 shrink-0 border-r border-border p-1 flex items-center">
        {isLevel1 ? (
          <select
            value={currentMonthlyVal}
            onChange={(e) => handleMonthlyItemChange(e.target.value)}
            className={cellSelectClass}
          >
            <option value="">-- 未关联 --</option>
            {teamMonthlyItems.map((item) => (
              <option
                key={`${item.planId}-${item.itemType}-${item.itemId}`}
                value={`${item.planId}|${item.itemType}|${item.itemId}`}
              >
                {item.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-muted-foreground/30 px-2 select-none">-</span>
        )}
      </div>

      {/* 13. 关联版本/项目 (放在新增列之后) */}
      <div className="w-28 shrink-0 border-r border-border p-1 flex items-center">
        {isLevel1 ? (
          <select
            value={currentVersionVal}
            onChange={(e) => handleVersionChange(e.target.value)}
            className={cellSelectClass}
          >
            <option value="">-- 未关联 --</option>
            <optgroup label="产品版本">
              {context.versions.products.map((v) => (
                <option key={`PRODUCT-${v.id}`} value={`PRODUCT|${v.id}`}>
                  📦 {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="项目版本">
              {context.versions.projects.map((v) => (
                <option key={`PROJECT-${v.id}`} value={`PROJECT|${v.id}`}>
                  🚀 {v.label}
                </option>
              ))}
            </optgroup>
          </select>
        ) : (
          <span className="text-[10px] text-muted-foreground/30 px-2 select-none">-</span>
        )}
      </div>
    </div>
  );
});

export default function TaskGridView({
  tasks,
  context,
  onCreateChild,
  onEdit,
  onRemove,
}: {
  tasks: TaskItem[];
  context: Context;
  onCreateChild: (parentId: string) => void;
  onEdit: (task: TaskItem) => void;
  onRemove: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);

  // 本地未持久化的草稿行列表与乐观新建列表
  const [draftTasks, setDraftTasks] = useState<TaskItem[]>([]);
  const [optimisticTasks, setOptimisticTasks] = useState<TaskItem[]>([]);

  // 仅在首次渲染时计算初始一级任务折叠状态，后续不再被服务器 revalidate 刷新强行重置
  const initialCollapsed = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.children && t.children.length > 0) {
        set.add(t.id);
      }
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => initialCollapsed);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 点击增加子任务：在前端生成纯本地草稿行，不发起数据库写操作
  const handleAddDraftSubTask = (parentTask: TaskItem) => {
    // 自动展开父节点
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(parentTask.id);
      return next;
    });

    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const draftTask: TaskItem = {
      id: draftId,
      sequenceNo: 9999,
      title: "",
      description: null,
      level: parentTask.level + 1,
      parentId: parentTask.id,
      category: "DEVELOPMENT",
      sdlcNode: null,
      status: "UNSCHEDULED",
      planStartDate: null,
      planEndDate: null,
      plannedWorkdays: 0,
      actualWorkdays: 0,
      progressPercent: 0,
      actualStartAt: null,
      actualFinishAt: null,
      executorId: null,
      productLineTeam: parentTask.productLineTeam,
      createdBy: parentTask.createdBy,
      executor: null,
      monthlyPlanId: null,
      monthlyItemType: null,
      monthlyItemId: null,
      versionType: null,
      productVersionId: null,
      projectVersionId: null,
      notes: null,
      children: [],
      isDraft: true,
    };

    setDraftTasks((prev) => [...prev, draftTask]);
  };

  // 点击增加一级任务：在前端生成顶级草稿行
  const handleAddDraftRootTask = () => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const draftTask: TaskItem = {
      id: draftId,
      sequenceNo: 9999,
      title: "",
      description: null,
      level: 1,
      parentId: null,
      category: "DEVELOPMENT",
      sdlcNode: null,
      status: "UNSCHEDULED",
      planStartDate: null,
      planEndDate: null,
      plannedWorkdays: 0,
      actualWorkdays: 0,
      progressPercent: 0,
      actualStartAt: null,
      actualFinishAt: null,
      executorId: null,
      productLineTeam: context.teams[0] || { id: "", name: "" },
      createdBy: { id: "", name: "" },
      executor: null,
      monthlyPlanId: null,
      monthlyItemType: null,
      monthlyItemId: null,
      versionType: null,
      productVersionId: null,
      projectVersionId: null,
      notes: null,
      children: [],
      isDraft: true,
    };

    setDraftTasks((prev) => [...prev, draftTask]);
  };

  // 丢弃草稿行
  const handleDiscardDraft = (draftTaskId: string) => {
    setDraftTasks((prev) => prev.filter((t) => t.id !== draftTaskId));
  };

  // 保存草稿行至数据库
  const handleSaveDraft = (draftTask: TaskItem, title: string) => {
    // 先从草稿行列表中移除
    setDraftTasks((prev) => prev.filter((t) => t.id !== draftTask.id));

    setSavingTaskId(draftTask.parentId || draftTask.id);
    startTransition(async () => {
      try {
        const payload = {
          parentId: draftTask.parentId,
          title: title,
          description: draftTask.description || null,
          category: draftTask.category || "DEVELOPMENT",
          sdlcNode: draftTask.sdlcNode || null,
          status: draftTask.status || "UNSCHEDULED",
          planStartDate: draftTask.planStartDate ? draftTask.planStartDate.slice(0, 16) : null,
          planEndDate: draftTask.planEndDate ? draftTask.planEndDate.slice(0, 16) : null,
          plannedWorkdays: 0,
          actualWorkdays: 0,
          progressPercent: 0,
          actualStartAt: draftTask.actualStartAt ? draftTask.actualStartAt.slice(0, 16) : null,
          actualFinishAt: draftTask.actualFinishAt ? draftTask.actualFinishAt.slice(0, 16) : null,
          executorId: draftTask.executorId || null,
          monthlyPlanId: draftTask.monthlyPlanId || null,
          monthlyItemType: draftTask.monthlyItemType || null,
          monthlyItemId: draftTask.monthlyItemId || null,
          versionType: draftTask.versionType || null,
          productVersionId: draftTask.productVersionId || null,
          projectVersionId: draftTask.projectVersionId || null,
          notes: draftTask.notes || null,
        };

        const res = await createManagedTask(payload as any);
        if (res.success && res.data) {
          const newRealTask = res.data as TaskItem;
          setOptimisticTasks((prev) => [...prev.filter((t) => t.id !== newRealTask.id), newRealTask]);
          setSavedTaskId(draftTask.parentId || draftTask.id);
          setTimeout(() => setSavedTaskId(null), 1800);
        } else if (res.error) {
          alert(`保存子任务失败: ${res.error}`);
        }
      } catch (err) {
        console.error("Save draft error:", err);
      } finally {
        setSavingTaskId(null);
      }
    });
  };

  // Build WBS Tree rows with depth (combining DB tasks, optimistic tasks & local draft tasks)
  type WbsGridRow = {
    task: TaskItem;
    depth: number;
    hasChildren: boolean;
  };

  const visibleRows = useMemo(() => {
    const combinedMap = new Map<string, TaskItem>();
    tasks.forEach((t) => combinedMap.set(t.id, t));
    optimisticTasks.forEach((t) => {
      if (!combinedMap.has(t.id)) combinedMap.set(t.id, t);
    });
    draftTasks.forEach((t) => {
      if (!combinedMap.has(t.id)) combinedMap.set(t.id, t);
    });

    const allTasks = Array.from(combinedMap.values());
    const childrenMap = new Map<string, TaskItem[]>();

    allTasks.forEach((task) => {
      const key = (!task.parentId || !combinedMap.has(task.parentId)) ? "root" : task.parentId;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(task);
    });

    // Sort children by sequenceNo
    childrenMap.forEach((list) => list.sort((a, b) => a.sequenceNo - b.sequenceNo));

    const result: WbsGridRow[] = [];

    function traverse(parentId: string, depth: number) {
      const list = childrenMap.get(parentId) || [];
      list.forEach((task) => {
        const children = childrenMap.get(task.id) || [];
        result.push({
          task,
          depth,
          hasChildren: children.length > 0,
        });

        // Traverse children only if not collapsed
        if (!collapsedIds.has(task.id)) {
          traverse(task.id, depth + 1);
        }
      });
    }

    traverse("root", 0);
    return result;
  }, [tasks, draftTasks, collapsedIds]);

  // Execute field update
  const handleFieldChange = (task: TaskItem, fields: Partial<TaskItem>) => {
    if (task.isDraft) return;

    setSavingTaskId(task.id);
    startTransition(async () => {
      try {
        const payload = {
          title: fields.title !== undefined ? fields.title : task.title,
          description: fields.description !== undefined ? fields.description : task.description || "",
          category: fields.category !== undefined ? fields.category : task.category || "DEVELOPMENT",
          sdlcNode: fields.sdlcNode !== undefined ? fields.sdlcNode : task.sdlcNode || "",
          status: fields.status !== undefined ? fields.status : task.status,
          planStartDate: fields.planStartDate !== undefined ? fields.planStartDate : (task.planStartDate ? task.planStartDate.slice(0, 16) : ""),
          planEndDate: fields.planEndDate !== undefined ? fields.planEndDate : (task.planEndDate ? task.planEndDate.slice(0, 16) : ""),
          plannedWorkdays: task.plannedWorkdays,
          actualWorkdays: task.actualWorkdays,
          progressPercent: fields.progressPercent !== undefined ? fields.progressPercent : task.progressPercent,
          actualStartAt: fields.actualStartAt !== undefined ? fields.actualStartAt : (task.actualStartAt ? task.actualStartAt.slice(0, 16) : ""),
          actualFinishAt: fields.actualFinishAt !== undefined ? fields.actualFinishAt : (task.actualFinishAt ? task.actualFinishAt.slice(0, 16) : ""),
          executorId: fields.executorId !== undefined ? fields.executorId : task.executorId || "",
          monthlyPlanId: fields.monthlyPlanId !== undefined ? fields.monthlyPlanId : task.monthlyPlanId || "",
          monthlyItemType: fields.monthlyItemType !== undefined ? fields.monthlyItemType : task.monthlyItemType || "",
          monthlyItemId: fields.monthlyItemId !== undefined ? fields.monthlyItemId : task.monthlyItemId || "",
          versionType: fields.versionType !== undefined ? fields.versionType : task.versionType || "",
          productVersionId: fields.productVersionId !== undefined ? fields.productVersionId : task.productVersionId || "",
          projectVersionId: fields.projectVersionId !== undefined ? fields.projectVersionId : task.projectVersionId || "",
          notes: fields.notes !== undefined ? fields.notes : task.notes || "",
        };

        const res = await updateManagedTask(task.id, payload as any);
        if (res.success) {
          setSavedTaskId(task.id);
          setTimeout(() => setSavedTaskId(null), 1800);
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setSavingTaskId(null);
      }
    });
  };

  return (
    <div className="h-[calc(100vh-179px)] min-h-[450px] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
      <div className="w-full min-w-full">
        {/* 表格头（粘性顶置） */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-card font-semibold text-xs text-muted-foreground select-none">
          <div className="w-14 shrink-0 border-r border-border px-1 py-2.5 flex items-center justify-center gap-1 sticky left-0 z-30 bg-card">
            <span>操作</span>
            <button
              title="添加一级任务行"
              onClick={handleAddDraftRootTask}
              className="rounded p-0.5 text-indigo-400 hover:bg-indigo-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="w-44 shrink-0 border-r border-border px-2 py-2.5 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span>功能 / 任务名称</span>
          </div>
          <div className="w-24 shrink-0 border-r border-border px-1 py-2.5 text-center">SDLC 节点</div>
          <div className="w-24 shrink-0 border-r border-border px-2 py-2.5 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-purple-400" />
            <span>负责人</span>
          </div>
          <div className="w-36 shrink-0 border-r border-border px-2 py-2.5">功能描述 (验收标准)</div>
          <div className="w-32 shrink-0 border-r border-border px-1.5 py-2.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>计划开始</span>
          </div>
          <div className="w-32 shrink-0 border-r border-border px-1.5 py-2.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>计划完成</span>
          </div>
          <div className="w-32 shrink-0 border-r border-border px-1.5 py-2.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            <span>实际开始</span>
          </div>
          <div className="w-32 shrink-0 border-r border-border px-1.5 py-2.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            <span>实际完成</span>
          </div>
          <div className="w-24 shrink-0 border-r border-border px-1 py-2.5 flex items-center justify-center gap-1">
            <Activity className="h-3.5 w-3.5 text-amber-400" />
            <span>任务状态</span>
          </div>
          <div className="w-20 shrink-0 border-r border-border px-1 py-2.5 flex items-center justify-center gap-1">
            <Percent className="h-3.5 w-3.5 text-indigo-400" />
            <span>进度</span>
          </div>
          <div className="w-32 shrink-0 border-r border-border px-2 py-2.5 flex items-center gap-1">
            <Folder className="h-3.5 w-3.5 text-amber-400" />
            <span>关联月度事项</span>
          </div>
          <div className="w-28 shrink-0 border-r border-border px-2 py-2.5 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-sky-400" />
            <span>关联版本/项目</span>
          </div>
        </div>

        {/* 表格体 */}
        {visibleRows.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
            <span>暂无任务记录，可点击下方按钮直接新增</span>
            <button
              onClick={handleAddDraftRootTask}
              className="rounded-lg bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> 添加一级任务行
            </button>
          </div>
        ) : (
          visibleRows.map(({ task, depth, hasChildren }) => (
            <GridRow
              key={task.id}
              task={task}
              depth={depth}
              hasChildren={hasChildren}
              isCollapsed={collapsedIds.has(task.id)}
              context={context}
              onToggleCollapse={toggleCollapse}
              onCreateSubTask={handleAddDraftSubTask}
              onRemove={onRemove}
              onFieldChange={handleFieldChange}
              onSaveDraft={handleSaveDraft}
              onDiscardDraft={handleDiscardDraft}
              savingTaskId={savingTaskId}
              savedTaskId={savedTaskId}
            />
          ))
        )}

        {/* 表格底部【+ 添加一级任务行】直接插行按钮 */}
        <button
          onClick={handleAddDraftRootTask}
          className="w-full py-2.5 bg-card/60 hover:bg-indigo-500/10 text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1.5 transition select-none border-b border-border/50"
        >
          <Plus className="h-4 w-4" /> 添加一级任务行
        </button>
      </div>
    </div>
  );
}
