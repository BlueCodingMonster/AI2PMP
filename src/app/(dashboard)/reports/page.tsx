import { getTimeLogsSummary } from "@/actions/timelogs";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsClient from "@/components/reports/reports-client";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "AI2PmP - 报表统计",
  description: "内部研发项目管理系统 - 项目工时分析与统计报表",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getTimeLogsSummary();
  if (!result.success || !result.data) {
    return (
      <div className="glass rounded-xl p-6 text-center text-red-400">
        加载统计报表数据失败，请刷新重试。
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">研发报表统计</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          汇总团队开发工时登记，以项目工时占比环形图和近7日研发登记走势图直观展示项目资源投入。
        </p>
      </div>

      {/* 报表统计展示客户端组件 */}
      <ReportsClient summary={result.data} />
    </div>
  );
}
