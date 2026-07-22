import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/layout/dashboard-layout-client";

export const metadata = {
  title: "SDLC · 仪表盘",
  description: "SDLC · 研发效能平台 - 工作台",
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
    <DashboardLayoutClient user={safeUser}>
      {children}
    </DashboardLayoutClient>
  );
}
