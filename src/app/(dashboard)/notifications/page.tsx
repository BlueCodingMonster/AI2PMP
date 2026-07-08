import { getNotifications } from "@/actions/notifications";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationsClient from "@/components/notifications/notifications-client";
import { Bell } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 通知中心",
  description: "内部研发项目管理系统 - 个人通知与协同消息",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getNotifications();
  const notifications = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bell className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">通知中心</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看与你开发相关的任务指派、状态变更、缺陷分派及协同记录，保障高效沟通与即时反馈。
        </p>
      </div>

      {/* 消息通知前端展示 */}
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
