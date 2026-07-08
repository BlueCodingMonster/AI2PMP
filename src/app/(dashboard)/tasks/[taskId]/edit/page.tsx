import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckSquare } from "lucide-react";
import TaskForm from "@/components/tasks/task-form";
import { getTaskById } from "@/actions/tasks";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";

interface EditTaskPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { taskId } = await params;

  // 并行获取当前任务详情、所有项目与用户选项
  const [taskResult, projectsResult, usersResult] = await Promise.all([
    getTaskById(taskId),
    getProjectsList(),
    getAssignees(),
  ]);

  if (!taskResult.success || !taskResult.data) {
    notFound();
  }

  const task = taskResult.data;
  const projects = projectsResult.success ? projectsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  // 格式化初始数据
  const initialData = {
    id: task.id,
    title: task.title,
    description: task.description || "",
    projectId: task.projectId,
    requirementId: task.requirementId || "",
    parentId: task.parentId || "",
    assigneeId: task.assigneeId || "",
    status: task.status,
    priority: task.priority,
    type: task.type,
    startDate: task.startDate,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href={`/tasks/${task.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回任务详情
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">修改任务详情</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          调整任务名称、描述、起止时间或指派开发负责人。
        </p>
      </div>

      <TaskForm projects={projects} users={users} initialData={initialData} />
    </div>
  );
}
