"use client";

import { useState, useTransition } from "react";
import { addTaskComment } from "@/actions/tasks";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface CommentsProps {
  taskId: string;
  comments: any[];
}

export default function TaskComments({ taskId, comments }: CommentsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) return;

    startTransition(async () => {
      try {
        const res = await addTaskComment(taskId, content.trim());
        if (res.success) {
          setContent("");
          router.refresh();
        } else {
          setError(res.error || "评论失败，请重试");
        }
      } catch (err) {
        console.error("提交评论失败:", err);
        setError("系统错误，请重试");
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white flex items-center gap-1.5 border-b border-border/60 pb-3">
        <MessageSquare className="h-4 w-4 text-indigo-400" />
        讨论与开发记录 ({comments.length})
      </h3>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 发表讨论表单 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="发表你的开发进展或疑问讨论..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-lg border border-border bg-input py-2 px-4 text-xs text-white placeholder-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          发送
        </button>
      </form>

      {/* 讨论列表 */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          当前暂无讨论记录，输入进展发表第一条进展吧！
        </p>
      ) : (
        <div className="space-y-3.5 pt-2">
          {comments.map((comment) => {
            const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: zhCN,
            });

            return (
              <div
                key={comment.id}
                className="bg-black/10 border border-border/30 rounded-xl p-3.5 space-y-2 hover:border-border/60 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{comment.author.name}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
