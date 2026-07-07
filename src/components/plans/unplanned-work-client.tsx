"use client";

import Link from "next/link";
import { PlanningTreatment, PlanItemStatus, WorkItemType } from "@prisma/client";
import { AlertTriangle, ExternalLink } from "lucide-react";

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

const treatmentLabels: Record<PlanningTreatment, string> = {
  NOT_INCLUDED: "不纳入计划，仅记录",
  ADD_TO_CURRENT: "补入当前月度计划",
  MOVE_TO_NEXT: "转入下个月度计划",
  LINK_EXISTING_ITEM: "关联到已有工作项",
};

const statusLabels: Record<PlanItemStatus, string> = {
  TODO: "待办",
  IN_PROGRESS: "进行中",
  DONE: "已完成",
  CANCELLED: "已取消",
};

type UnplannedItem = {
  id: string;
  title: string;
  description?: string | null;
  type: WorkItemType;
  planningTreatment?: PlanningTreatment | null;
  status: PlanItemStatus;
  progress: number;
  productLineTeam?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
  project?: { id: string; name: string; key: string } | null;
  productVersion?: {
    title: string;
    version: string;
    productModule: { name: string; productPlatform: { name: string } };
  } | null;
};

export default function UnplannedWorkClient({ items }: { items: UnplannedItem[] }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">计划外工作池</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            记录临时需求、线上问题、市场支撑和其他未进入月度计划的实际工作。
          </p>
        </div>
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input px-3 py-2 text-xs font-medium text-white hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          返回计划
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">计划外工作项</div>
          <div className="mt-2 text-2xl font-bold text-white">{items.length}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">进行中</div>
          <div className="mt-2 text-2xl font-bold text-indigo-400">
            {items.filter((item) => item.status === "IN_PROGRESS").length}
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground">已完成</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {items.filter((item) => item.status === "DONE").length}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">当前没有计划外工作记录。</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-400 border border-amber-500/20">
                    计划外
                  </span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-400 border border-indigo-500/20">
                    {workItemTypeLabels[item.type]}
                  </span>
                  {item.planningTreatment && (
                    <span className="rounded bg-muted/40 px-2 py-0.5 text-muted-foreground">
                      {treatmentLabels[item.planningTreatment]}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                  {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {item.productLineTeam && <span>产品线：{item.productLineTeam.name}</span>}
                  {item.assignee && <span>负责人：{item.assignee.name}</span>}
                  {item.project && <span>项目：[{item.project.key}] {item.project.name}</span>}
                  {item.productVersion && (
                    <span>
                      版本：{item.productVersion.productModule.productPlatform.name} / {item.productVersion.productModule.name} / {item.productVersion.version}
                    </span>
                  )}
                  <span>状态：{statusLabels[item.status]}</span>
                  <span>进度：{item.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
