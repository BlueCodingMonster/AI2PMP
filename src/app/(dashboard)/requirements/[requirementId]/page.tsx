import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit2, Calendar, Star, FileText, BarChart3, Settings, Trash2 } from "lucide-react";
import { getRequirementById } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import StatusFlow from "@/components/requirements/status-flow";
import RequirementComments from "@/components/requirements/requirement-comments";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { RequirementStatus, RequirementType, RequirementSource, Priority } from "@prisma/client";

// 状态汉化和样式映射
const statusMap: Record<RequirementStatus, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  UNDER_REVIEW: { label: "评审中", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  APPROVED: { label: "已批准", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  PLANNED: { label: "已排期", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  COMPLETED: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "已拒绝", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  DEFERRED: { label: "已延期", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

// 优先级汉化和样式映射
const priorityMap: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "紧急", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  HIGH: { label: "高", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  MEDIUM: { label: "中", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  LOW: { label: "低", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const typeMap: Record<RequirementType, string> = {
  FUNCTIONAL: "功能需求",
  NON_FUNCTIONAL: "非功能需求",
  ENHANCEMENT: "体验优化",
  OPTIMIZATION: "性能优化",
  TECH_DEBT: "技术债务",
};

const sourceMap: Record<RequirementSource, string> = {
  PRODUCT_PLANNING: "产品规划",
  CUSTOMER_FEEDBACK: "客户反馈",
  INTERNAL_SUGGESTION: "内部建议",
  MARKET_ANALYSIS: "市场分析",
  TECH_DEBT: "技术债务",
};

interface PageProps {
  params: Promise<{
    requirementId: string;
  }>;
}

export default async function RequirementDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="text-center py-10">
        <p className="text-red-400">错误：未登录。请重新登录。</p>
      </div>
    );
  }

  const { requirementId } = await params;
  const result = await getRequirementById(requirementId);

  if (!result.success || !result.data) {
    notFound();
  }

  const req = result.data;
  const currentUser = session.user;

  // 判定是否有编辑/删除权限 (创建者或系统管理员)
  const hasEditPermission = req.createdById === currentUser.id || currentUser.isAdmin;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 面包屑导航与快捷操作 */}
      <div className="flex items-center justify-between">
        <Link
          href="/requirements"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回需求池
        </Link>

        {hasEditPermission && (
          <div className="flex gap-2">
            <Link
              href={`/requirements/${req.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
            >
              <Edit2 className="h-3.5 w-3.5" />
              编辑需求
            </Link>
          </div>
        )}
      </div>

      {/* 头部标题区域 */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          {/* 类型 / 来源 / 优先级标签组 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              {typeMap[req.type]}
            </span>
            <span className="inline-flex items-center rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
              来源: {sourceMap[req.source]}
            </span>
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium border ${
                priorityMap[req.priority]?.className || ""
              }`}
            >
              优先级: {priorityMap[req.priority]?.label || req.priority}
            </span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{req.title}</h1>
        </div>

        <hr className="border-border/60" />

        {/* 状态流转控制面板 */}
        <StatusFlow
          requirementId={req.id}
          currentStatus={req.status}
          isAdmin={currentUser.isAdmin}
        />
      </div>

      {/* 详情布局：左侧主内容 (2/3)，右侧侧边栏 (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧主内容 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 需求描述 */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              需求描述
            </h3>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {req.description || <span className="text-muted-foreground italic">暂无详细描述</span>}
            </div>
          </div>

          {/* 验收标准 */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              验收标准
            </h3>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {req.acceptanceCriteria || <span className="text-muted-foreground italic">暂无验收标准</span>}
            </div>
          </div>

          {/* 关联计划与关联任务 */}
          <div className="glass rounded-xl p-6 space-y-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-400" />
              关联执行项
            </h3>

            {/* 关联计划 */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">纳入计划</h4>
              {req.planItems.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">暂无计划关联</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {req.planItems.map((item) => (
                    <div key={item.id} className="flex flex-col rounded-lg border border-border bg-input/40 p-3">
                      <span className="text-xs text-indigo-400 font-medium">
                        {item.plan ? (item.plan.type === "ANNUAL" ? "年度计划" : item.plan.type === "QUARTERLY" ? "季度计划" : "月度计划") : "计划外工作"}
                      </span>
                      <span className="text-sm text-white font-medium mt-1">{item.plan?.title || item.title}</span>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-muted-foreground">执行状态: {item.status === 'DONE' ? '已完成' : item.status === 'IN_PROGRESS' ? '进行中' : '未开始'}</span>
                        <span className="text-xs font-semibold text-emerald-400">{item.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 关联项目任务 */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">分解任务</h4>
              {req.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">暂无关联任务</p>
              ) : (
                <div className="space-y-2">
                  {req.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-input/20 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 max-w-[70%] truncate">
                        <span className="shrink-0 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400">
                          {task.status === 'DONE' ? '已完成' : task.status === 'IN_PROGRESS' ? '进行中' : '待办'}
                        </span>
                        <span className="text-white font-medium truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.assignee ? (
                          <span className="text-muted-foreground">负责人: {task.assignee.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">未指派</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 讨论区 */}
          <div className="glass rounded-xl p-6">
            <RequirementComments
              requirementId={req.id}
              initialComments={req.comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                author: {
                  id: c.author.id,
                  name: c.author.name,
                  avatar: c.author.avatar
                }
              }))}
              currentUserId={currentUser.id}
            />
          </div>
        </div>

        {/* 右侧侧边栏 */}
        <div className="space-y-6">
          {/* 基本属性卡片 */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">需求属性</h3>

            {/* 责任人 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">责任人</span>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                  {req.assignee ? req.assignee.name.slice(0, 2) : "-"}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{req.assignee?.name || "未分配"}</div>
                  {req.assignee && <div className="text-[10px] text-muted-foreground">{req.assignee.department || "暂无部门"}</div>}
                </div>
              </div>
            </div>

            {/* 提出者 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">提出人</span>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  {req.createdBy.name.slice(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{req.createdBy.name}</div>
                  <div className="text-[10px] text-muted-foreground">{req.createdBy.department || "暂无部门"}</div>
                </div>
              </div>
            </div>

            {/* 关联项目 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">关联项目</span>
              {req.project ? (
                <Link
                  href={`/projects/${req.project.id}`}
                  className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-indigo-400 font-semibold">[{req.project.key}]</span>
                  <span className="text-xs text-white font-medium ml-1.5">{req.project.name}</span>
                </Link>
              ) : (
                <div className="text-xs text-muted-foreground italic">未关联具体项目</div>
              )}
            </div>

            {/* 归属产品线小组 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">归属产品线</span>
              {req.productLineTeam ? (
                <Link
                  href={`/product-lines/${req.productLineTeam.id}`}
                  className="block rounded-lg border border-border bg-input/40 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-indigo-400 font-semibold">{req.productLineTeam.name}</span>
                </Link>
              ) : (
                <div className="text-xs text-muted-foreground italic">未关联产品线小组</div>
              )}
            </div>

            {/* 需求提出方 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">需求提出方</span>
              <div className="text-sm font-semibold text-white">
                {req.proposer || <span className="text-muted-foreground italic font-normal text-xs">未填写</span>}
              </div>
            </div>

            {/* 需求提出时间 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">需求提出时间</span>
              <div className="text-sm font-semibold text-white">
                {req.proposedAt
                  ? format(new Date(req.proposedAt), "yyyy-MM-dd", { locale: zhCN })
                  : <span className="text-muted-foreground italic font-normal text-xs">未记录</span>}
              </div>
            </div>

            {/* 预估工期 */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">预估工期</span>
              <div className="text-sm font-semibold text-white">
                {req.estimatedDays ? `${req.estimatedDays} 人天` : <span className="text-muted-foreground italic font-normal text-xs">未预估</span>}
              </div>
            </div>

            {/* 统计指标（价值与复杂度） */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              {/* 价值 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    业务价值
                  </span>
                  <span className="font-semibold text-amber-400">{req.businessValue ?? "未评分"}/10</span>
                </div>
                {req.businessValue && (
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${req.businessValue * 10}%` }}></div>
                  </div>
                )}
              </div>

              {/* 复杂度 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>技术复杂度</span>
                  <span className="font-semibold text-indigo-400">{req.complexity ?? "未评分"}/10</span>
                </div>
                {req.complexity && (
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${req.complexity * 10}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            {/* 创建/更新日期 */}
            <div className="space-y-2 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>创建时间:</span>
                <span>{format(new Date(req.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>最近更新:</span>
                <span>{format(new Date(req.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
