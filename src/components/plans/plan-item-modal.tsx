"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { addPlanItem, updatePlanItem } from "@/actions/plans";
import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  PlanItemStatus,
  PlanningTreatment,
  SpecialTaskCategory,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";
import {
  executionFlowLabels,
  intellectualPropertyTypeLabels,
  specialTaskCategoryLabels,
  workItemSourceLabels,
} from "@/lib/plans/workflow-templates";
import { GitBranch, Loader2, Star, X } from "lucide-react";
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
  source?: WorkItemSource;
  executionFlow?: ExecutionFlowTemplate;
  versionNameText?: string | null;
  specialTaskCategory?: SpecialTaskCategory | null;
  ipType?: IntellectualPropertyType | null;
  specialSerialNo?: string | null;
  specialTarget?: string | null;
  specialOwnerText?: string | null;
  plannedFinishText?: string | null;
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
  const [source, setSource] = useState<WorkItemSource>(WorkItemSource.PLATFORM_RND);
  const [executionFlow, setExecutionFlow] = useState<ExecutionFlowTemplate>(ExecutionFlowTemplate.NONE);
  const [versionNameText, setVersionNameText] = useState("");
  const [specialTaskCategory, setSpecialTaskCategory] = useState<SpecialTaskCategory | "">("");
  const [ipType, setIpType] = useState<IntellectualPropertyType | "">("");
  const [specialSerialNo, setSpecialSerialNo] = useState("");
  const [specialTarget, setSpecialTarget] = useState("");
  const [specialOwnerText, setSpecialOwnerText] = useState("");
  const [plannedFinishText, setPlannedFinishText] = useState("");
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
      setSource(editData.source || WorkItemSource.PLATFORM_RND);
      setExecutionFlow(editData.executionFlow || ExecutionFlowTemplate.NONE);
      setVersionNameText(editData.versionNameText || "");
      setSpecialTaskCategory(editData.specialTaskCategory || "");
      setIpType(editData.ipType || "");
      setSpecialSerialNo(editData.specialSerialNo || "");
      setSpecialTarget(editData.specialTarget || "");
      setSpecialOwnerText(editData.specialOwnerText || "");
      setPlannedFinishText(editData.plannedFinishText || "");
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
      setSource(WorkItemSource.PLATFORM_RND);
      setExecutionFlow(ExecutionFlowTemplate.NONE);
      setVersionNameText("");
      setSpecialTaskCategory("");
      setIpType("");
      setSpecialSerialNo("");
      setSpecialTarget("");
      setSpecialOwnerText("");
      setPlannedFinishText("");
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

  useEffect(() => {
    if (!isPlanned) {
      setSource(WorkItemSource.UNPLANNED);
      setSpecialTaskCategory("");
      setIpType("");
    } else if (source === WorkItemSource.UNPLANNED) {
      setSource(WorkItemSource.PLATFORM_RND);
    }
  }, [isPlanned, source]);

  const handleRequirementChange = (reqId: string) => {
    setRequirementId(reqId);
    if (reqId && !title) {
      const selectedReq = requirements.find((requirement) => requirement.id === reqId);
      if (selectedReq) setTitle(selectedReq.title);
    }
  };

  const handleVersionChange = (versionId: string) => {
    setProductVersionId(versionId);
    if (versionId) {
      const selectedVersion = productVersions.find((version) => version.id === versionId);
      if (selectedVersion) {
        setVersionNameText(`${selectedVersion.title} ${selectedVersion.version}`);
        if (!title) setTitle(`${selectedVersion.title} ${selectedVersion.version}`);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("请输入工作项标题");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      source: isPlanned ? source : WorkItemSource.UNPLANNED,
      executionFlow,
      versionNameText: versionNameText.trim() || undefined,
      specialTaskCategory: specialTaskCategory || undefined,
      ipType: specialTaskCategory === SpecialTaskCategory.INTELLECTUAL_PROPERTY ? ipType || undefined : undefined,
      specialSerialNo: specialSerialNo.trim() || undefined,
      specialTarget: specialTarget.trim() || undefined,
      specialOwnerText: specialOwnerText.trim() || undefined,
      plannedFinishText: plannedFinishText.trim() || undefined,
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

  const showSpecialFields = isPlanned && source === WorkItemSource.PLATFORM_RND;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-semibold text-white">{isEditMode ? "编辑工作项" : "添加工作项"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="工作项类型">
              <Select value={type} onChange={(value) => setType(value as WorkItemType)}>
                {Object.entries(workItemTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field label="计划归属">
              <Select value={isPlanned ? "planned" : "unplanned"} onChange={(value) => setIsPlanned(value === "planned")}>
                <option value="planned">计划内</option>
                <option value="unplanned">计划外</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="工作来源">
              <Select
                value={source}
                disabled={!isPlanned}
                onChange={(value) => {
                  setSource(value as WorkItemSource);
                  if (value !== WorkItemSource.PLATFORM_RND) {
                    setSpecialTaskCategory("");
                    setIpType("");
                  }
                }}
              >
                {Object.entries(workItemSourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>

            <Field label="执行流程模板">
              <Select value={executionFlow} onChange={(value) => setExecutionFlow(value as ExecutionFlowTemplate)}>
                {Object.entries(executionFlowLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          </div>

          {!isPlanned && (
            <Field label="计划外处理方式">
              <Select value={planningTreatment} onChange={(value) => setPlanningTreatment(value as PlanningTreatment)}>
                {Object.entries(planningTreatmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="关联产品版本（可选）" icon={<GitBranch className="h-3.5 w-3.5 text-indigo-400" />}>
            <Select value={productVersionId} onChange={handleVersionChange}>
              <option value="">不关联产品版本</option>
              {productVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  [{version.productModule.productPlatform.name} / {version.productModule.name}] {version.title} {version.version}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="版本名称文本">
            <Input value={versionNameText} onChange={setVersionNameText} placeholder="可直接填写年度计划表里的版本名称，如 大陆通平台V1.9.8" />
          </Field>

          <Field label="关联需求池需求（可选）" icon={<Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}>
            <Select value={requirementId} onChange={handleRequirementChange}>
              <option value="">不关联需求</option>
              {requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  [{requirement.type}] {requirement.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="工作项名称 / 标题 *">
            <Input value={title} onChange={setTitle} required placeholder="请输入本次计划的工作项标题" />
          </Field>

          <Field label="工作项描述">
            <Textarea rows={2} value={description} onChange={setDescription} placeholder="对工作项做进一步说明" />
          </Field>

          {showSpecialFields && (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="专项任务类型">
                  <Select value={specialTaskCategory} onChange={(value) => setSpecialTaskCategory(value as SpecialTaskCategory | "")}>
                    <option value="">非专项任务</option>
                    {Object.entries(specialTaskCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>

                {specialTaskCategory === SpecialTaskCategory.INTELLECTUAL_PROPERTY && (
                  <Field label="知识产权子类型">
                    <Select value={ipType} onChange={(value) => setIpType(value as IntellectualPropertyType | "")}>
                      <option value="">请选择</option>
                      {Object.entries(intellectualPropertyTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>

              {specialTaskCategory && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="编号">
                      <Input value={specialSerialNo} onChange={setSpecialSerialNo} />
                    </Field>
                    <Field label="完成时间">
                      <Input value={plannedFinishText} onChange={setPlannedFinishText} placeholder="如 第三季度 / 2025.12" />
                    </Field>
                    <Field label="承担机构或人员">
                      <Input value={specialOwnerText} onChange={setSpecialOwnerText} />
                    </Field>
                  </div>
                  <Field label="目标">
                    <Textarea rows={2} value={specialTarget} onChange={setSpecialTarget} />
                  </Field>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="关联执行项目">
              <Select value={projectId} onChange={setProjectId}>
                <option value="">不关联项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>[{project.key}] {project.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="负责人">
              <Select value={assigneeId} onChange={setAssigneeId}>
                <option value="">未指定</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="执行状态">
              <Select value={status} onChange={(value) => setStatus(value as PlanItemStatus)}>
                <option value={PlanItemStatus.TODO}>待办</option>
                <option value={PlanItemStatus.IN_PROGRESS}>进行中</option>
                <option value={PlanItemStatus.DONE}>已完成</option>
                <option value={PlanItemStatus.CANCELLED}>已取消</option>
              </Select>
            </Field>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-muted-foreground font-medium">完成进度</label>
                <span className="font-semibold text-indigo-400">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-3">
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

function Field({ children, icon, label }: { children: React.ReactNode; icon?: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-muted-foreground font-medium">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  children,
  disabled,
  onChange,
  value,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white focus:border-primary focus:outline-none disabled:opacity-60"
    >
      {children}
    </select>
  );
}

function Input({
  onChange,
  placeholder,
  required,
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <input
      required={required}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-border bg-input px-4 py-2 text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
    />
  );
}

function Textarea({
  onChange,
  placeholder,
  rows,
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-y rounded-lg border border-border bg-input px-4 py-2 text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
    />
  );
}
