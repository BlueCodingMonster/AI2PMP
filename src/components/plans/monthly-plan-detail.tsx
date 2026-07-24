import Link from "next/link";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import { planPublicationStatusLabels, planRiskLevelLabels, resourceRequestTypeLabels } from "@/lib/plans/dictionaries";
import { ArrowDownToLine, ArrowLeft } from "lucide-react";

type Plan = Prisma.MonthlyPlanGetPayload<{ include: { productLineTeam: { select: { id: true; name: true } }; createdBy: { select: { id: true; name: true } }; updatedBy: { select: { id: true; name: true } }; productDeliveries: true; projectDeliveries: true; marketActions: true; costOptimizations: true; aiProductEnablements: true; aiEfficiencies: true; risks: true; resourceRequests: true } }>;
const sections = [
  ["一、产品交付计划", "productDeliveries", [["moduleVersion", "模块/功能/版本"], ["deliveryContent", "交付内容"], ["plannedCompletionDate", "计划完成时间"]]],
  ["二、项目交付计划", "projectDeliveries", [["projectName", "项目名称"], ["deliveryContent", "交付内容"], ["plannedCompletionDate", "计划完成时间"], ["customerName", "客户名称"]]],
  ["三、市场化动作计划", "marketActions", [["productOrProject", "产品/项目"], ["marketAction", "市场化动作"], ["outputResult", "输出成果"], ["plannedCompletionDate", "计划完成时间"]]],
  ["四、成本优化计划", "costOptimizations", [["optimizationItem", "优化项"], ["currentProblem", "当前问题"], ["optimizationMeasure", "优化措施"]]],
  ["五、AI+赋能产品计划", "aiProductEnablements", [["item", "事项"], ["outputResult", "输出成果"], ["plannedCompletionDate", "计划完成时间"]]],
  ["六、AI+效能提升计划", "aiEfficiencies", [["item", "事项"], ["outputResult", "输出成果"], ["plannedCompletionDate", "计划完成时间"]]],
  ["七、项目风险", "risks", [["riskItem", "风险项"], ["riskLevel", "风险等级"], ["impactScope", "影响范围"], ["responseMeasure", "应对措施"]]],
  ["八、资源需求", "resourceRequests", [["requestType", "需求类型"], ["content", "具体内容"], ["urgency", "紧急程度"], ["supportDepartment", "需要支持部门/小组"]]],
] as const;

export default function MonthlyPlanDetail({ plan, canManage }: { plan: Plan; canManage: boolean }) {
  const record = plan as unknown as Record<string, unknown>;
  const display = (field: string, item: unknown) => { if (!item) return "—"; if (field === "riskLevel" || field === "urgency") return planRiskLevelLabels[item as keyof typeof planRiskLevelLabels]; if (field === "requestType") return resourceRequestTypeLabels[item as keyof typeof resourceRequestTypeLabels]; if (field === "plannedCompletionDate") return format(new Date(item as string), "yyyy-MM-dd"); return String(item); };
  return <div className="space-y-6">
    <div>
      <Link href="/plans?tab=monthly" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        返回计划列表
      </Link>
    </div>
    <div className="flex justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.year}年{plan.month}月项目经营计划</h1><p className="text-sm text-muted-foreground">{plan.productLineTeam.name} · {planPublicationStatusLabels[plan.status]}</p></div><div className="flex items-center gap-2"><a href={`/api/plans/monthly/${plan.id}/export`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition-colors"><ArrowDownToLine className="h-4 w-4" />导出 Excel</a>{canManage && <Link href={`/plans/monthly/${plan.id}/edit`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">编辑计划</Link>}</div></div>{sections.map(([title, key, columns]) => { const rows = record[key] as Array<Record<string, unknown>>; return <section key={key} className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold text-emerald-300">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead className="bg-white/5"><tr>{columns.map(([, label]) => <th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={columns.length} className="p-6 text-center text-muted-foreground">暂无数据</td></tr> : rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-t border-border">{columns.map(([field]) => <td key={field} className="whitespace-pre-wrap p-2">{display(field, row[field])}</td>)}</tr>)}</tbody></table></div></section>; })}<p className="text-xs text-muted-foreground">制定人：{plan.createdBy.name}　最后修改：{plan.updatedBy.name} · {format(new Date(plan.updatedAt), "yyyy-MM-dd HH:mm")}</p></div>;
}
