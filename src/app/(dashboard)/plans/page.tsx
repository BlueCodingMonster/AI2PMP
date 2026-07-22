import { PlanPublicationStatus } from "@prisma/client";
import { getMonthlyPlans } from "@/actions/monthly-plans";
import { getQuarterlyPlans } from "@/actions/quarterly-plans";
import PlanListClient from "@/components/plans/plan-list-client";
import { prisma } from "@/lib/prisma";

export default async function PlansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const tab = params.tab === "monthly" ? "monthly" : "quarterly";
  
  let year = params.year ? Number(params.year) : undefined;
  let month = params.period ? Number(params.period) : undefined;
  
  if (tab === "monthly" && params.yearMonth) {
    const parts = params.yearMonth.split("-");
    if (parts.length >= 2) {
      year = Number(parts[0]);
      month = Number(parts[1]);
    }
  } else if (tab === "quarterly") {
    year = year || new Date().getFullYear();
  }

  const teamIds = params.productLineTeamId ? params.productLineTeamId.split(",").filter(Boolean) : undefined;

  const result = tab === "quarterly"
    ? await getQuarterlyPlans({
        year,
        quarter: params.period ? Number(params.period) : undefined,
        productLineTeamIds: teamIds,
        status: params.status as PlanPublicationStatus | undefined
      })
    : await getMonthlyPlans({
        year,
        month,
        productLineTeamIds: teamIds,
        status: params.status as PlanPublicationStatus | undefined
      });

  const teams = await prisma.productLineTeam.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  return (
    <PlanListClient
      tab={tab}
      plans={result.data ?? []}
      canCreate={(result.manageableTeamIds?.length ?? 0) > 0 || Boolean(result.isAdmin)}
      teams={teams}
      defaultYear={year}
      defaultPeriod={tab === "quarterly" ? (params.period ? Number(params.period) : undefined) : month}
      defaultTeamIds={teamIds}
      defaultStatus={params.status}
    />
  );
}
