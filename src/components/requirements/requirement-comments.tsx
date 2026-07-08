"use client";

import { useState, useTransition } from "react";
import { addRequirementComment } from "@/actions/requirements";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Loader2, MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface RequirementCommentsProps {
  requirementId: string;
  initialComments: Comment[];
  currentUserId: string;
}

export default function RequirementComments({
  requirementId,
  initialComments,
  currentUserId,
}: RequirementCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setError(null);

    startTransition(async () => {
      try {
        const res = await addRequirementComment(requirementId, newComment);

        if (!res.success) {
          setError(res.error || "发布评论失败");
          return;
        }

        // 本地追加新评论
        const commentData = res.data as Comment;
        setComments((prev) => [commentData, ...prev]);
        setNewComment("");
      } catch (err) {
        console.error("发表评论出错:", err);
        setError("发表评论出错，请重试");
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-white flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-400" />
        讨论与备注 ({comments.length})
      </h3>

      {/* 发表评论表单 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            rows={3}
            required
            placeholder="写下你的反馈或提出修改意见（支持 Markdown 语法）..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 pr-12 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={isPending || !newComment.trim()}
            className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </form>

      {/* 评论列表 */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">暂无讨论内容。第一个发表意见吧！</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 text-sm border-b border-border/30 pb-3 last:border-0 last:pb-0">
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-medium text-indigo-400">
                {comment.author.name.slice(0, 2)}
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs">{comment.author.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
                <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
