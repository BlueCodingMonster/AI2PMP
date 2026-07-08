"use client";

import { useState, useTransition } from "react";
import { changeRequirementStatus } from "@/actions/requirements";
import { RequirementStatus } from "@prisma/client";
import { Loader2, Play, CheckCircle2, XCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface StatusFlowProps {
  requirementId: string;
  currentStatus: RequirementStatus;
  isAdmin: boolean;
}

const statusLabels: Record<RequirementStatus, string> = {
  DRAFT: "草稿",
  UNDER_REVIEW: "评审中",
  APPROVED: "已批准",
  PLANNED: "已排期",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  REJECTED: "已拒绝",
  DEFERRED: "已延期",
};

export default function StatusFlow({ requirementId, currentStatus, isAdmin }: StatusFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = (newStatus: RequirementStatus) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await changeRequirementStatus(requirementId, newStatus);
        if (!res.success) {
          setError(res.error || "状态更新失败");
          return;
        }
        router.refresh();
      } catch (err) {
        console.error("更新状态出错:", err);
        setError("操作失败，请重试");
      }
    });
  };

  // 根据当前状态计算可流转的下一步状态
  const getNextActions = (): { status: RequirementStatus; label: string; className: string; icon: any }[] => {
    switch (currentStatus) {
      case "DRAFT":
        return [
          {
            status: RequirementStatus.UNDER_REVIEW,
            label: "提交评审",
            className: "bg-amber-600 hover:bg-amber-500 text-white",
            icon: Clock,
          },
        ];
      case "UNDER_REVIEW":
        return [
          {
            status: RequirementStatus.APPROVED,
            label: "批准通过",
            className: "bg-indigo-600 hover:bg-indigo-500 text-white",
            icon: CheckCircle2,
          },
          {
            status: RequirementStatus.REJECTED,
            label: "驳回需求",
            className: "bg-rose-600 hover:bg-rose-500 text-white",
            icon: XCircle,
          },
        ];
      case "APPROVED":
        return [
          {
            status: RequirementStatus.PLANNED,
            label: "纳入计划",
            className: "bg-purple-600 hover:bg-purple-500 text-white",
            icon: ArrowRight,
          },
          {
            status: RequirementStatus.DEFERRED,
            label: "延期搁置",
            className: "bg-slate-600 hover:bg-slate-500 text-white",
            icon: Clock,
          },
        ];
      case "PLANNED":
      case "DEFERRED":
        return [
          {
            status: RequirementStatus.IN_PROGRESS,
            label: "开始实施",
            className: "bg-blue-600 hover:bg-blue-500 text-white",
            icon: Play,
          },
        ];
      case "IN_PROGRESS":
        return [
          {
            status: RequirementStatus.COMPLETED,
            label: "验收完成",
            className: "bg-emerald-600 hover:bg-emerald-500 text-white",
            icon: CheckCircle2,
          },
        ];
      case "REJECTED":
      case "COMPLETED":
        return [
          {
            status: RequirementStatus.DRAFT,
            label: "重开/修改",
            className: "bg-gray-600 hover:bg-gray-500 text-white",
            icon: RefreshCw,
          },
        ];
      default:
        return [];
    }
  };

  const nextActions = getNextActions();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">当前状态:</span>
          <span className="inline-flex items-center rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            {statusLabels[currentStatus] || currentStatus}
          </span>
        </div>

        {/* 流转按钮 */}
        <div className="flex gap-2">
          {isPending ? (
            <div className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              正在更新...
            </div>
          ) : (
            nextActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.status}
                  onClick={() => handleStatusChange(action.status)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-medium transition-all shadow-md ${action.className}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })
          )}
        </div>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
