"use client";

import { useState } from "react";
import { BarChart3, Users } from "lucide-react";
import ReportsClient from "./reports-client";
import MemberWorkhoursClient from "./member-workhours-client";

interface ReportsTabsProps {
  summary: {
    totalHours: number;
    projectDistribution: { name: string; key: string; hours: number }[];
    dailyTrend: { date: string; hours: number }[];
    recentLogs: any[];
  };
}

export default function ReportsTabs({ summary }: ReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "member-workhours">("overview");

  return (
    <div className="space-y-6">
      {/* 报表模块顶栏 Tab 切换按钮 */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          项目工时概览
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("member-workhours")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "member-workhours"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          人员工时统计 (按周/月)
        </button>
      </div>

      {/* 视图内容 */}
      {activeTab === "overview" ? (
        <ReportsClient summary={summary} />
      ) : (
        <MemberWorkhoursClient />
      )}
    </div>
  );
}
