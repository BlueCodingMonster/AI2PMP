"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask, getProjectRequirements, getProjectTasks } from "@/actions/tasks";
import { TaskStatus, Priority, TaskType } from "@prisma/client";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface TaskFormProps {
  projects: { id: string; name: string; key: string }[];
  users: { id: string; name: string }[];
  initialData?: any;
  prefilledProjectId?: string;
  prefilledRequirementId?: string;
  prefilledParentId?: string;
}

const statusLabels: Record<TaskStatus, string> = {
  TODO: "待办 (Todo)",
  IN_PROGRESS: "进行中 (In Progress)",
  IN_REVIEW: "评审中 (In Review)",
  DONE: "已完成 (Done)",
  CANCELLED: "已取消 (Cancelled)",
};

const priorityLabels: Record<Priority, string> = {
  URGENT: "紧急 (Urgent)",
  HIGH: "高 (High)",
  MEDIUM: "中 (Medium)",
  LOW: "低 (Low)",
};

const typeLabels: Record<TaskType, string> = {
  FEATURE: "功能开发 (Feature)",
  IMPROVEMENT: "持续改进 (Improvement)",
  TASK: "开发任务 (Task)",
  SUBTASK: "子开发任务 (Subtask)",
};

export default function TaskForm({
  projects,
  users,
  initialData,
  prefilledProjectId,
  prefilledRequirementId,
  prefilledParentId,
}: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  // 表单字段状态
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [projectId, setProjectId] = useState(
    initialData?.projectId || prefilledProjectId || projects[0]?.id || ""
  );
  const [requirementId, setRequirementId] = useState(
    initialData?.requirementId || prefilledRequirementId || ""
  );
  const [parentId, setParentId] = useState(
    initialData?.parentId || prefilledParentId || ""
  );
  const [assigneeId, setAssigneeId] = useState(initialData?.assigneeId || "");
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || TaskStatus.TODO);
  const [priority, setPriority] = useState<Priority>(initialData?.priority || Priority.MEDIUM);
  const [type, setType] = useState<TaskType>(initialData?.type || (prefilledParentId ? TaskType.SUBTASK : TaskType.TASK));
  
  const formatLocalDate = (dateObj?: Date) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    const monthStr = `${d.getMonth() + 1}`.padStart(2, "0");
    const dayStr = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${monthStr}-${dayStr}`;
  };

  const [startDate, setStartDate] = useState(
    initialData?.startDate ? formatLocalDate(initialData.startDate) : ""
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ? formatLocalDate(initialData.dueDate) : ""
  );
  const [estimatedHours, setEstimatedHours] = useState<string>(
    initialData?.estimatedHours ? String(initialData.estimatedHours) : ""
  );

  const [reqOptions, setReqOptions] = useState<{ id: string; title: string }[]>([]);
  const [parentOptions, setParentOptions] = useState<{ id: string; title: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当选择的项目变化时，加载对应的需求列表和一级任务列表
  useEffect(() => {
    if (!projectId) {
      setReqOptions([]);
      setParentOptions([]);
      return;
    }

    const fetchProjectOptions = async () => {
      setLoadingOptions(true);
      try {
        const [reqsRes, tasksRes] = await Promise.all([
          getProjectRequirements(projectId),
          getProjectTasks(projectId),
        ]);
        if (reqsRes.success && reqsRes.data) {
          setReqOptions(reqsRes.data);
        }
        if (tasksRes.success && tasksRes.data) {
          // 排除当前编辑的任务自己
          const filteredTasks = isEditMode
            ? tasksRes.data.filter((t) => t.id !== initialData.id)
            : tasksRes.data;
          setParentOptions(filteredTasks);
        }
      } catch (err) {
        console.error("加载关联项目选项失败:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchProjectOptions();
  }, [projectId, isEditMode, initialData]);

  // 当类型更改为 SUBTASK 时，如果没有关联父任务，警告或默认指定
  useEffect(() => {
    if (type !== TaskType.SUBTASK) {
      setParentId("");
    } else if (parentOptions.length > 0 && !parentId) {
      setParentId(parentOptions[0]?.id || "");
    }
  }, [type, parentOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("请输入任务标题");
      return;
    }
    if (!projectId) {
      setError("请选择所属项目");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      projectId,
      requirementId: requirementId || undefined,
      parentId: type === TaskType.SUBTASK && parentId ? parentId : undefined,
      assigneeId: assigneeId || undefined,
      status,
      priority,
      type,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
    };

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          res = await updateTask(initialData.id, payload);
        } else {
          res = await createTask(payload);
        }

        if (!res.success) {
          setError(res.error || "保存失败，请重试");
          return;
        }

        router.push(isEditMode ? `/tasks/${initialData.id}` : "/tasks");
        router.refresh();
      } catch (err) {
        console.error("保存任务出错:", err);
        setError("系统错误，请重试");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">基本信息</h2>

        {/* 所属项目 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="projectId" className="block text-xs font-medium text-muted-foreground">
              所属项目 <span className="text-red-500">*</span>
            </label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isEditMode}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">请选择项目...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 关联需求池需求 */}
          <div className="space-y-1.5">
            <label htmlFor="requirementId" className="block text-xs font-medium text-muted-foreground">
              关联需求（可选）
            </label>
            <select
              id="requirementId"
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="">不关联需求</option>
              {reqOptions.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 任务类型与指派 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="type" className="block text-xs font-medium text-muted-foreground">
              任务类型
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 如果是子任务，显示父任务选择器 */}
          {type === TaskType.SUBTASK && (
            <div className="space-y-1.5">
              <label htmlFor="parentId" className="block text-xs font-medium text-muted-foreground">
                指定父任务 <span className="text-red-500">*</span>
              </label>
              <select
                id="parentId"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
              >
                {parentOptions.length === 0 ? (
                  <option value="">项目下无一级任务，请先创建</option>
                ) : (
                  parentOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="assigneeId" className="block text-xs font-medium text-muted-foreground">
              任务指派给
            </label>
            <select
              id="assigneeId"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="">待指派</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="priority" className="block text-xs font-medium text-muted-foreground">
              优先级
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(priorityLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 任务标题 */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-medium text-muted-foreground">
            任务名称/标题 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="说明本任务需要实现的功能或修复的内容"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none"
          />
        </div>

        {/* 状态与时间估算 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-xs font-medium text-muted-foreground">
              当前状态
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="startDate" className="block text-xs font-medium text-muted-foreground">计划开始日期</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dueDate" className="block text-xs font-medium text-muted-foreground">截止交付日期</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="estimatedHours" className="block text-xs font-medium text-muted-foreground">预估开发工时 (小时)</label>
            <input
              id="estimatedHours"
              type="number"
              step="0.5"
              placeholder="如: 8.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 详细描述 */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-medium text-muted-foreground">
            详细需求说明与实现方案
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="详细列出需要做的工作内容，开发说明..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none resize-y"
          />
        </div>
      </div>

      {/* 按钮行 */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isEditMode ? `/tasks/${initialData.id}` : "/tasks"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          取消并返回
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在保存...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? "保存修改" : "创建任务"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
