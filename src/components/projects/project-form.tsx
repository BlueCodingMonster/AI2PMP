"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject, updateProject } from "@/actions/projects";
import { ProjectStatus } from "@prisma/client";
import { Loader2, ArrowLeft, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface ProjectFormProps {
  initialData?: any;
}

const statusMap: Record<ProjectStatus, string> = {
  PLANNING: "规划中",
  ACTIVE: "进行中",
  ON_HOLD: "挂起",
  COMPLETED: "已完成",
  ARCHIVED: "已归档",
};

export default function ProjectForm({ initialData }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [key, setKey] = useState(initialData?.key || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState<ProjectStatus>(initialData?.status || ProjectStatus.PLANNING);
  
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
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? formatLocalDate(initialData.endDate) : ""
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("请输入项目名称");
      return;
    }
    if (!key.trim()) {
      setError("请输入项目键(Key)");
      return;
    }
    if (!/^[A-Z0-9]{2,10}$/.test(key.toUpperCase())) {
      setError("项目键(Key)必须为 2-10 位的字母或数字组合");
      return;
    }

    const payload = {
      name: name.trim(),
      key: key.toUpperCase().trim(),
      description: description.trim() || undefined,
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          res = await updateProject(initialData.id, payload);
        } else {
          res = await createProject(payload);
        }

        if (!res.success) {
          setError(res.error || "保存失败，请重试");
          return;
        }

        router.push(isEditMode ? `/projects/${initialData.id}` : "/projects");
        router.refresh();
      } catch (err) {
        console.error("保存项目出错:", err);
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
        <h2 className="text-lg font-semibold text-white">项目基本配置</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 项目名称 */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="name" className="block text-xs font-medium text-muted-foreground">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="例如: 智能研发生产管理系统"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 项目键值 */}
          <div className="space-y-1.5">
            <label htmlFor="key" className="block text-xs font-medium text-muted-foreground flex items-center gap-1">
              项目键值(Key) <span className="text-red-500">*</span>
            </label>
            <input
              id="key"
              type="text"
              required
              disabled={isEditMode}
              placeholder="如: AI, PROJ"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {!isEditMode && (
              <p className="text-[10px] text-muted-foreground">作为任务/Bug的前缀(如: AI-101)，创建后无法修改。</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 状态 */}
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-xs font-medium text-muted-foreground">
              项目状态
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(statusMap).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="block text-xs font-medium text-muted-foreground">开始日期</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 结束日期 */}
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="block text-xs font-medium text-muted-foreground">计划结束日期</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 项目描述 */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-medium text-muted-foreground">
            项目详述与备注
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="说明项目的总体建设方案、架构边界与关键节点..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white focus:border-primary focus:outline-none resize-y"
          />
        </div>
      </div>

      {/* 按钮行 */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isEditMode ? `/projects/${initialData.id}` : "/projects"}
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
              {isEditMode ? "保存修改" : "创建项目"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
