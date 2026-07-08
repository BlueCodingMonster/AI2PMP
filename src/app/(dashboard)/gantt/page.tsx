import { getTasks } from "@/actions/tasks";
import { getProjectsList } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GanttClient from "@/components/gantt/gantt-client";
import { CalendarRange } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 甘特图",
  description: "内部研发项目管理系统 - 项目时间线与进度甘特图",
};

export default async function GanttPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 获取所有任务以及项目列表
  const [tasksResult, projectsResult] = await Promise.all([
    getTasks(),
    getProjectsList(),
  ]);

  const tasks = tasksResult.success ? tasksResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CalendarRange className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">研发甘特图</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          直观的图形化时间轴视图，展示项目的排期规划，并支持在左侧侧栏快捷穿透详情。
        </p>
      </div>

      {/* 甘特图交互客户端组件 */}
      <GanttClient tasks={tasks} projects={projects} />
    </div>
  );
}
