"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  Users,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronRight,
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  RefreshCw,
  FolderKanban,
  FileText,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  getMemberWorkhoursStats,
  getISOWeekNumberServer,
  type DimensionType,
  type MemberWorkhoursSummaryItem,
  type Level1TaskDetail,
} from "@/actions/member-workhours";

const statusLabels: Record<string, string> = {
  UNSCHEDULED: "待排期",
  TODO: "待办",
  IN_PROGRESS: "进行中",
  PAUSED: "已暂停",
  DONE: "已完成",
  CANCELLED: "已取消",
};

const statusBadgeColors: Record<string, string> = {
  UNSCHEDULED: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
  TODO: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  PAUSED: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

const sdlcLabels: Record<string, string> = {
  REQUIREMENT_ANALYSIS: "需求分析",
  SOLUTION_DESIGN: "方案设计",
  DEVELOPMENT: "开发",
  INTEGRATION: "联调",
  TESTING: "测试",
  RELEASE: "发布",
  ACCEPTANCE: "验收",
  OPERATION_OBSERVATION: "运维观察",
  OTHER: "其他",
};

export default function MemberWorkhoursClient() {
  const [isPending, startTransition] = useTransition();

  // 当前时间状态
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 筛选项状态
  const [dimension, setDimension] = useState<DimensionType>("week");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(30); // 默认第30周
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentMonth);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 后端数据
  const [statsData, setStatsData] = useState<{
    summary: {
      totalMembers: number;
      teamTotalPlannedHours: number;
      teamTotalActualHours: number;
      teamTotalVarianceHours: number;
    };
    members: MemberWorkhoursSummaryItem[];
    teams: { id: string; name: string }[];
  } | null>(null);

  // 弹窗明细人员状态
  const [selectedMember, setSelectedMember] = useState<MemberWorkhoursSummaryItem | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // 初始化拉取数据
  const fetchStats = () => {
    startTransition(async () => {
      const periodValue = dimension === "week" ? selectedWeek : selectedMonth;
      const res = await getMemberWorkhoursStats({
        dimension,
        year: selectedYear,
        periodValue,
        teamId: selectedTeam,
        search: searchQuery,
      });

      if (res.success && res.data) {
        setStatsData(res.data);
      }
    });
  };

  useEffect(() => {
    fetchStats();
  }, [dimension, selectedYear, selectedWeek, selectedMonth, selectedTeam]);

  // 处理搜索框延迟提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats();
  };

  // 生成周选项 (1~53周)
  const weekOptions = useMemo(() => {
    const list = [];
    for (let w = 1; w <= 53; w++) {
      list.push({ label: `第 ${w} 周`, value: w });
    }
    return list;
  }, []);

  // 生成月份选项 (1~12月)
  const monthOptions = useMemo(() => {
    return [
      { label: "1 月", value: 1 },
      { label: "2 月", value: 2 },
      { label: "3 月", value: 3 },
      { label: "4 月", value: 4 },
      { label: "5 月", value: 5 },
      { label: "6 月", value: 6 },
      { label: "7 月", value: 7 },
      { label: "8 月", value: 8 },
      { label: "9 月", value: 9 },
      { label: "10 月", value: 10 },
      { label: "11 月", value: 11 },
      { label: "12 月", value: 12 },
    ];
  }, []);

  // 生成年份选项 (前2年 ~ 后1年)
  const yearOptions = useMemo(() => {
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, [currentYear]);

  // 计算格式化的时间维度文案
  const getPeriodLabelText = () => {
    if (dimension === "week") {
      return selectedWeek === "all"
        ? `${selectedYear}年 全年所有周`
        : `${selectedYear}年 第 ${selectedWeek} 周`;
    } else {
      return selectedMonth === "all"
        ? `${selectedYear}年 全年所有月份`
        : `${selectedYear}年 ${selectedMonth} 月`;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 顶部控制栏 (维度切换、时间选择、搜索过滤) */}
      <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
          {/* 左侧：维度 Tab 切换 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              统计维度：
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setDimension("week")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dimension === "week"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                按周维度 (Weekly)
              </button>
              <button
                type="button"
                onClick={() => setDimension("month")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dimension === "month"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                按月维度 (Monthly)
              </button>
            </div>
          </div>

          {/* 右侧：快捷预设按钮 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">快捷切换：</span>
            {dimension === "week" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setSelectedWeek(30); // 假定系统当前处于第30周
                  }}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  本周
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setSelectedWeek(29);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  上周
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeek("all")}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  全年累计
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setSelectedMonth(currentMonth);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  本月
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setSelectedMonth(currentMonth > 1 ? currentMonth - 1 : 12);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  上月
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonth("all")}
                  className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 hover:text-indigo-400 transition"
                >
                  全年累计
                </button>
              </>
            )}
          </div>
        </div>

        {/* 详细选择器表单 */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 text-xs">
          {/* 年份 */}
          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground font-medium">年份：</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
          </div>

          {/* 周 / 月 下拉 */}
          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground font-medium">
              {dimension === "week" ? "周周期：" : "月份："}
            </label>
            {dimension === "week" ? (
              <select
                value={selectedWeek}
                onChange={(e) =>
                  setSelectedWeek(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">-- 全年所有周 --</option>
                {weekOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">-- 全年所有月份 --</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 团队选择 */}
          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground font-medium">团队/产品线：</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">全部团队</option>
              {statsData?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 人员模糊搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索人员姓名、账号、部门..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/60"
            />
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* 刷新/确认按钮 */}
          <button
            type="submit"
            disabled={isPending}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            查询统计
          </button>
        </form>
      </div>

      {/* 2. 核心指标卡片区域 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* 卡片 1：人员总数 */}
        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">统计人员数量</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {statsData?.summary.totalMembers ?? 0}{" "}
              <span className="text-xs font-normal text-muted-foreground">人</span>
            </div>
          </div>
        </div>

        {/* 卡片 2：团队计划总工时 */}
        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">团队计划工时总计</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {statsData?.summary.teamTotalPlannedHours ?? 0}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                小时 ({( (statsData?.summary.teamTotalPlannedHours ?? 0) / 8 ).toFixed(1)} 人天)
              </span>
            </div>
          </div>
        </div>

        {/* 卡片 3：团队实际总工时 */}
        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">团队实际工时总计</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {statsData?.summary.teamTotalActualHours ?? 0}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                小时 ({( (statsData?.summary.teamTotalActualHours ?? 0) / 8 ).toFixed(1)} 人天)
              </span>
            </div>
          </div>
        </div>

        {/* 卡片 4：总体工时偏差 */}
        <div className="glass rounded-xl p-4 flex items-center gap-3.5">
          { (statsData?.summary.teamTotalVarianceHours ?? 0) > 0 ? (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          ) : (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          )}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">总体工时偏差 (实际-计划)</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {(statsData?.summary.teamTotalVarianceHours ?? 0) > 0 ? "+" : ""}
              {statsData?.summary.teamTotalVarianceHours ?? 0}{" "}
              <span className="text-xs font-normal text-muted-foreground">小时</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 人员工时汇总表格 */}
      <div className="glass rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-500" />
            【{getPeriodLabelText()}】人员工时统计表
          </h3>
          <span className="text-xs text-muted-foreground">
            提示：点击任意人员可展开查看其参与的一级任务明细
          </span>
        </div>

        {isPending ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <span>数据加载计算中，请稍候...</span>
          </div>
        ) : !statsData || statsData.members.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            未查询到符合条件的人员工时统计记录。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">人员信息</th>
                  <th className="py-3 px-4">关联团队/项目</th>
                  <th className="py-3 px-4 text-right">计划工时 (小时 / 人天)</th>
                  <th className="py-3 px-4 text-right">实际工时 (小时 / 人天)</th>
                  <th className="py-3 px-4 text-right">工时偏差</th>
                  <th className="py-3 px-4 text-center">参与一级任务数</th>
                  <th className="py-3 px-4 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {statsData.members.map((item) => {
                  const isDelay = item.varianceHours > 0;
                  const isExact = item.varianceHours === 0;

                  return (
                    <tr
                      key={item.user.id}
                      onClick={() => setSelectedMember(item)}
                      className="hover:bg-slate-500/5 transition cursor-pointer group"
                    >
                      {/* 人员 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.user.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {item.user.name}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (@{item.user.username})
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.user.department || "未设定部门"}{" "}
                              {item.user.position ? `· ${item.user.position}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 团队 */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.teams.length > 0 ? (
                            item.teams.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 font-medium"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-[10px] italic">暂无团队</span>
                          )}
                        </div>
                      </td>

                      {/* 计划工时 */}
                      <td className="py-3 px-4 text-right font-medium">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                          {item.plannedHours}h
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          ({item.plannedWorkdays} 人天)
                        </div>
                      </td>

                      {/* 实际工时 */}
                      <td className="py-3 px-4 text-right font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                          {item.actualHours}h
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          ({item.actualWorkdays} 人天)
                        </div>
                      </td>

                      {/* 偏差 */}
                      <td className="py-3 px-4 text-right">
                        {isExact ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-500">
                            0.0h (完全符合)
                          </span>
                        ) : isDelay ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            +{item.varianceHours}h ({item.variancePercent}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                            {item.varianceHours}h ({item.variancePercent}%)
                          </span>
                        )}
                      </td>

                      {/* 一级任务数 */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {item.level1TaskCount} 个
                        </span>
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(item);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white text-xs font-medium transition"
                        >
                          查看明细
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. 一级任务穿透明细 Modal / Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
                  {selectedMember.user.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedMember.user.name} 一级任务工时明细
                    <span className="text-xs font-normal text-muted-foreground">
                      (@{selectedMember.user.username})
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    时间范围：{getPeriodLabelText()} · 部门：
                    {selectedMember.user.department || "未指定"} · 岗位：
                    {selectedMember.user.position || "未指定"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-500/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Quick Summary Bar */}
            <div className="px-6 py-3 bg-indigo-500/5 border-b border-indigo-500/10 flex flex-wrap items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground">计划总工时：</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedMember.plannedHours}h ({selectedMember.plannedWorkdays}人天)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">实际总工时：</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedMember.actualHours}h ({selectedMember.actualWorkdays}人天)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">工时偏差：</span>
                  <span
                    className={`font-bold ${
                      selectedMember.varianceHours > 0 ? "text-amber-500" : "text-blue-400"
                    }`}
                  >
                    {selectedMember.varianceHours > 0 ? "+" : ""}
                    {selectedMember.varianceHours}h
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground font-medium">
                共参与 <span className="text-indigo-500 font-bold">{selectedMember.level1TaskCount}</span> 个一级任务
              </div>
            </div>

            {/* Modal Body: 一级任务列表 */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedMember.level1Tasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  该人员在选定时间范围内暂无参与的一级任务记录。
                </div>
              ) : (
                selectedMember.level1Tasks.map((task) => {
                  const isExpanded = expandedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 overflow-hidden"
                    >
                      {/* 一级任务头部 */}
                      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-500 font-bold">
                              #{task.sequenceNo}
                            </span>
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {task.title}
                            </span>

                            {/* 状态 Tag */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                statusBadgeColors[task.status] || statusBadgeColors.UNSCHEDULED
                              }`}
                            >
                              {statusLabels[task.status] || task.status}
                            </span>

                            {/* SDLC Tag */}
                            {task.sdlcNode && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400">
                                {sdlcLabels[task.sdlcNode] || task.sdlcNode}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>所属团队：{task.productLineTeamName}</span>
                            <span>
                              计划时间：
                              {task.planStartDate
                                ? format(new Date(task.planStartDate), "yyyy-MM-dd", {
                                    locale: zhCN,
                                  })
                                : "未设定"}{" "}
                              ~{" "}
                              {task.planEndDate
                                ? format(new Date(task.planEndDate), "yyyy-MM-dd", {
                                    locale: zhCN,
                                  })
                                : "未设定"}
                            </span>
                          </div>
                        </div>

                        {/* 工时指标与折叠按钮 */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">
                              计划：<span className="text-indigo-400">{task.userPlannedHours}h</span> | 实际：
                              <span className="text-emerald-400">{task.userActualHours}h</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              进度：{task.progressPercent}%
                            </div>
                          </div>

                          {task.subtasks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="px-2.5 py-1 text-xs rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 transition"
                            >
                              {isExpanded ? "收起子任务" : `查看子任务 (${task.subtasks.length})`}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 子任务展开明细 */}
                      {isExpanded && task.subtasks.length > 0 && (
                        <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 divide-y divide-slate-200/50 dark:divide-slate-700/50 text-xs">
                          <div className="text-[11px] font-semibold text-muted-foreground pb-2">
                            该人员直接承接的拆分子任务清单：
                          </div>
                          {task.subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="py-2 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  #{sub.sequenceNo}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium">
                                  {sub.title}
                                </span>
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-slate-500/10 text-slate-500">
                                  L{sub.level}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
                                <span>
                                  计划：{sub.plannedWorkdays * 8}h ({sub.plannedWorkdays}天)
                                </span>
                                <span>
                                  实际：{sub.actualWorkdays * 8}h ({sub.actualWorkdays}天)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
