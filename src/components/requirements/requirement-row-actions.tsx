"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteRequirement } from "@/actions/requirements";

export default function RequirementRowActions({ requirementId, requirementTitle }: { requirementId: string; requirementTitle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!window.confirm(`确认删除需求“${requirementTitle}”吗？此操作不可恢复。`)) return;
    startTransition(async () => {
      const result = await deleteRequirement(requirementId);
      if (!result.success) return window.alert(result.error ?? "删除需求失败");
      router.refresh();
    });
  };

  const linkClass = "inline-flex items-center gap-1 rounded-md border border-border bg-input px-2 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/10";

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Link href={`/requirements/${requirementId}`} className={linkClass}><Eye className="h-3 w-3" />查看</Link>
      <Link href={`/requirements/${requirementId}/edit`} className={linkClass}><Pencil className="h-3 w-3" />编辑</Link>
      <button type="button" disabled={pending} onClick={remove} className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/[0.06] px-2 py-1.5 text-[11px] font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}删除
      </button>
    </div>
  );
}
