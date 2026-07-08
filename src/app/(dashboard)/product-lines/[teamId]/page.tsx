import {
  getEligibleUsersForTeam,
  getProductLineTeamById,
  getProductLineTeams,
  getProductVersionTree,
} from "@/actions/product-lines";
import { getProjectsList } from "@/actions/requirements";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import TeamDetailsClient from "@/components/product-lines/team-details-client";
import ProductVersionsManager from "@/components/product-lines/product-versions-manager";
import { Layers } from "lucide-react";

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { teamId } = await params;

  // 并行获取小组详情、可候选人员、项目和小组（供借调选择）
  const [teamResult, usersResult, projectsResult, teamsResult, versionTreeResult] = await Promise.all([
    getProductLineTeamById(teamId),
    getEligibleUsersForTeam(teamId),
    getProjectsList(),
    getProductLineTeams(),
    getProductVersionTree(teamId),
  ]);

  if (!teamResult.success || !teamResult.data) {
    notFound();
  }

  const team = teamResult.data;
  const allUsers = usersResult.success ? usersResult.data : [];
  const allProjects = projectsResult.success ? projectsResult.data : [];
  const allTeams = teamsResult.success ? teamsResult.data : [];
  const versionTree = versionTreeResult.success ? versionTreeResult.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 顶部简易栏 */}
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
          <Layers className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">小组编制与岗位管理</h1>
      </div>

      {/* 详情与交互管理核心组件 */}
      <TeamDetailsClient
        team={team}
        allUsers={allUsers}
        allProjects={allProjects}
        allTeams={allTeams}
      />

      <ProductVersionsManager teamId={team.id} versionTree={versionTree} />
    </div>
  );
}
