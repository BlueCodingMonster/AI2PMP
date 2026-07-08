"use client";

import { useTransition } from "react";
import { deleteTask } from "@/actions/tasks";
import { Trash2, Edit2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActionsProps {
  taskId: string;
  projectId: string;
}

export default function TaskActions({ taskId, projectId }: ActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("确定要删除该任务吗？所有子任务也会随之删除！")) return;

    startTransition(async () => {
      try {
        const res = await deleteTask(taskId);
        if (res.success) {
          router.push("/tasks");
          router.refresh();
        } else {
          alert(res.error || "删除失败");
        }
      } catch (err) {
        console.error("删除任务出错:", err);
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Link
        href={`/tasks/new?projectId=${projectId}&parentId=${taskId}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
      >
        <Plus className="h-3.5 w-3.5" />
        添加子任务
      </Link>
      <Link
        href={`/tasks/${taskId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
      >
        <Edit2 className="h-3.5 w-3.5" />
        修改任务
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 py-1.5 px-3 text-xs font-medium text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除任务
      </button>
    </div>
  );
}
