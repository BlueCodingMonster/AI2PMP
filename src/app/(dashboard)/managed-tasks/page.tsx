import { getManagedTaskContext, getManagedTasks } from "@/actions/managed-tasks";
import ManagedTaskManager from "@/components/managed-tasks/managed-task-manager";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ManagedTasksPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [dbUser, { tasks: allTasks, calendars }, context] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { level: true, productLineMemberships: { select: { teamId: true } } },
        })
      : Promise.resolve(null),
    getManagedTasks(),
    getManagedTaskContext(),
  ]);

  const isDeptManager = dbUser?.level === "部门经理";
  const myTeamIds = dbUser?.productLineMemberships.map((m) => m.teamId) || [];

  let tasks = allTasks;
  let filteredContext = context;

  if (!isDeptManager) {
    // 1. 过滤任务：只保留当前用户所属小组的任务
    tasks = allTasks.filter((task) => task.productLineTeamId && myTeamIds.includes(task.productLineTeamId));

    // 2. 过滤人员：只能看到所属小组内的所有成员
    const myTeamMemberUserIds = new Set<string>();
    context.teams.forEach((team) => {
      if (myTeamIds.includes(team.id)) {
        team.members.forEach((m) => myTeamMemberUserIds.add(m.userId));
      }
    });

    filteredContext = {
      ...context,
      users: context.users.filter((user) => myTeamMemberUserIds.has(user.id)),
      teams: context.teams.filter((team) => myTeamIds.includes(team.id)),
    };
  }

  return (
    <ManagedTaskManager
      isDeptManager={isDeptManager}
      currentUserTeamIds={myTeamIds}
      context={filteredContext}
      tasks={tasks.map((task) => ({
        id: task.id,
        sequenceNo: task.sequenceNo,
        title: task.title,
        description: task.description,
        level: task.level,
        parentId: task.parentId,
        category: task.category,
        sdlcNode: task.sdlcNode,
        status: task.status,
        planStartDate: task.planStartDate?.toISOString() || null,
        planEndDate: task.planEndDate?.toISOString() || null,
        plannedWorkdays: task.plannedWorkdays,
        progressPercent: task.progressPercent,
        actualStartAt: task.actualStartAt?.toISOString() || null,
        actualFinishAt: task.actualFinishAt?.toISOString() || null,
        executorId: task.executorId,
        productLineTeam: task.productLineTeam,
        createdBy: task.createdBy,
        executor: task.executor,
        monthlyPlanId: task.monthlyPlanId,
        monthlyItemType: task.monthlyItemType,
        monthlyItemId: task.monthlyItemId,
        versionType: task.versionType,
        productVersionId: task.productVersionId,
        projectVersionId: task.projectVersionId,
        notes: task.notes,
        children: task.children,
        actualWorkdays: task.actualWorkdays,
      }))}
      calendars={calendars.map((calendar) => ({
        id: calendar.id,
        year: calendar.year,
        status: calendar.status,
        standardHours: calendar.standardHours,
        workWindows: calendar.workWindows,
        days: calendar.days.map((day) => {
          const y = day.date.getUTCFullYear();
          const m = String(day.date.getUTCMonth() + 1).padStart(2, "0");
          const d = String(day.date.getUTCDate()).padStart(2, "0");
          return {
            date: `${y}-${m}-${d}`,
            type: day.type,
            standardHours: day.standardHours,
            workWindows: day.workWindows,
            label: day.label,
            notes: day.notes,
          };
        }),
      }))}
    />
  );
}
