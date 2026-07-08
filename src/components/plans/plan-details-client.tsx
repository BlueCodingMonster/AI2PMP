"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePlan, deletePlanItem } from "@/actions/plans";
import {
  ExecutionFlowTemplate,
  IntellectualPropertyType,
  PlanStatus,
  PlanType,
  PlanItemStatus,
  PlanningTreatment,
  SpecialTaskCategory,
  StageGroup,
  WorkItemSource,
  WorkItemType,
} from "@prisma/client";
import {
  executionFlowLabels,
  intellectualPropertyTypeLabels,
  specialTaskCategoryLabels,
  stageGroupLabels,
  workItemSourceLabels,
} from "@/lib/plans/workflow-templates";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  User,
  Folder,
  ArrowRight,
  TrendingUp,
  Settings,
  Layers,
} from "lucide-react";
import PlanItemModal from "./plan-item-modal";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

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

const statusMap: Record<PlanStatus, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  PUBLISHED: { label: "已发布", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  IN_PROGRESS: { label: "进行中", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  ADJUSTED: { label: "已调整", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  COMPLETED: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "已作废", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  ARCHIVED: { label: "已归档", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const itemStatusMap: Record<PlanItemStatus, { label: string; className: string }> = {
  TODO: { label: "待办", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  DONE: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "已取消", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const typeLabels: Record<PlanType, string> = {
  ANNUAL: "年度计划",
  HALF_YEAR: "半年计划",
  QUARTERLY: "季度计划",
  MONTHLY: "月度计划",
};

interface PlanDetailsClientProps {
  plan: PlanDetails;
  users: { id: string; name: string }[];
  projects: { id: string; name: string; key: string }[];
  requirements: { id: string; title: string; priority: string; type: string }[];
  productVersions: Array<{
    id: string;
    title: string;
    version: string;
    status: string;
    productModule: { name: string; productPlatform: { name: string } };
  }>;
}

type PlanDetails = {
  id: string;
  title: string;
  description?: string | null;
  type: PlanType;
  status: PlanStatus;
  year: number;
  halfYear?: number | null;
  quarter?: number | null;
  month?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  goals?: string | null;
  progress: number;
  updatedAt: Date | string;
  createdBy: { id: string; name: string };
  productLineTeam?: { id: string; name: string } | null;
  parentPlan?: { id: string; title: string; type: PlanType } | null;
  childPlans: Array<{ id: string; title: string; type: PlanType; status: PlanStatus }>;
  items: PlanItemDetails[];
};

type PlanItemDetails = {
  id: string;
  title: string;
  description?: string | null;
  type: WorkItemType;
  source: WorkItemSource;
  executionFlow: ExecutionFlowTemplate;
  versionNameText?: string | null;
  specialTaskCategory?: SpecialTaskCategory | null;
  ipType?: IntellectualPropertyType | null;
  specialSerialNo?: string | null;
  specialTarget?: string | null;
  specialOwnerText?: string | null;
  plannedFinishText?: string | null;
  isPlanned: boolean;
  planningTreatment?: PlanningTreatment | null;
  relatedPlanItem?: { id: string; title: string; status: PlanItemStatus; progress: number } | null;
  requirement?: { id: string; title: string; status: string; priority: string } | null;
  project?: { id: string; name: string; key: string } | null;
  productVersionId?: string | null;
  productVersion?: {
    id: string;
    title: string;
    version: string;
    status: string;
    productModule: { name: string; productPlatform: { name: string } };
  } | null;
  assignee?: { id: string; name: string } | null;
  stages?: Array<{
    id: string;
    group: StageGroup;
    name: string;
    isMilestone: boolean;
    status: PlanItemStatus;
    plannedTime?: string | null;
    assignee?: { id: string; name: string } | null;
  }>;
  status: PlanItemStatus;
  progress: number;
};

function periodLabel(plan: PlanDetails) {
  if (plan.type === PlanType.ANNUAL) return `${plan.year}年`;
  if (plan.type === PlanType.HALF_YEAR) return `${plan.year}年 H${plan.halfYear}`;
  if (plan.type === PlanType.QUARTERLY) return `${plan.year}年 Q${plan.quarter}`;
  return `${plan.year}年 ${plan.month}月`;
}

export default function PlanDetailsClient({
  plan,
  users,
  projects,
  requirements,
  productVersions,
}: PlanDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<PlanItemDetails | null>(null);

  const plannedItems = plan.items.filter((item) => item.isPlanned);
  const unplannedItems = plan.items.filter((item) => !item.isPlanned);
  const unplannedShare =
    plan.items.length > 0 ? Math.round((unplannedItems.length / plan.items.length) * 100) : 0;

  const handleDeletePlan = () => {
    if (!window.confirm("确定要删除这个计划吗？关联的工作项也会被删除。")) return;

    startTransition(async () => {
      const res = await deletePlan(plan.id);
      if (res.success) {
        router.push("/plans");
        router.refresh();
      } else {
        alert(res.error || "删除失败");
      }
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm("确定要删除该工作项吗？")) return;

    startTransition(async () => {
      const res = await deletePlanItem(itemId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "删除失败");
      }
    });
  };

  const handleEditItem = (item: PlanItemDetails) => {
    setEditItemData(item);
    setModalOpen(true);
  };

  const handleCreateItem = () => {
    setEditItemData(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回计划总览
        </Link>

        <div className="flex gap-2">
          <Link
            href={`/plans/${plan.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
          >
            <Edit2 className="h-3.5 w-3.5" />
            编辑计划
          </Link>
          <button
            onClick={handleDeletePlan}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 py-1.5 px-3 text-xs font-medium text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除计划
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
            {typeLabels[plan.type as PlanType]}
          </span>
          {plan.productLineTeam && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              <Layers className="h-3 w-3" />
              {plan.productLineTeam.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {periodLabel(plan)}
          </span>
          <span
            className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-medium border ${
              statusMap[plan.status as PlanStatus]?.className || ""
            }`}
          >
            {statusMap[plan.status as PlanStatus]?.label || plan.status}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{plan.title}</h1>
        {plan.description && <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              核心业务目标
            </h3>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {plan.goals || <span className="text-muted-foreground italic">暂无核心业务目标</span>}
            </div>
          </div>

          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                工作项 ({plan.items.length})
              </h3>
              <button
                onClick={handleCreateItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/90 py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                添加工作项
              </button>
            </div>

            {plan.items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                该计划尚未添加具体工作项。工作项可以关联需求、产品版本或项目，也可以作为独立管理事项。
              </p>
            ) : (
              <div className="space-y-4">
                {plan.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border/60 rounded-xl bg-input/20 p-4 space-y-3 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] mt-1.5">
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-400 border border-indigo-500/20">
                            {workItemTypeLabels[item.type]}
                          </span>
                          <span className="rounded bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-400 border border-cyan-500/20">
                            {workItemSourceLabels[item.source]}
                          </span>
                          {item.executionFlow !== ExecutionFlowTemplate.NONE && (
                            <span className="rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-400 border border-purple-500/20">
                              {executionFlowLabels[item.executionFlow]}
                            </span>
                          )}
                          <span
                            className={`rounded px-2 py-0.5 font-medium border ${
                              item.isPlanned
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {item.isPlanned ? "计划内" : "计划外"}
                          </span>
                          {!item.isPlanned && item.planningTreatment && (
                            <span className="rounded bg-muted/40 px-2 py-0.5 text-muted-foreground">
                              {planningTreatmentLabels[item.planningTreatment]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-white"
                          title="编辑"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                      {item.requirement ? (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500">★</span>
                          <span>需求:</span>
                          <Link
                            href={`/requirements/${item.requirement.id}`}
                            className="text-indigo-400 hover:underline font-medium truncate max-w-[150px]"
                          >
                            {item.requirement.title}
                          </Link>
                        </div>
                      ) : (
                        <span className="rounded bg-muted/40 px-2 py-0.5">未关联需求</span>
                      )}
                      {item.project && (
                        <div className="flex items-center gap-1">
                          <Folder className="h-3.5 w-3.5" />
                          <span>项目:</span>
                          <span className="text-white font-medium">
                            [{item.project.key}] {item.project.name}
                          </span>
                        </div>
                      )}
                      {item.productVersion && (
                        <div className="flex items-center gap-1">
                          <span>版本:</span>
                          <span className="text-white font-medium">
                            [{item.productVersion.productModule.productPlatform.name} / {item.productVersion.productModule.name}]{" "}
                            {item.productVersion.title} {item.productVersion.version}
                          </span>
                        </div>
                      )}
                      {!item.productVersion && item.versionNameText && (
                        <div className="flex items-center gap-1">
                          <span>版本:</span>
                          <span className="text-white font-medium">{item.versionNameText}</span>
                        </div>
                      )}
                      {item.specialTaskCategory && (
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                          <div className="flex flex-wrap gap-2">
                            <span className="font-medium text-white">{specialTaskCategoryLabels[item.specialTaskCategory]}</span>
                            {item.ipType && <span>{intellectualPropertyTypeLabels[item.ipType]}</span>}
                            {item.specialSerialNo && <span>编号: {item.specialSerialNo}</span>}
                            {item.plannedFinishText && <span>完成时间: {item.plannedFinishText}</span>}
                            {item.specialOwnerText && <span>承担: {item.specialOwnerText}</span>}
                          </div>
                          {item.specialTarget && <div className="text-foreground/80">目标: {item.specialTarget}</div>}
                        </div>
                      )}
                      {item.stages && item.stages.length > 0 && (
                        <div className="rounded-lg border border-border/60 bg-black/10 p-3 text-xs">
                          <div className="mb-2 font-medium text-white">流程阶段</div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {item.stages.map((stage) => (
                              <div key={stage.id} className="flex items-center justify-between gap-2 rounded bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">
                                  {stageGroupLabels[stage.group]} / {stage.name}
                                </span>
                                {stage.isMilestone && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">里程碑</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>负责人:</span>
                          <span className="text-white font-medium">{item.assignee.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/30">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          itemStatusMap[item.status as PlanItemStatus]?.className || ""
                        }`}
                      >
                        {itemStatusMap[item.status as PlanItemStatus]?.label || item.status}
                      </span>
                      <div className="flex items-center gap-3 w-[50%]">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${item.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-white shrink-0">{item.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {plan.childPlans.length > 0 && (
            <div className="glass rounded-xl p-6 space-y-3">
              <h3 className="text-base font-semibold text-white">被其他计划关联 ({plan.childPlans.length})</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {plan.childPlans.map((child) => (
                  <Link
                    key={child.id}
                    href={`/plans/${child.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-input/40 px-4 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div>
                      <span className="text-[10px] rounded bg-purple-500/20 px-1.5 py-0.5 font-semibold text-purple-400">
                        {typeLabels[child.type as PlanType]}
                      </span>
                      <span className="text-xs text-white font-medium ml-2 block sm:inline">{child.title}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-all transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">执行指标</h3>

            <div className="text-center py-4 space-y-2">
              <span className="text-4xl font-extrabold text-indigo-400">{plan.progress}%</span>
              <p className="text-xs text-muted-foreground">平均达成率</p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${plan.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center text-xs">
              <div>
                <div className="font-bold text-white">{plannedItems.length}</div>
                <div className="text-[10px] text-muted-foreground">计划内</div>
              </div>
              <div>
                <div className="font-bold text-amber-400">{unplannedItems.length}</div>
                <div className="text-[10px] text-muted-foreground">计划外</div>
              </div>
              <div>
                <div className="font-bold text-white">{unplannedShare}%</div>
                <div className="text-[10px] text-muted-foreground">计划外占比</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
              {plan.parentPlan && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">关联计划</span>
                  <Link
                    href={`/plans/${plan.parentPlan.id}`}
                    className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-[10px] text-indigo-400 font-bold">
                      [{typeLabels[plan.parentPlan.type as PlanType]}]
                    </span>
                    <span className="text-xs text-white font-medium block truncate mt-0.5">{plan.parentPlan.title}</span>
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">计划时间范围:</span>
                <span className="text-white font-medium">
                  {format(new Date(plan.startDate), "yyyy-MM-dd", { locale: zhCN })} 至{" "}
                  {format(new Date(plan.endDate), "yyyy-MM-dd", { locale: zhCN })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">制定人:</span>
                <span className="text-white font-medium">{plan.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">最新更新:</span>
                <span className="text-white font-medium">
                  {format(new Date(plan.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlanItemModal
        planId={plan.id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        users={users}
        projects={projects}
        requirements={requirements}
        productVersions={productVersions}
        editData={editItemData}
      />
    </div>
  );
}
