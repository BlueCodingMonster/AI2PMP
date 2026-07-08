import Link from "next/link";
import { getPlans } from "@/actions/plans";
import { PlanType, PlanStatus } from "@prisma/client";
import { Plus, CalendarRange, Activity, Calendar, Layers } from "lucide-react";

const statusMap: Record<PlanStatus, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  PUBLISHED: { label: "已发布", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  IN_PROGRESS: { label: "进行中", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  COMPLETED: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "已取消", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const typeLabels: Record<PlanType, string> = {
  ANNUAL: "年度计划",
  HALF_YEAR: "半年计划",
  QUARTERLY: "季度计划",
  MONTHLY: "月度计划",
};

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

type PlanCard = {
  id: string;
  title: string;
  description?: string | null;
  type: PlanType;
  status: PlanStatus;
  year: number;
  halfYear?: number | null;
  quarter?: number | null;
  month?: number | null;
  progress: number;
  parentPlan?: { id: string; title: string } | null;
  productLineTeam?: { id: string; name: string } | null;
};

function periodLabel(plan: PlanCard) {
  if (plan.type === PlanType.ANNUAL) return `${plan.year}年`;
  if (plan.type === PlanType.HALF_YEAR) return `${plan.year}年 H${plan.halfYear}`;
  if (plan.type === PlanType.QUARTERLY) return `${plan.year}年 Q${plan.quarter}`;
  return `${plan.year}年 ${plan.month}月`;
}

export default async function PlansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "all";

  const [allRes, annualRes, halfYearRes, quarterlyRes, monthlyRes] = await Promise.all([
    getPlans(),
    getPlans(PlanType.ANNUAL),
    getPlans(PlanType.HALF_YEAR),
    getPlans(PlanType.QUARTERLY),
    getPlans(PlanType.MONTHLY),
  ]);

  const allPlans = allRes.success ? allRes.data : [];
  const annualPlans = annualRes.success ? annualRes.data : [];
  const halfYearPlans = halfYearRes.success ? halfYearRes.data : [];
  const quarterlyPlans = quarterlyRes.success ? quarterlyRes.data : [];
  const monthlyPlans = monthlyRes.success ? monthlyRes.data : [];

  const currentPlans =
    activeTab === "annual"
      ? annualPlans
      : activeTab === "half-year"
      ? halfYearPlans
      : activeTab === "quarterly"
      ? quarterlyPlans
      : activeTab === "monthly"
      ? monthlyPlans
      : allPlans;

  const tabClass = (tabName: string) =>
    `px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
      activeTab === tabName
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
        : "text-muted-foreground hover:text-white hover:bg-muted"
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <CalendarRange className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">计划管理</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            按产品线制定年度、半年、季度和月度计划；计划之间可关联但不强制，计划项可选择性纳入需求池需求。
          </p>
        </div>
        <Link
          href="/plans/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500"
        >
          <Plus className="h-4 w-4" />
          制定新计划
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link href="?tab=all" className={tabClass("all")}>
          全部计划 ({allPlans.length})
        </Link>
        <Link href="?tab=annual" className={tabClass("annual")}>
          年度计划 ({annualPlans.length})
        </Link>
        <Link href="?tab=half-year" className={tabClass("half-year")}>
          半年计划 ({halfYearPlans.length})
        </Link>
        <Link href="?tab=quarterly" className={tabClass("quarterly")}>
          季度计划 ({quarterlyPlans.length})
        </Link>
        <Link href="?tab=monthly" className={tabClass("monthly")}>
          月度计划 ({monthlyPlans.length})
        </Link>
      </div>

      {currentPlans.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
          当前筛选下暂无计划，请先{" "}
          <Link href="/plans/new" className="text-indigo-400 hover:underline">
            创建计划
          </Link>
          。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(currentPlans as PlanCard[]).map((plan) => (
            <div
              key={plan.id}
              className="group glass rounded-xl p-5 border border-border/80 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-medium border ${
                      statusMap[plan.status as PlanStatus]?.className || ""
                    }`}
                  >
                    {statusMap[plan.status as PlanStatus]?.label || plan.status}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {periodLabel(plan)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                      {typeLabels[plan.type as PlanType]}
                    </span>
                    {plan.productLineTeam && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        <Layers className="h-3 w-3" />
                        {plan.productLineTeam.name}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/plans/${plan.id}`}
                    className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors block"
                  >
                    {plan.title}
                  </Link>
                  {plan.parentPlan && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      关联计划: {plan.parentPlan.title}
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {plan.description || "暂无描述信息"}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-muted-foreground">执行进度</span>
                </div>
                <span className="text-sm font-bold text-white">{plan.progress}%</span>
              </div>
              <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${plan.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
