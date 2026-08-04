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

  const isDeptManager = Boolean(dbUser?.level === "部门经理" || session?.user?.isAdmin);
  const myTeamIds = dbUser?.productLineMemberships.map((m) => m.teamId) || [];

  return (
    <ManagedTaskManager
      isDeptManager={isDeptManager}
      currentUserTeamIds={myTeamIds}
      context={context}
      tasks={allTasks.map((task) => {
        const canManage = isDeptManager || (Boolean(userId) && task.createdById === userId) || (Boolean(task.productLineTeamId) && myTeamIds.includes(task.productLineTeamId));
        return {
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
          canManage,
        };
      })}
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
