import Link from "next/link";
import { getProjects } from "@/actions/projects";
import { ProjectStatus } from "@prisma/client";
import { Plus, FolderKanban, Users, Lightbulb, CheckSquare, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const statusMap: Record<ProjectStatus, { label: string; className: string }> = {
  PLANNING: { label: "规划中", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  ACTIVE: { label: "进行中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ON_HOLD: { label: "挂起", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  COMPLETED: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ARCHIVED: { label: "已归档", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default async function ProjectsPage() {
  const result = await getProjects();
  const projects = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">项目管理</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            查看和管理当前所有研发项目，跟踪各项目的需求拆解、任务执行与缺陷修复进度。
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500"
        >
          <Plus className="h-4 w-4" />
          创建新项目
        </Link>
      </div>

      {/* 项目列表格网 */}
      {projects.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
          暂无研发项目，请点击右上角{" "}
          <Link href="/projects/new" className="text-indigo-400 hover:underline">
            创建一个新项目
          </Link>
          。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusConfig = statusMap[project.status] || { label: project.status, className: "" };
            const memberCount = project.members.length;

            return (
              <div
                key={project.id}
                className="group glass rounded-xl border border-border/80 p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="space-y-4">
                  {/* 项目键与状态 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {project.key}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* 标题 */}
                  <div className="space-y-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors block"
                    >
                      {project.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      创建人: {project.createdBy.name}
                    </span>
                  </div>

                  {/* 描述 */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description || "暂无项目描述信息"}
                  </p>
                </div>

                {/* 团队与起止日期 */}
                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span>{memberCount} 个成员</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {project.startDate
                        ? format(new Date(project.startDate), "MM/dd", { locale: zhCN })
                        : "待定"}{" "}
                      -{" "}
                      {project.endDate
                        ? format(new Date(project.endDate), "MM/dd", { locale: zhCN })
                        : "待定"}
                    </span>
                  </div>
                </div>

                {/* 指标网格统计 */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/20 text-center">
                  <div className="bg-black/10 rounded-lg p-2">
                    <span className="text-sm font-bold text-white block">
                      {project._count.requirements}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <Lightbulb className="h-2.5 w-2.5 text-amber-400" />
                      需求
                    </span>
                  </div>
                  <div className="bg-black/10 rounded-lg p-2">
                    <span className="text-sm font-bold text-white block">
                      {project._count.tasks}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <CheckSquare className="h-2.5 w-2.5 text-indigo-400" />
                      任务
                    </span>
                  </div>
                  <div className="bg-black/10 rounded-lg p-2">
                    <span className="text-sm font-bold text-white block">
                      {project._count.bugs}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                      缺陷
                    </span>
                  </div>
                </div>

                <Link
                  href={`/projects/${project.id}`}
                  className="mt-4 inline-flex items-center justify-center gap-1 w-full rounded-lg bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  进入项目空间
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
