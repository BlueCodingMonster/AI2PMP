import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarRange } from "lucide-react";
import PlanForm from "@/components/plans/plan-form";
import { getPlanById } from "@/actions/plans";
import { auth } from "@/lib/auth";

interface EditPlanPageProps {
  params: Promise<{
    planId: string;
  }>;
}

export default async function EditPlanPage({ params }: EditPlanPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { planId } = await params;
  const result = await getPlanById(planId);

  if (!result.success || !result.data) {
    notFound();
  }

  const plan = result.data;

  // 格式化初始数据以匹配表单组件
  const initialData = {
    id: plan.id,
    title: plan.title,
    description: plan.description || "",
    type: plan.type,
    status: plan.status,
    productLineTeamId: plan.productLineTeamId,
    year: plan.year,
    halfYear: plan.halfYear,
    quarter: plan.quarter,
    month: plan.month,
    startDate: plan.startDate,
    endDate: plan.endDate,
    parentPlanId: plan.parentPlanId || "",
    goals: plan.goals || "",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 头部面包屑 */}
      <div className="space-y-2">
        <Link
          href={`/plans/${plan.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回计划详情
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CalendarRange className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">修改计划</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          调整计划的基础设定、起止时间或研发目标，并重新发布。
        </p>
      </div>

      {/* 计划编辑表单 */}
      <PlanForm initialData={initialData} />
    </div>
  );
}
