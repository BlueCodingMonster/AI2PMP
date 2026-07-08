import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBugById } from "@/actions/bugs";
import { auth } from "@/lib/auth";
import { BugStatus, BugSeverity, Priority } from "@prisma/client";
import { ArrowLeft, Monitor, FileText, ClipboardList, ShieldAlert, Calendar } from "lucide-react";
import BugActions from "@/components/bugs/bug-actions";
import BugComments from "@/components/bugs/bug-comments";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface BugDetailPageProps {
  params: Promise<{
    bugId: string;
  }>;
}

const statusLabels: Record<BugStatus, { label: string; className: string }> = {
  OPEN: { label: "新建 (Open)", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  CONFIRMED: { label: "已确认", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  IN_PROGRESS: { label: "修复中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  FIXED: { label: "已修复", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  CLOSED: { label: "已关闭", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  WONT_FIX: { label: "不予修复", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const severityLabels: Record<BugSeverity, { label: string; className: string }> = {
  BLOCKER: { label: "崩溃 (Blocker)", className: "bg-red-600 text-white font-bold" },
  CRITICAL: { label: "严重 (Critical)", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
  MAJOR: { label: "主要 (Major)", className: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  MINOR: { label: "次要 (Minor)", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  TRIVIAL: { label: "轻微 (Trivial)", className: "bg-gray-500/20 text-gray-400 border border-gray-500/30" },
};

const priorityLabels: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "紧急", className: "bg-red-500/15 text-red-400" },
  HIGH: { label: "高", className: "bg-orange-500/15 text-orange-400" },
  MEDIUM: { label: "中", className: "bg-blue-500/15 text-blue-400" },
  LOW: { label: "低", className: "bg-gray-500/15 text-gray-400" },
};

export default async function BugDetailPage({ params }: BugDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { bugId } = await params;
  const result = await getBugById(bugId);

  if (!result.success || !result.data) {
    notFound();
  }

  const bug = result.data;
  const statusConfig = statusLabels[bug.status];
  const severityConfig = severityLabels[bug.severity];
  const priorityConfig = priorityLabels[bug.priority];

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* 头部面包屑与状态流转区 */}
      <div className="space-y-4">
        <Link
          href="/bugs"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回缺陷列表
        </Link>

        {/* 缺陷流转及快捷动作 */}
        <BugActions bugId={bug.id} status={bug.status} />
      </div>

      {/* 缺陷核心标题 */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            {bug.project.key}-BUG-{bug.id.slice(0, 4).toUpperCase()}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
          <span
            className={`inline-flex items-center rounded px-2.5 py-0.5 text-[9px] font-bold uppercase ${severityConfig.className}`}
          >
            {severityConfig.label}
          </span>
          <span
            className={`inline-flex items-center rounded px-2.5 py-0.5 text-[9px] font-bold ${priorityConfig.className}`}
          >
            {priorityConfig.label}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{bug.title}</h1>
      </div>

      {/* 左右分栏 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧主面板 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 重现步骤 */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-border/60 pb-3">
              <ClipboardList className="h-4 w-4 text-rose-400" />
              缺陷重现步骤
            </h3>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-black/20 rounded-lg p-4 border border-border/30">
              {bug.stepsToReproduce || <span className="italic">该缺陷暂无录入重现步骤</span>}
            </div>
          </div>

          {/* 详细描述 */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              缺陷详细描述/堆栈日志
            </h3>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {bug.description || <span className="italic">该缺陷暂无其他描述说明</span>}
            </div>
          </div>

          {/* 讨论回复记录 */}
          <div className="glass rounded-xl p-6">
            <BugComments bugId={bug.id} comments={bug.comments} />
          </div>
        </div>

        {/* 右侧：属性概要 */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-border/60 pb-3">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              缺陷基本属性
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* 所属项目 */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase">所属项目</span>
                <Link
                  href={`/projects/${bug.project.id}`}
                  className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors font-medium text-white"
                >
                  [{bug.project.key}] {bug.project.name}
                </Link>
              </div>

              {/* 运行测试环境 */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <Monitor className="h-3 w-3 text-sky-400" />
                  测试环境
                </span>
                <div className="rounded-lg border border-border bg-input/40 px-3 py-2 text-white font-medium">
                  {bug.environment || "未设定环境信息"}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-muted-foreground">开发负责人:</span>
                <span className="text-white font-medium">{bug.assignee?.name || "未指派"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">报告人:</span>
                <span className="text-white font-medium">{bug.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">发现时间:</span>
                <span className="text-white font-medium">
                  {format(new Date(bug.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">最后活动:</span>
                <span className="text-white font-medium">
                  {format(new Date(bug.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
