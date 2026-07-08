import { getBugs } from "@/actions/bugs";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BugListClient from "@/components/bugs/bug-list-client";
import { Bug } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 缺陷跟踪",
  description: "内部研发项目管理系统 - 缺陷管理",
};

interface BugsPageProps {
  searchParams: Promise<{
    projectId?: string;
    assigneeId?: string;
  }>;
}

export default async function BugsPage({ searchParams }: BugsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;

  // 并行获取缺陷列表、项目列表、人员列表
  const [bugsResult, projectsResult, usersResult] = await Promise.all([
    getBugs({
      projectId: params.projectId,
      assigneeId: params.assigneeId,
    }),
    getProjectsList(),
    getAssignees(),
  ]);

  const bugs = bugsResult.success ? bugsResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bug className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">缺陷跟踪</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          记录和跟进系统发现的问题，划分缺陷级别（崩溃、严重、主要、次要、轻微），实施闭环修复。
        </p>
      </div>

      {/* 缺陷列表前端容器 */}
      <BugListClient initialBugs={bugs} projects={projects} users={users} />
    </div>
  );
}
