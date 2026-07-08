import Link from "next/link";
import { Plus, Search, Filter, Lightbulb, User, Calendar, ArrowRight, Star } from "lucide-react";
import { getRequirements, getAssignees, getProjectsList } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";
import { RequirementStatus, RequirementType, RequirementSource, Priority } from "@prisma/client";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

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
  URGENT: { label: "紧急", className: "bg-red-500/20 text-red-400" },
  HIGH: { label: "高", className: "bg-orange-500/20 text-orange-400" },
  MEDIUM: { label: "中", className: "bg-amber-500/20 text-amber-400" },
  LOW: { label: "低", className: "bg-emerald-500/20 text-emerald-400" },
};

// 类型汉化
const typeMap: Record<RequirementType, string> = {
  FUNCTIONAL: "功能需求",
  NON_FUNCTIONAL: "非功能需求",
  ENHANCEMENT: "体验优化",
  OPTIMIZATION: "性能优化",
  TECH_DEBT: "技术债务",
};

// 来源汉化
const sourceMap: Record<RequirementSource, string> = {
  PRODUCT_PLANNING: "产品规划",
  CUSTOMER_FEEDBACK: "客户反馈",
  INTERNAL_SUGGESTION: "内部建议",
  MARKET_ANALYSIS: "市场分析",
  TECH_DEBT: "技术债务",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    source?: string;
    priority?: string;
    assigneeId?: string;
    productLineTeamId?: string;
    search?: string;
  }>;
}

export default async function RequirementsPage({ searchParams }: PageProps) {
  // Await searchParams in Next.js 16
  const params = await searchParams;

  // 1. 获取过滤条件
  const status = params.status as RequirementStatus | undefined;
  const type = params.type as RequirementType | undefined;
  const source = params.source as RequirementSource | undefined;
  const priority = params.priority as Priority | undefined;
  const assigneeId = params.assigneeId;
  const productLineTeamId = params.productLineTeamId;
  const search = params.search;

  // 2. 发起数据请求
  const [reqsResult, usersResult, projectsResult, teamsResult] = await Promise.all([
    getRequirements({ status, type, source, priority, assigneeId, productLineTeamId, search }),
    getAssignees(),
    getProjectsList(),
    getProductLineTeams(),
  ]);

  const requirements = reqsResult.success ? reqsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((t: any) => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区域 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">需求池</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            收集、评审和跟踪所有产品与技术研发需求。当前收录 {requirements.length} 个需求。
          </p>
        </div>
        <Link
          href="/requirements/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500"
        >
          <Plus className="h-4 w-4" />
          新建需求
        </Link>
      </div>

      {/* 过滤搜索条（Client Component 可交互，这里使用 Form 提交实现 Server 端过滤） */}
      <div className="glass rounded-xl p-4">
        <form method="GET" className="grid grid-cols-1 gap-4 md:grid-cols-6 items-end">
          {/* 搜索框 */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">关键字搜索</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                defaultValue={search || ""}
                placeholder="搜索标题、描述..."
                className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-4 text-xs text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* 状态过滤 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">状态</label>
            <select
              name="status"
              defaultValue={status || ""}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-xs text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">全部状态</option>
              {Object.entries(statusMap).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 负责人过滤 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">负责人</label>
            <select
              name="assigneeId"
              defaultValue={assigneeId || ""}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-xs text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">全部人员</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* 优先级过滤 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">优先级</label>
            <select
              name="priority"
              defaultValue={priority || ""}
              className="w-full rounded-lg border border-border bg-input py-2 px-3 text-xs text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">全部优先级</option>
              {Object.entries(priorityMap).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600/90 py-2 px-3 text-xs font-medium text-white transition-all hover:bg-indigo-500"
            >
              <Filter className="h-3.5 w-3.5" />
              筛选
            </button>
            <Link
              href="/requirements"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-input py-2 px-3 text-xs font-medium text-white transition-all hover:bg-muted"
            >
              重置
            </Link>
          </div>
        </form>
      </div>

      {/* 需求列表表格 */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-foreground">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">需求标题</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4">类型</th>
                <th className="py-3 px-4">来源</th>
                <th className="py-3 px-4">优先级</th>
                <th className="py-3 px-4">价值/复杂度</th>
                <th className="py-3 px-4">产品线</th>
                <th className="py-3 px-4">提出方</th>
                <th className="py-3 px-4">负责人</th>
                <th className="py-3 px-4">创建时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {requirements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-muted-foreground">
                    未找到符合条件的需求数据。请尝试调整筛选条件或{" "}
                    <Link href="/requirements/new" className="text-indigo-400 hover:underline">
                      创建一个新需求
                    </Link>
                    。
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr
                    key={req.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-white max-w-[280px] truncate">
                      <Link
                        href={`/requirements/${req.id}`}
                        className="hover:text-indigo-300 transition-colors"
                      >
                        {req.title}
                      </Link>
                      {req.project && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          关联项目: {req.project.name}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          statusMap[req.status]?.className || ""
                        }`}
                      >
                        {statusMap[req.status]?.label || req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {typeMap[req.type] || req.type}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {sourceMap[req.source] || req.source}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                          priorityMap[req.priority]?.className || ""
                        }`}
                      >
                        {priorityMap[req.priority]?.label || req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center text-amber-400 gap-0.5" title="业务价值">
                          <Star className="h-3 w-3 fill-amber-400" />
                          {req.businessValue ?? "-"}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-indigo-400" title="技术复杂度">
                          {req.complexity ?? "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {(req as any).productLineTeam ? (
                        <Link
                          href={`/product-lines/${(req as any).productLineTeam.id}`}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {(req as any).productLineTeam.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-white">
                      {(req as any).proposer || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {req.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-medium text-indigo-400">
                            {req.assignee.name.slice(0, 2)}
                          </div>
                          <span className="text-xs text-white">{req.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(req.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/requirements/${req.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-input hover:bg-muted text-muted-foreground hover:text-white transition-colors"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
