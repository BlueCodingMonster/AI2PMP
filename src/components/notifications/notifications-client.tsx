"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { markAsRead, markAllAsRead } from "@/actions/notifications";
import { NotificationType } from "@prisma/client";
import {
  Bell,
  CheckCheck,
  Check,
  Calendar,
  CheckSquare,
  Bug,
  Info,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";

interface NotificationsProps {
  initialNotifications: any[];
}

const typeConfig: Record<NotificationType, { icon: any; className: string; label: string }> = {
  TASK_ASSIGNED: { icon: CheckSquare, className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", label: "任务指派" },
  TASK_UPDATED: { icon: CheckSquare, className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", label: "任务更新" },
  BUG_ASSIGNED: { icon: Bug, className: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "缺陷指派" },
  BUG_UPDATED: { icon: Bug, className: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "缺陷更新" },
  MENTION: { icon: Info, className: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "提及提及" },
  REQUIREMENT_UPDATED: { icon: Info, className: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "需求变动" },
  PLAN_PUBLISHED: { icon: Calendar, className: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "计划发布" },
  SYSTEM: { icon: Info, className: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "系统通知" },
};

export default function NotificationsClient({ initialNotifications }: NotificationsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      try {
        const res = await markAsRead(id);
        if (res.success) {
          router.refresh();
        }
      } catch (err) {
        console.error("标记已读错误:", err);
      }
    });
  };

  const handleMarkAllAsRead = () => {
    if (initialNotifications.filter(n => !n.isRead).length === 0) return;

    startTransition(async () => {
      try {
        const res = await markAllAsRead();
        if (res.success) {
          router.refresh();
        }
      } catch (err) {
        console.error("标记全部已读错误:", err);
      }
    });
  };

  const unreadCount = initialNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 text-xs sm:text-sm max-w-4xl mx-auto">
      {/* 头部快捷操作 */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">未读通知 ({unreadCount})</span>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          disabled={isPending || unreadCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-semibold text-white hover:bg-muted disabled:opacity-50 transition-all"
        >
          <CheckCheck className="h-3.5 w-3.5 text-indigo-400" />
          全部标记为已读
        </button>
      </div>

      {/* 通知列表 */}
      {initialNotifications.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-3" />
          你的通知收件箱空空如也。
        </div>
      ) : (
        <div className="space-y-3">
          {initialNotifications.map((notif) => {
            const config = typeConfig[notif.type as NotificationType] || {
              icon: Info,
              className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
              label: "通知",
            };
            const Icon = config.icon;
            const timeAgo = formatDistanceToNow(new Date(notif.createdAt), {
              addSuffix: true,
              locale: zhCN,
            });

            return (
              <div
                key={notif.id}
                className={`glass border rounded-xl p-4.5 transition-all flex items-start gap-4 ${
                  notif.isRead
                    ? "border-border/30 opacity-75"
                    : "border-indigo-500/20 bg-indigo-500/[0.02]"
                }`}
              >
                {/* 分类图标 */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${config.className}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* 核心内容 */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm">{notif.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-xs">{notif.content}</p>

                  {/* 关联详情链接 */}
                  {notif.linkUrl && (
                    <div className="pt-2">
                      <Link
                        href={notif.linkUrl}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        查看关联详情
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* 快捷标记已读按钮 */}
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    title="标记已读"
                    className="h-6 w-6 rounded-md hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white shrink-0 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
