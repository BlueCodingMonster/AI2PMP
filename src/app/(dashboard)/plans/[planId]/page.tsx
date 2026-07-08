import { getPlanById, getEligibleRequirements, getProductVersionOptions } from "@/actions/plans";
import { getAssignees, getProjectsList } from "@/actions/requirements";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PlanDetailsClient from "@/components/plans/plan-details-client";

interface PlanDetailPageProps {
  params: Promise<{
    planId: string;
  }>;
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { planId } = await params;

  // 并行获取详情及下拉列表候选数据
  const [planResult, usersResult, projectsResult, reqsResult] = await Promise.all([
    getPlanById(planId),
    getAssignees(),
    getProjectsList(),
    getEligibleRequirements(),
  ]);

  if (!planResult.success || !planResult.data) {
    notFound();
  }

  const plan = planResult.data;
  const users = usersResult.success ? usersResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const requirements = reqsResult.success ? reqsResult.data : [];
  const versionsResult = await getProductVersionOptions(plan.productLineTeamId);
  const productVersions = versionsResult.success ? versionsResult.data : [];

  return (
    <PlanDetailsClient
      plan={plan}
      users={users}
      projects={projects}
      requirements={requirements}
      productVersions={productVersions}
    />
  );
}
