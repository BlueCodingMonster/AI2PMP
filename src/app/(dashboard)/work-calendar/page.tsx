import { getManagedTaskContext, getManagedTasks } from "@/actions/managed-tasks";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkCalendarManager from "@/components/managed-tasks/work-calendar-manager";
import { CalendarDays } from "lucide-react";

export const metadata = {
  title: "SDLC · 工作日历",
  description: "SDLC · 研发效能平台 - 工作日历管理",
};

export default async function WorkCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!session.user.isAdmin) {
    redirect("/");
  }

  const [{ calendars }, context] = await Promise.all([getManagedTasks(), getManagedTaskContext()]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">工作日历管理</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          维护全局年度工作日历，设置法定节假日、调休以及每日标准工作时长，影响所有团队。
        </p>
      </div>

      <WorkCalendarManager
        context={context}
        calendars={calendars.map((calendar) => ({
          id: calendar.id,
          year: calendar.year,
          status: calendar.status,
          standardHours: calendar.standardHours,
          days: calendar.days.map((day) => {
            const y = day.date.getUTCFullYear();
            const m = String(day.date.getUTCMonth() + 1).padStart(2, "0");
            const d = String(day.date.getUTCDate()).padStart(2, "0");
            return {
              date: `${y}-${m}-${d}`,
              type: day.type,
              standardHours: day.standardHours,
              label: day.label,
              notes: day.notes,
            };
          }),
        }))}
      />
    </div>
  );
}
