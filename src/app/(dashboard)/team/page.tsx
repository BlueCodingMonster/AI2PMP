import { getMembers } from "@/actions/team";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamClient from "@/components/team/team-client";
import { Users } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 团队管理",
  description: "内部研发项目管理系统 - 团队管理",
};

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getMembers();
  const members = result.success ? result.data : [];

  const currentUser = {
    id: session.user.id,
    isAdmin: session.user.isAdmin || false,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">团队管理</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看和录入系统内所有的研发、设计、产品和测试成员，管理系统授权以及各成员的负载指标。
        </p>
      </div>

      {/* 团队前端容器 */}
      <TeamClient members={members} currentUser={currentUser} />
    </div>
  );
}
