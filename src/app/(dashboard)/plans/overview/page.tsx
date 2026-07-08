import { getPlanOverview } from "@/actions/plans";
import PlanOverviewClient from "@/components/plans/plan-overview-client";

export default async function PlanOverviewPage() {
  const result = await getPlanOverview();
  return <PlanOverviewClient rows={result.success ? result.data : []} />;
}
