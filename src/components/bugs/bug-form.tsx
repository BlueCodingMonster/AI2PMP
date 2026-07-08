"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBug, updateBug } from "@/actions/bugs";
import { BugStatus, BugSeverity, Priority } from "@prisma/client";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface BugFormProps {
  projects: { id: string; name: string; key: string }[];
  users: { id: string; name: string }[];
  initialData?: any;
  prefilledProjectId?: string;
}

const statusLabels: Record<BugStatus, string> = {
  OPEN: "新建 (Open)",
  CONFIRMED: "已确认 (Confirmed)",
  IN_PROGRESS: "修复中 (In Progress)",
  FIXED: "已修复 (Fixed)",
  CLOSED: "已关闭 (Closed)",
  WONT_FIX: "不修复 (Wont Fix)",
};

const severityLabels: Record<BugSeverity, string> = {
  BLOCKER: "崩溃 (Blocker)",
  CRITICAL: "严重 (Critical)",
  MAJOR: "主要 (Major)",
  MINOR: "次要 (Minor)",
  TRIVIAL: "轻微 (Trivial)",
};

const priorityLabels: Record<Priority, string> = {
  URGENT: "紧急 (Urgent)",
  HIGH: "高 (High)",
  MEDIUM: "中 (Medium)",
  LOW: "低 (Low)",
};

export default function BugForm({
  projects,
  users,
  initialData,
  prefilledProjectId,
}: BugFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  // 表单状态
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [projectId, setProjectId] = useState(
    initialData?.projectId || prefilledProjectId || projects[0]?.id || ""
  );
  const [assigneeId, setAssigneeId] = useState(initialData?.assigneeId || "");
  const [status, setStatus] = useState<BugStatus>(initialData?.status || BugStatus.OPEN);
  const [severity, setSeverity] = useState<BugSeverity>(initialData?.severity || BugSeverity.MAJOR);
  const [priority, setPriority] = useState<Priority>(initialData?.priority || Priority.MEDIUM);
  const [environment, setEnvironment] = useState(initialData?.environment || "");
  const [stepsToReproduce, setStepsToReproduce] = useState(initialData?.stepsToReproduce || "");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("请输入缺陷标题");
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
      assigneeId: assigneeId || undefined,
      status,
      severity,
      priority,
      environment: environment.trim() || undefined,
      stepsToReproduce: stepsToReproduce.trim() || undefined,
    };

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          res = await updateBug(initialData.id, payload);
        } else {
          res = await createBug(payload);
        }

        if (!res.success) {
          setError(res.error || "保存失败，请重试");
          return;
        }

        router.push(isEditMode ? `/bugs/${initialData.id}` : "/bugs");
        router.refresh();
      } catch (err) {
        console.error("保存缺陷出错:", err);
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
        <h2 className="text-lg font-semibold text-white">缺陷基本配置</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* 项目 */}
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

          {/* 指派 */}
          <div className="space-y-1.5">
            <label htmlFor="assigneeId" className="block text-xs font-medium text-muted-foreground">
              分配给（负责人）
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
        </div>

        {/* 严重程度与优先级 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-xs font-medium text-muted-foreground">
              缺陷状态
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BugStatus)}
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
            <label htmlFor="severity" className="block text-xs font-medium text-muted-foreground">
              严重程度
            </label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BugSeverity)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(severityLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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

        {/* 标题 */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-medium text-muted-foreground">
            缺陷标题/概要 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="简述缺陷表现，如: 注册页面密码长度校验不生效"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none"
          />
        </div>

        {/* 测试环境 */}
        <div className="space-y-1.5">
          <label htmlFor="environment" className="block text-xs font-medium text-muted-foreground">
            发现缺陷的测试环境
          </label>
          <input
            id="environment"
            type="text"
            placeholder="例如: Chrome 126 / macOS 14.5 (UAT 环境)"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none"
          />
        </div>

        {/* 重现步骤 */}
        <div className="space-y-1.5">
          <label htmlFor="stepsToReproduce" className="block text-xs font-medium text-muted-foreground">
            缺陷重现步骤
          </label>
          <textarea
            id="stepsToReproduce"
            rows={5}
            placeholder="1. 点击首页登录\n2. 输入非法字符并点击提交\n3. 观察控制台报错，页面直接崩溃"
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none resize-y"
          />
        </div>

        {/* 详细描述 */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-medium text-muted-foreground">
            缺陷详细描述
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="说明问题产生的影响，相关日志报错堆栈信息..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none resize-y"
          />
        </div>
      </div>

      {/* 按钮行 */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isEditMode ? `/bugs/${initialData.id}` : "/bugs"}
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
              {isEditMode ? "保存修改" : "提交 Bug"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
