import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTaskById } from "@/actions/tasks";
import { getTimeLogsForTask } from "@/actions/timelogs";
import { auth } from "@/lib/auth";
import { TaskStatus, Priority, TaskType } from "@prisma/client";
import { ArrowLeft, Calendar, FileText, CheckSquare, Shield, Clock, ChevronRight } from "lucide-react";
import TaskActions from "@/components/tasks/task-actions";
import TaskComments from "@/components/tasks/task-comments";
import TaskTimeLogs from "@/components/tasks/task-timelogs";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

const statusLabels: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: "待办", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  IN_REVIEW: { label: "评审中", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  DONE: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "已取消", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const priorityLabels: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "紧急", className: "bg-red-500/15 text-red-400" },
  HIGH: { label: "高", className: "bg-orange-500/15 text-orange-400" },
  MEDIUM: { label: "中", className: "bg-blue-500/15 text-blue-400" },
  LOW: { label: "低", className: "bg-gray-500/15 text-gray-400" },
};

const typeLabels: Record<TaskType, { label: string; className: string }> = {
  FEATURE: { label: "功能开发", className: "bg-indigo-500/10 text-indigo-400" },
  IMPROVEMENT: { label: "持续改进", className: "bg-sky-500/10 text-sky-400" },
  TASK: { label: "开发任务", className: "bg-teal-500/10 text-teal-400" },
  SUBTASK: { label: "子开发任务", className: "bg-pink-500/10 text-pink-400" },
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { taskId } = await params;
  const [result, logsResult] = await Promise.all([
    getTaskById(taskId),
    getTimeLogsForTask(taskId),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const logs = logsResult.success ? logsResult.data : [];

  const task = result.data;
  const statusConfig = statusLabels[task.status];
  const priorityConfig = priorityLabels[task.priority];
  const typeConfig = typeLabels[task.type];

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* 头部面包屑与快捷操作 */}
      <div className="flex items-center justify-between">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回任务看板
        </Link>

        {/* 任务交互按钮组件 */}
        <TaskActions taskId={task.id} projectId={task.projectId} />
      </div>

      {/* 任务核心标题 */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            {task.project.key}-{task.id.slice(0, 4).toUpperCase()}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold border ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${priorityConfig.className}`}
          >
            {priorityConfig.label}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${typeConfig.className}`}
          >
            {typeConfig.label}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{task.title}</h1>
      </div>

      {/* 左右分栏 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧主内容 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 描述说明 */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white">任务描述</h3>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {task.description || <span className="italic">该任务暂无详细实现描述说明</span>}
            </div>
          </div>

          {/* 关联需求池需求 */}
          {task.requirement && (
            <div className="glass rounded-xl p-6 space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                关联的产品需求
              </h3>
              <div className="flex items-center justify-between bg-black/10 rounded-lg p-3 border border-border/30">
                <span className="font-medium text-white">{task.requirement.title}</span>
                <Link
                  href={`/requirements/${task.requirement.id}`}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  前往需求详情
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* 子任务拆解 */}
          {task.type !== TaskType.SUBTASK && (
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-indigo-400" />
                  子开发任务清单 ({task.children.length})
                </h3>
                <Link
                  href={`/tasks/new?projectId=${task.projectId}&parentId=${task.id}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  添加子任务
                </Link>
              </div>

              {task.children.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  该任务暂未拆解子任务，可通过上级结构快速规划细节。
                </p>
              ) : (
                <div className="space-y-3">
                  {task.children.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between bg-black/10 rounded-lg p-3 border border-border/30 hover:border-border/60 transition-all text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/tasks/${sub.id}`}
                          className="font-semibold text-white hover:text-indigo-300 transition-colors block truncate"
                        >
                          {sub.title}
                        </Link>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          指派人: {sub.assignee?.name || "未分配"}
                        </p>
                      </div>
                      <span className="rounded px-2 py-0.5 bg-gray-500/10 text-muted-foreground border border-border/40 shrink-0">
                        {statusLabels[sub.status as TaskStatus]?.label || sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 讨论区（评论） */}
          <div className="glass rounded-xl p-6">
            <TaskComments taskId={task.id} comments={task.comments} />
          </div>
        </div>

        {/* 右侧：属性面板 */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-border/60 pb-3">
              <Clock className="h-4 w-4 text-indigo-400" />
              任务基本属性
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* 所属项目 */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase">所属项目</span>
                <Link
                  href={`/projects/${task.project.id}`}
                  className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors font-medium text-white"
                >
                  [{task.project.key}] {task.project.name}
                </Link>
              </div>

              {/* 如果是子任务，显示父级任务链接 */}
              {task.parent && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">隶属父任务</span>
                  <Link
                    href={`/tasks/${task.parent.id}`}
                    className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors font-medium text-white truncate"
                  >
                    [{statusLabels[task.parent.status as TaskStatus]?.label}] {task.parent.title}
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-muted-foreground">负责人:</span>
                <span className="text-white font-medium">{task.assignee?.name || "未指派"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">创建人:</span>
                <span className="text-white font-medium">{task.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">预估工时:</span>
                <span className="text-white font-medium">
                  {task.estimatedHours ? `${task.estimatedHours} 小时` : "未设定工时"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">计划时间:</span>
                <span className="text-white font-medium">
                  {task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd", { locale: zhCN }) : "待定"}{" "}
                  至{" "}
                  {task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd", { locale: zhCN }) : "待定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">最后更新:</span>
                <span className="text-white font-medium">
                  {format(new Date(task.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>

          {/* 工时登账记录 */}
          <TaskTimeLogs taskId={task.id} initialLogs={logs} />
        </div>
      </div>
    </div>
  );
}
