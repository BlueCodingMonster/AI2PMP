"use client";

import { useTransition } from "react";
import { deleteBug, changeBugStatus } from "@/actions/bugs";
import { BugStatus } from "@prisma/client";
import { Trash2, Edit2, CheckCircle2, Play, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActionsProps {
  bugId: string;
  status: BugStatus;
}

export default function BugActions({ bugId, status }: ActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("确定要删除该缺陷记录吗？")) return;

    startTransition(async () => {
      try {
        const res = await deleteBug(bugId);
        if (res.success) {
          router.push("/bugs");
          router.refresh();
        } else {
          alert(res.error || "删除失败");
        }
      } catch (err) {
        console.error("删除缺陷出错:", err);
      }
    });
  };

  const handleStatusChange = (newStatus: BugStatus) => {
    startTransition(async () => {
      try {
        const res = await changeBugStatus(bugId, newStatus);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "流转状态失败");
        }
      } catch (err) {
        console.error("流转状态出错:", err);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 justify-between w-full border-b border-border/40 pb-4">
      {/* 状态流转操作区 */}
      <div className="flex flex-wrap gap-2">
        {status === BugStatus.OPEN && (
          <>
            <button
              onClick={() => handleStatusChange(BugStatus.CONFIRMED)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/90 py-1.5 px-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              确认缺陷
            </button>
            <button
              onClick={() => handleStatusChange(BugStatus.IN_PROGRESS)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/90 py-1.5 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              开始修复
            </button>
            <button
              onClick={() => handleStatusChange(BugStatus.WONT_FIX)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-semibold text-muted-foreground hover:text-white disabled:opacity-50"
            >
              不予修复
            </button>
          </>
        )}

        {status === BugStatus.CONFIRMED && (
          <button
            onClick={() => handleStatusChange(BugStatus.IN_PROGRESS)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/90 py-1.5 px-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            开始修复
          </button>
        )}

        {status === BugStatus.IN_PROGRESS && (
          <button
            onClick={() => handleStatusChange(BugStatus.FIXED)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 py-1.5 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            标记为已修复
          </button>
        )}

        {status === BugStatus.FIXED && (
          <>
            <button
              onClick={() => handleStatusChange(BugStatus.CLOSED)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 py-1.5 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              验证并通过 (关闭)
            </button>
            <button
              onClick={() => handleStatusChange(BugStatus.OPEN)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 py-1.5 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-600 hover:text-white disabled:opacity-50"
            >
              重新打开 (Open)
            </button>
          </>
        )}

        {(status === BugStatus.CLOSED || status === BugStatus.WONT_FIX) && (
          <button
            onClick={() => handleStatusChange(BugStatus.OPEN)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 py-1.5 px-3 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新打开缺陷
          </button>
        )}
      </div>

      {/* 编辑与删除 */}
      <div className="flex gap-2">
        <Link
          href={`/bugs/${bugId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
        >
          <Edit2 className="h-3.5 w-3.5" />
          修改设置
        </Link>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 py-1.5 px-3 text-xs font-medium text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除缺陷
        </button>
      </div>
    </div>
  );
}
