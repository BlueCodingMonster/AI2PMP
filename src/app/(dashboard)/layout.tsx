import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUnreadCount } from "@/actions/notifications";
import DashboardLayoutClient from "@/components/layout/dashboard-layout-client";

export const metadata = {
  title: "AI2PmP - 仪表盘",
  description: "内部研发项目管理系统 - 工作台",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  // 如果未登录，直接在服务端重定向，避免客户端闪烁
  if (!session?.user) {
    redirect("/login");
  }

  // 获取初始未读通知数量
  const unreadRes = await getUnreadCount();
  const initialUnread = unreadRes.success ? unreadRes.data : 0;

  // 构建传递给客户端的安全 User 对象
  const safeUser = {
    id: session.user.id || "",
    name: session.user.name || "管理员",
    username: session.user.username || "admin",
    email: session.user.email || null,
    image: session.user.image || null,
    isAdmin: session.user.isAdmin || false,
  };

  return (
    <DashboardLayoutClient user={safeUser} initialUnreadCount={initialUnread}>
      {children}
    </DashboardLayoutClient>
  );
}
