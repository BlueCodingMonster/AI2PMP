import Link from "next/link";
import { ArrowLeft, Bug } from "lucide-react";
import BugForm from "@/components/bugs/bug-form";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface NewBugPageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function NewBugPage({ searchParams }: NewBugPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [projectsResult, usersResult] = await Promise.all([
    getProjectsList(),
    getAssignees(),
  ]);

  const projects = projectsResult.success ? projectsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  const params = await searchParams;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href="/bugs"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回缺陷列表
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bug className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">提交 Bug 缺陷</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          记录在开发、集成或线上环境中发现的程序缺陷，详细描述复现步骤。
        </p>
      </div>

      <BugForm projects={projects} users={users} prefilledProjectId={params.projectId} />
    </div>
  );
}
