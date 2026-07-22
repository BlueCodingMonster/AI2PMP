import { ProductLineRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanSessionUser = { id: string; isAdmin: boolean };

export async function getPlanAccess(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    const teams = await prisma.productLineTeam.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { manageableTeams: teams, visibleTeamIds: teams.map((team) => team.id) };
  }

  const memberships = await prisma.productLineMember.findMany({
    where: { userId },
    select: { role: true, team: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return {
    manageableTeams: memberships
      .filter((membership) => membership.role === ProductLineRole.LEADER)
      .map((membership) => membership.team),
    visibleTeamIds: memberships.map((membership) => membership.team.id),
  };
}

export async function assertCanManagePlanTeam(teamId: string, user: PlanSessionUser) {
  if (user.isAdmin) return;
  const membership = await prisma.productLineMember.findFirst({
    where: { teamId, userId: user.id, role: ProductLineRole.LEADER },
    select: { id: true },
  });
  if (!membership) throw new Error("无权维护该产品线小组的计划");
}
