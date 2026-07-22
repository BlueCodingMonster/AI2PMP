import { notFound } from "next/navigation";
import { getQuarterlyPlanById } from "@/actions/quarterly-plans";
import QuarterlyPlanDetail from "@/components/plans/quarterly-plan-detail";
export default async function QuarterlyPlanPage({params}:{params:Promise<{planId:string}>}){const {planId}=await params;const result=await getQuarterlyPlanById(planId);if(!result.success||!result.data)notFound();return <QuarterlyPlanDetail plan={result.data} canManage={Boolean(result.canManage)}/>}
