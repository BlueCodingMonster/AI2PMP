import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import RequirementForm from "@/components/requirements/requirement-form";
import { getRequirementById } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";

interface PageProps { params: Promise<{ requirementId: string }> }

export default async function EditRequirementPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { requirementId } = await params;
  const [result, teamsResult] = await Promise.all([getRequirementById(requirementId), getProductLineTeams()]);
  if (!result.success || !result.data) notFound();
  const requirement = result.data;
  if (requirement.createdById !== session.user.id && !session.user.isAdmin) redirect(`/requirements/${requirement.id}`);
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((team) => ({ id: team.id, name: team.name }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link href={`/requirements/${requirement.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white"><ArrowLeft className="h-3 w-3" />返回需求详情</Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><Lightbulb className="h-5 w-5" /></div>
          <h1 className="text-xl font-bold tracking-tight text-white">编辑需求</h1>
        </div>
      </div>
      <RequirementForm
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
    </div>
  );
}
