import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { getMembers } from "@/actions/team";
import { auth } from "@/lib/auth";
import { ProjectStatus } from "@prisma/client";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Folder,
  Lightbulb,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import ProjectMembers from "@/components/projects/project-members";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

const statusMap: Record<ProjectStatus, { label: string; className: string }> = {
  PLANNING: { label: "规划中", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  ACTIVE: { label: "进行中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ON_HOLD: { label: "挂起", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  COMPLETED: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ARCHIVED: { label: "已归档", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;

  // 并行获取项目详情及所有用户选项
  const [projectResult, allUsersResult] = await Promise.all([
    getProjectById(projectId),
    getMembers(),
  ]);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;
  const allUsers = allUsersResult.success ? allUsersResult.data : [];

  const statusConfig = statusMap[project.status] || { label: project.status, className: "" };

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* 头部面包屑与操作 */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回项目列表
        </Link>

        <Link
          href={`/projects/${project.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
        >
          <Edit2 className="h-3.5 w-3.5" />
          编辑项目设置
        </Link>
      </div>

      {/* 项目头部卡片 */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            {project.key}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{project.name}</h1>
        {project.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>
        )}
      </div>

      {/* 左右分栏 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧：子版块 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. 关联需求 */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                关联需求池列表 ({project.requirements.length})
              </h3>
              <Link
                href="/requirements"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                前往需求池池
              </Link>
            </div>

            {project.requirements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                该项目尚未关联任何需求池中的需求。
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-medium">
                      <th className="pb-2">需求标题</th>
                      <th className="pb-2">类型</th>
                      <th className="pb-2">优先级</th>
                      <th className="pb-2">状态</th>
                      <th className="pb-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {project.requirements.map((req) => (
                      <tr key={req.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="py-2.5 font-medium text-white truncate max-w-[200px]">
                          {req.title}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {req.type === "FUNCTIONAL" ? "功能" : "技术"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">{req.priority}</td>
                        <td className="py-2.5">
                          <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400">
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/requirements/${req.id}`}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5"
                          >
                            查看详情
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. 项目开发任务 */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-400" />
                拆解开发任务 ({project.tasks.length})
              </h3>
              <Link
                href="/tasks"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                前往我的任务
              </Link>
            </div>

            {project.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                该项目尚未创建开发任务，可在任务面板进行看板拆解。
              </p>
            ) : (
              <div className="space-y-2">
                {project.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-black/10 rounded-lg p-2.5 border border-border/30 text-xs"
                  >
                    <span className="font-semibold text-white truncate max-w-[250px]">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-gray-500/15 text-muted-foreground px-1.5 py-0.5 rounded">
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
                {project.tasks.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-2">
                    仅展示最新 5 条，更多请前往任务看板。
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. 关联 Bug */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Bug 缺陷跟踪 ({project.bugs.length})
              </h3>
              <Link
                href="/bugs"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                前往缺陷管理
              </Link>
            </div>

            {project.bugs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                项目当前状态良好，未录入任何活动 Bug。
              </p>
            ) : (
              <div className="space-y-2">
                {project.bugs.slice(0, 5).map((bug) => (
                  <div
                    key={bug.id}
                    className="flex items-center justify-between bg-black/10 rounded-lg p-2.5 border border-border/30 text-xs"
                  >
                    <span className="font-semibold text-white truncate max-w-[250px]">
                      {bug.title}
                    </span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                      {bug.status}
                    </span>
                  </div>
                ))}
                {project.bugs.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-2">
                    仅展示最新 5 条，更多请前往缺陷面板。
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：统计属性卡片 + 团队成员 */}
        <div className="space-y-6">
          {/* 项目基本信息指标 */}
          <div className="glass rounded-xl p-6 space-y-3.5 text-xs">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1">
              <Folder className="h-4 w-4 text-indigo-400" />
              项目概要指标
            </h3>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">起止日期:</span>
                <span className="text-white font-medium">
                  {project.startDate
                    ? format(new Date(project.startDate), "yyyy-MM-dd", { locale: zhCN })
                    : "待定"}{" "}
                  至{" "}
                  {project.endDate
                    ? format(new Date(project.endDate), "yyyy-MM-dd", { locale: zhCN })
                    : "待定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">创建人:</span>
                <span className="text-white font-medium">{project.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">创建时间:</span>
                <span className="text-white font-medium">
                  {format(new Date(project.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>

          {/* 团队成员管理组件（Client Component） */}
          <ProjectMembers
            projectId={project.id}
            currentMembers={project.members}
            allUsers={allUsers}
          />
        </div>
      </div>
    </div>
  );
}
