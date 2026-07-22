import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuditLogs } from "@/actions/audit-logs";
import AuditLogsClient from "@/components/system/audit-logs-client";

interface PageProps {
  searchParams: Promise<{
    query?: string;
    module?: string;
    page?: string;
  }>;
}

export default async function AuditLogsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. 获取完整用户资料以校验权限（仅系统管理员和部门经理有权看审计日志）
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, username: true, isAdmin: true, level: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const isSystemAdmin = dbUser.isAdmin;
  const isDeptManager = dbUser.level === "部门经理";

  if (!isSystemAdmin && !isDeptManager) {
    // 权限不足，重定向到仪表盘主页
    redirect("/");
  }

  // 2. 解析查询参数
  const query = searchParams.query || "";
  const moduleParam = searchParams.module || "ALL";
  const pageNum = parseInt(searchParams.page || "1", 10);

  // 3. 服务端获取审计日志数据
  const result = await getAuditLogs({
    page: pageNum,
    limit: 15,
    query,
    module: moduleParam,
  });

  const emptyData = {
    logs: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
  };

  const initialData = result.success && result.data ? result.data : emptyData;

  const currentUser = {
    id: dbUser.id,
    name: dbUser.name,
    username: dbUser.username,
    isAdmin: dbUser.isAdmin,
  };

  return (
    <AuditLogsClient
      initialData={initialData}
      currentUser={currentUser}
    />
  );
}
