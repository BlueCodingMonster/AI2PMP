import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import RequirementForm from "@/components/requirements/requirement-form";
import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewRequirementPage() {
  const [session, teamsResult] = await Promise.all([auth(), getProductLineTeams()]);
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((team) => ({ id: team.id, name: team.name }));
  const userWithTeams = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          productLineMemberships: {
            select: { teamId: true },
            take: 2,
          },
        },
      })
    : null;
  const memberships = userWithTeams?.productLineMemberships ?? [];
  const defaultProductLineTeamId = memberships.length === 1 ? memberships[0].teamId : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link href="/requirements" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-3 w-3" />返回需求池
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><Lightbulb className="h-5 w-5" /></div>
          <h1 className="text-xl font-bold tracking-tight text-white">新建需求</h1>
        </div>
        <p className="text-xs text-muted-foreground">登记、评审并跟踪需求；需求可独立存在，关联均为可选。</p>
      </div>
      <RequirementForm
        productLineTeams={productLineTeams}
        currentUserName={session?.user?.name ?? "当前用户"}
        defaultProductLineTeamId={defaultProductLineTeamId}
      />
    </div>
  );
}
