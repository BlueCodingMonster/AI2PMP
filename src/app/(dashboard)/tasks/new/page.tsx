import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";
import TaskForm from "@/components/tasks/task-form";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface NewTaskPageProps {
  searchParams: Promise<{
    projectId?: string;
    requirementId?: string;
    parentId?: string;
  }>;
}

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 并行获取项目与用户列表
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
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回任务看板
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">分解新任务</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          将需求或项目细化为具体的开发任务，并指派给对应开发人员跟进。
        </p>
      </div>

      <TaskForm
        projects={projects}
        users={users}
        prefilledProjectId={params.projectId}
        prefilledRequirementId={params.requirementId}
        prefilledParentId={params.parentId}
      />
    </div>
  );
}
