"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Loader2, Save } from "lucide-react";
import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";
import { createRequirement, updateRequirement } from "@/actions/requirements";
import { RequirementInput } from "@/lib/validations/requirements";
import {
  formatRequirementNo,
  requirementPriorityLabels,
  requirementSourceLabels,
  requirementStatusLabels,
} from "@/lib/requirements/presentation";

type InitialRequirement = {
  id: string;
  sequenceNo: number;
  title: string;
  summary: string | null;
  status: RequirementStatus;
  source: RequirementSource;
  priority: Priority;
  productLineTeamId: string | null;
  proposer: string | null;
  proposedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  createdBy: { name: string };
};

interface RequirementFormProps {
  productLineTeams: { id: string; name: string }[];
  currentUserName: string;
  defaultProductLineTeamId?: string;
  initialData?: InitialRequirement;
  mode?: "create" | "edit" | "view";
  canEdit?: boolean;
}

const dateValue = (value?: string | null) => (value ? value.slice(0, 10) : "");
const dateTimeValue = (value: string) => {
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

export default function RequirementForm({
  productLineTeams,
  currentUserName,
  defaultProductLineTeamId,
  initialData,
  mode,
  canEdit = false,
}: RequirementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const [status, setStatus] = useState<RequirementStatus>(
    initialData?.status ?? RequirementStatus.PENDING_REVIEW,
  );
  const [source, setSource] = useState<RequirementSource>(
    initialData?.source ?? RequirementSource.PRODUCT_PLANNING,
  );
  const [priority, setPriority] = useState<Priority>(initialData?.priority ?? Priority.MEDIUM);
  const [productLineTeamId, setProductLineTeamId] = useState(
    initialData?.productLineTeamId ?? defaultProductLineTeamId ?? "",
  );
  const [proposer, setProposer] = useState(initialData?.proposer ?? "");
  const [proposedAt, setProposedAt] = useState(dateValue(initialData?.proposedAt));
  const [reviewedAt, setReviewedAt] = useState(dateValue(initialData?.reviewedAt));
  const [createdAt, setCreatedAt] = useState(() =>
    dateTimeValue(initialData?.createdAt ?? new Date().toISOString()),
  );
  const [error, setError] = useState<string | null>(null);
  const resolvedMode = mode ?? (initialData ? "edit" : "create");
  const isView = resolvedMode === "view";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isView) return;
    setError(null);
    if (!title.trim()) return setError("请输入需求名称");
    if (!createdAt) return setError("请选择创建时间");
    if (status === RequirementStatus.REVIEWED && !reviewedAt) {
      return setError("请选择评审通过时间");
    }

    const payload: RequirementInput = {
      title: title.trim(),
      summary: summary.trim() || null,
      status,
      source,
      priority: priority as "HIGH" | "MEDIUM" | "LOW",
      productLineTeamId: productLineTeamId || null,
      proposer: proposer.trim() || null,
      proposedAt: proposedAt || null,
      reviewedAt: reviewedAt || null,
      createdAt: new Date(createdAt).toISOString(),
    };

    startTransition(async () => {
      const result = initialData
        ? await updateRequirement(initialData.id, payload)
        : await createRequirement(payload);
      if (!result.success) return setError(result.error || "保存失败，请重试");
      router.push(initialData ? `/requirements/${initialData.id}` : "/requirements");
      router.refresh();
    });
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}
      <fieldset disabled={isView} className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">需求信息</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>需求编号</span>
            <input disabled value={initialData ? formatRequirementNo(initialData.sequenceNo) : "保存后自动生成"} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>需求状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as RequirementStatus)} className={inputClass}>
              {Object.entries(requirementStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-1.5 text-xs text-muted-foreground">
          <span>需求名称 <span className="text-red-500">*</span></span>
          <input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="请输入需求名称" />
        </label>
        <label className="block space-y-1.5 text-xs text-muted-foreground">
          <span>需求内容简述（可选）</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className={`${inputClass} min-h-28 resize-y`}
            maxLength={2000}
            placeholder="简要说明需求背景、目标或主要内容"
          />
        </label>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>归属产品线（可选）</span>
            <select value={productLineTeamId} onChange={(event) => setProductLineTeamId(event.target.value)} className={inputClass}>
              <option value="">暂不关联产品线</option>
              {productLineTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>优先级</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className={inputClass}>
              {[Priority.HIGH, Priority.MEDIUM, Priority.LOW].map((value) => <option key={value} value={value}>{requirementPriorityLabels[value]}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>需求来源</span>
            <select value={source} onChange={(event) => setSource(event.target.value as RequirementSource)} className={inputClass}>
              {Object.entries(requirementSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>客户名称或需求方（可选）</span>
            <input value={proposer} onChange={(event) => setProposer(event.target.value)} className={inputClass} placeholder="客户、部门或提出人" />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>提出时间（可选）</span>
            <input type="date" value={proposedAt} onChange={(event) => setProposedAt(event.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>创建人</span>
            <input disabled value={initialData?.createdBy.name ?? currentUserName} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            <span>创建时间 <span className="text-red-500">*</span></span>
            <input
              required
              type="datetime-local"
              value={createdAt}
              onChange={(event) => setCreatedAt(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block max-w-md space-y-1.5 text-xs text-muted-foreground">
          <span>评审通过时间 {status === RequirementStatus.REVIEWED && <span className="text-red-500">*</span>}</span>
          <input type="date" value={reviewedAt} onChange={(event) => setReviewedAt(event.target.value)} className={inputClass} />
        </label>
      </fieldset>
      <div className="flex items-center justify-between gap-4">
        <Link href="/requirements" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />{isView ? "返回需求池" : "取消并返回"}
        </Link>
        {isView ? canEdit && initialData && <Link href={`/requirements/${initialData.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white"><Edit2 className="h-4 w-4" />编辑需求</Link> : <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "正在保存..." : initialData ? "保存修改" : "创建需求"}
        </button>}
      </div>
    </form>
  );
}
