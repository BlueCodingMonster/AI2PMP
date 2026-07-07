"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useTransition } from "react";
import { addPlanItem, updatePlanItem } from "@/actions/plans";
import { PlanItemStatus, WorkItemType, PlanningTreatment } from "@prisma/client";
import { Loader2, X, Star, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";

const workItemTypeLabels: Record<WorkItemType, string> = {
  REQUIREMENT: "需求",
  VERSION_GOAL: "版本目标",
  PROJECT_MATTER: "项目事项",
  OPERATIONS: "运维支撑",
  MARKET_SUPPORT: "市场支撑",
  RESEARCH: "技术调研",
  DEFECT_FIX: "缺陷/紧急修复",
  TEMPORARY: "临时工作",
};

const planningTreatmentLabels: Record<PlanningTreatment, string> = {
  NOT_INCLUDED: "不纳入计划，仅记录",
  ADD_TO_CURRENT: "补入当前月度计划",
  MOVE_TO_NEXT: "转入下个月度计划",
  LINK_EXISTING_ITEM: "关联到已有工作项",
};

type ProductVersionOption = {
  id: string;
  title: string;
  version: string;
  status: string;
  productModule: {
    name: string;
    productPlatform: { name: string };
  };
};

type EditPlanItem = {
  id: string;
  title?: string;
  description?: string | null;
  type?: WorkItemType;
  isPlanned?: boolean;
  planningTreatment?: PlanningTreatment | null;
  productLineTeamId?: string | null;
  relatedPlanItemId?: string | null;
  requirementId?: string | null;
  projectId?: string | null;
  productVersionId?: string | null;
  assigneeId?: string | null;
  status?: PlanItemStatus;
  progress?: number;
};

interface PlanItemModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  users: { id: string; name: string }[];
  projects: { id: string; name: string; key: string }[];
  requirements: { id: string; title: string; priority: string; type: string }[];
  productVersions: ProductVersionOption[];
  editData?: EditPlanItem | null;
}

export default function PlanItemModal({
  planId,
  isOpen,
  onClose,
  users,
  projects,
  requirements,
  productVersions,
  editData,
}: PlanItemModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!editData;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItemType>(WorkItemType.REQUIREMENT);
  const [isPlanned, setIsPlanned] = useState(true);
  const [planningTreatment, setPlanningTreatment] = useState<PlanningTreatment>(PlanningTreatment.NOT_INCLUDED);
  const [requirementId, setRequirementId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [productVersionId, setProductVersionId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState<PlanItemStatus>(PlanItemStatus.TODO);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || "");
      setDescription(editData.description || "");
      setType(editData.type || WorkItemType.REQUIREMENT);
      setIsPlanned(editData.isPlanned ?? true);
      setPlanningTreatment(editData.planningTreatment || PlanningTreatment.NOT_INCLUDED);
      setRequirementId(editData.requirementId || "");
      setProjectId(editData.projectId || "");
      setProductVersionId(editData.productVersionId || "");
      setAssigneeId(editData.assigneeId || "");
      setStatus(editData.status || PlanItemStatus.TODO);
      setProgress(editData.progress || 0);
    } else {
      setTitle("");
      setDescription("");
      setType(WorkItemType.REQUIREMENT);
      setIsPlanned(true);
      setPlanningTreatment(PlanningTreatment.NOT_INCLUDED);
      setRequirementId("");
      setProjectId("");
      setProductVersionId("");
      setAssigneeId("");
      setStatus(PlanItemStatus.TODO);
      setProgress(0);
    }
    setError(null);
  }, [editData, isOpen]);

  const handleRequirementChange = (reqId: string) => {
    setRequirementId(reqId);
    if (reqId && !title) {
      const selectedReq = requirements.find((r) => r.id === reqId);
      if (selectedReq) setTitle(selectedReq.title);
    }
  };

  const handleVersionChange = (versionId: string) => {
    setProductVersionId(versionId);
    if (versionId && !title) {
      const selectedVersion = productVersions.find((version) => version.id === versionId);
      if (selectedVersion) setTitle(`${selectedVersion.title} ${selectedVersion.version}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("请输入工作项标题");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      isPlanned,
      planningTreatment: isPlanned ? undefined : planningTreatment,
      requirementId: requirementId || undefined,
      projectId: projectId || undefined,
      productVersionId: productVersionId || undefined,
      assigneeId: assigneeId || undefined,
      status,
      progress: Number(progress),
    };

    startTransition(async () => {
      const res = isEditMode ? await updatePlanItem(editData.id, payload) : await addPlanItem(planId, payload);
      if (!res.success) {
        setError(res.error || "操作失败");
        return;
      }
      onClose();
      router.refresh();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-semibold text-white">{isEditMode ? "编辑工作项" : "添加工作项"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">工作项类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                {Object.entries(workItemTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">计划归属</label>
              <select
                value={isPlanned ? "planned" : "unplanned"}
                onChange={(e) => setIsPlanned(e.target.value === "planned")}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                <option value="planned">计划内</option>
                <option value="unplanned">计划外</option>
              </select>
            </div>
          </div>

          {!isPlanned && (
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">计划外处理方式</label>
              <select
                value={planningTreatment}
                onChange={(e) => setPlanningTreatment(e.target.value as PlanningTreatment)}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                {Object.entries(planningTreatmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
              关联产品版本（可选）
            </label>
            <select
              value={productVersionId}
              onChange={(e) => handleVersionChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
            >
              <option value="">不关联产品版本</option>
              {productVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  [{version.productModule.productPlatform.name} / {version.productModule.name}] {version.title} {version.version}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              关联需求池需求（可选）
            </label>
            <select
              value={requirementId}
              onChange={(e) => handleRequirementChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
            >
              <option value="">不关联需求</option>
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  [{req.type}] {req.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">工作项名称/标题 *</label>
            <input
              type="text"
              required
              placeholder="请输入本次计划的工作项标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">工作项描述</label>
            <textarea
              rows={2}
              placeholder="对工作项做进一步说明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">关联执行项目</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                <option value="">不关联项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">负责人</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                <option value="">未指定</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">执行状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanItemStatus)}
                className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:border-primary focus:outline-none"
              >
                <option value={PlanItemStatus.TODO}>待办</option>
                <option value={PlanItemStatus.IN_PROGRESS}>进行中</option>
                <option value={PlanItemStatus.DONE}>已完成</option>
                <option value={PlanItemStatus.CANCELLED}>已取消</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-medium">完成进度</label>
                <span className="font-semibold text-indigo-400">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button type="button" onClick={onClose} className="rounded-lg border border-border bg-input px-4 py-2 font-medium text-white hover:bg-muted">
              取消
            </button>
            <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 font-medium text-white shadow-lg disabled:opacity-50">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEditMode ? "保存工作项" : "添加工作项"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
