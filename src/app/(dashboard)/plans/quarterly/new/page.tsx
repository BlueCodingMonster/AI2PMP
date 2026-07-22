import { redirect } from "next/navigation";
import { getQuarterlyPlanFormContext } from "@/actions/quarterly-plans";
import QuarterlyPlanForm from "@/components/plans/quarterly-plan-form";
export default async function NewQuarterlyPlanPage(){const result=await getQuarterlyPlanFormContext();if(!result.success||!result.data||result.data.manageableTeams.length===0)redirect("/plans?tab=quarterly");return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">制定季度里程碑计划</h1><QuarterlyPlanForm teams={result.data.manageableTeams}/></div>}
