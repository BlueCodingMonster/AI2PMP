import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";
import PlanForm from "@/components/plans/plan-form";

export default function NewPlanPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回计划总览
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CalendarRange className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">制定计划</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          根据年度、季度或月度周期设定目标与范围，帮助团队统一研发战略方向。
        </p>
      </div>

      {/* 计划表单 */}
      <PlanForm />
    </div>
  );
}
