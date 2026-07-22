import { notFound } from "next/navigation";
import { getRequirementById } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";
import RequirementForm from "@/components/requirements/requirement-form";

interface PageProps { params: Promise<{ requirementId: string }> }

export default async function RequirementDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) return <p className="py-10 text-center text-red-400">错误：未登录。请重新登录。</p>;
  const { requirementId } = await params;
  const [result, teamsResult] = await Promise.all([getRequirementById(requirementId), getProductLineTeams()]);
  if (!result.success || !result.data) notFound();
  const requirement = result.data;
  const canEdit = requirement.createdById === session.user.id || Boolean(session.user.isAdmin);
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((team) => ({ id: team.id, name: team.name }));

  return <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
    <div className="space-y-2"><h1 className="text-xl font-bold tracking-tight text-white">查看需求</h1><p className="text-xs text-muted-foreground">需求信息采用与新增、编辑相同的字段和排列，当前为只读模式。</p></div>
    <RequirementForm
      mode="view"
      canEdit={canEdit}
      productLineTeams={productLineTeams}
      currentUserName={session.user.name ?? "当前用户"}
      initialData={{
        id: requirement.id,
        sequenceNo: requirement.sequenceNo,
        title: requirement.title,
        summary: requirement.summary,
        status: requirement.status,
        source: requirement.source,
        priority: requirement.priority,
        productLineTeamId: requirement.productLineTeamId,
        proposer: requirement.proposer,
        proposedAt: requirement.proposedAt?.toISOString() ?? null,
        reviewedAt: requirement.reviewedAt?.toISOString() ?? null,
        createdAt: requirement.createdAt.toISOString(),
        createdBy: { name: requirement.createdBy.name },
      }}
    />
  </div>;
}
