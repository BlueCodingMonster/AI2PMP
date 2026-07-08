import { getTasks } from "@/actions/tasks";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TaskBoardClient from "@/components/tasks/task-board-client";
import { CheckSquare } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 任务看板",
  description: "内部研发项目管理系统 - 任务管理",
};

interface TasksPageProps {
  searchParams: Promise<{
    projectId?: string;
    assigneeId?: string;
  }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;

  // 并行获取任务列表、项目列表、人员列表
  const [tasksResult, projectsResult, usersResult] = await Promise.all([
    getTasks({
      projectId: params.projectId,
      assigneeId: params.assigneeId,
    }),
    getProjectsList(),
    getAssignees(),
  ]);

  const tasks = tasksResult.success ? tasksResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">任务管理</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          通过任务看板实现敏捷拆单，支持跨列拖拽更新研发状态（待办、进行中、评审中、已完成）。
        </p>
      </div>

      {/* 任务看板与列表前端容器 */}
      <TaskBoardClient initialTasks={tasks} projects={projects} users={users} />
    </div>
  );
}
