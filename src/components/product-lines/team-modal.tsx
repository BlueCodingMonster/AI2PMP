"use client";

import { useState, useTransition } from "react";
import { createProductLineTeam, updateProductLineTeam } from "@/actions/product-lines";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any; // 如果是编辑模式，传入当前小组信息
}

export default function TeamModal({ isOpen, onClose, initialData }: TeamModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("请输入小组名称");
      return;
    }

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          res = await updateProductLineTeam(initialData.id, {
            name: name.trim(),
            description: description.trim() || null,
          });
        } else {
          res = await createProductLineTeam({
            name: name.trim(),
            description: description.trim() || null,
          });
        }

        if (res.success) {
          onClose();
          router.refresh();
        } else {
          setError(res.error || "操作失败，请重试");
        }
      } catch (err) {
        console.error("保存小组错误:", err);
        setError("系统错误，请重试");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl space-y-4">
        {/* 头 */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-base font-bold text-white">
            {isEditMode ? "修改产品线小组配置" : "成立产品线小组"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* 名称 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">产品线小组名称 *</label>
            <input
              type="text"
              required
              placeholder="例如: 大模型应用产品线、BI 报表研发小组"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:outline-none focus:border-primary text-xs"
            />
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">产品线核心职责描述</label>
            <textarea
              rows={4}
              placeholder="简述该产品线小组的主要研发方向与承接的业务模块..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:outline-none focus:border-primary text-xs resize-none"
            />
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-input py-2 px-4 text-xs font-medium text-white hover:bg-muted"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
