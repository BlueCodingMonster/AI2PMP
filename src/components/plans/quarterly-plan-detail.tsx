import Link from "next/link";
import { format } from "date-fns";
import { Download, ArrowLeft } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { planPublicationStatusLabels, planRiskLevelLabels, planTrackingStatusLabels, quarterlyGoalDomainLabels, quarterlyRiskStatusLabels } from "@/lib/plans/dictionaries";

type Plan = Prisma.QuarterlyPlanGetPayload<{ include: { productLineTeam: { select: { id: true; name: true } }; createdBy: { select: { id: true; name: true } }; updatedBy: { select: { id: true; name: true } }; goals: true; risks: true } }>;
const value = (item: unknown) => item === null || item === undefined || item === "" ? "—" : String(item);

export default function QuarterlyPlanDetail({ plan, canManage }: { plan: Plan; canManage: boolean }) {
  return <div className="space-y-6">
    <div>
      <Link href="/plans?tab=quarterly" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        返回计划列表
      </Link>
    </div>
    <div className="flex justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.year}年 Q{plan.quarter} 季度里程碑计划</h1><p className="text-sm text-muted-foreground">{plan.productLineTeam.name} · {planPublicationStatusLabels[plan.status]}</p></div><div className="flex items-center gap-2"><a href={`/api/plans/quarterly/${plan.id}/export`} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm text-white flex items-center gap-1.5 transition-colors"><Download className="h-4 w-4" />导出 Excel</a>{canManage && <Link href={`/plans/quarterly/${plan.id}/edit`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">编辑计划</Link>}</div></div>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[1800px] text-xs"><thead className="bg-emerald-800 text-white"><tr>{["序", "目标域", "季度目标", "成功标准", "M1目标", "M1状态", "M2目标", "M2状态", "M3目标", "M3状态", "当前完成", "达成率", "季度状态", "关键依赖", "备注"].map((v) => <th key={v} className="p-3 text-left">{v}</th>)}</tr></thead><tbody>{plan.goals.map((goal, index) => <tr key={goal.id} className="border-t border-border"><td className="p-3">{index + 1}</td><td className="p-3">{goal.domain ? quarterlyGoalDomainLabels[goal.domain] : "—"}</td>{[goal.quarterlyGoal, goal.successCriteria, goal.month1Goal, goal.month1Status ? planTrackingStatusLabels[goal.month1Status] : null, goal.month2Goal, goal.month2Status ? planTrackingStatusLabels[goal.month2Status] : null, goal.month3Goal, goal.month3Status ? planTrackingStatusLabels[goal.month3Status] : null, goal.currentCompletion, `${goal.achievementRate}%`, goal.quarterlyStatus ? planTrackingStatusLabels[goal.quarterlyStatus] : null, goal.keyDependencies, goal.notes].map((v, column) => <td key={column} className="whitespace-pre-wrap p-3">{value(v)}</td>)}</tr>)}</tbody></table></div>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[1400px] text-xs"><thead className="bg-rose-800 text-white"><tr>{["编号", "风险描述", "影响里程碑", "概率", "影响", "综合级", "触发条件", "应对策略", "预警节点", "状态"].map((v) => <th key={v} className="p-3 text-left">{v}</th>)}</tr></thead><tbody>{plan.risks.length === 0 ? <tr><td colSpan={10} className="p-8 text-center">暂无风险</td></tr> : plan.risks.map((risk, index) => <tr key={risk.id} className="border-t border-border"><td className="p-3">R{index + 1}</td>{[risk.riskDescription, risk.affectedMilestone, risk.probability ? planRiskLevelLabels[risk.probability] : null, risk.impact ? planRiskLevelLabels[risk.impact] : null, risk.overallLevel ? planRiskLevelLabels[risk.overallLevel] : null, risk.triggerCondition, risk.responseStrategy, risk.warningPoint, risk.status ? quarterlyRiskStatusLabels[risk.status] : null].map((v, column) => <td key={column} className="whitespace-pre-wrap p-3">{value(v)}</td>)}</tr>)}</tbody></table></div>
    <p className="text-xs text-muted-foreground">制定人：{plan.createdBy.name}　最后修改：{plan.updatedBy.name} · {format(new Date(plan.updatedAt), "yyyy-MM-dd HH:mm")}</p></div>;
}
