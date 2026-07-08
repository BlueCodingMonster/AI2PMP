"use client";

import { BarChart3, Clock, FolderOpen, Calendar, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ReportsClientProps {
  summary: {
    totalHours: number;
    projectDistribution: { name: string; key: string; hours: number }[];
    dailyTrend: { date: string; hours: number }[];
    recentLogs: any[];
  };
}

export default function ReportsClient({ summary }: ReportsClientProps) {
  const { totalHours, projectDistribution, dailyTrend, recentLogs } = summary;

  // 计算报表辅助数据
  const projectCount = projectDistribution.length;
  const averageDailyHours = dailyTrend.length > 0 
    ? (dailyTrend.reduce((sum, item) => sum + item.hours, 0) / dailyTrend.length).toFixed(1)
    : "0.0";

  // 1. 条形图辅助计算 (近7天工时走势)
  const chartHeight = 160;
  const maxHours = Math.max(...dailyTrend.map((d) => d.hours), 5); // 最小上限为 5h

  // 2. 环形图辅助计算 (项目工时分布)
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~314.16
  let accumulatedPercent = 0;

  return (
    <div className="space-y-6 text-xs sm:text-sm animate-fade-in">
      {/* 核心指标统计 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* 指标卡片 1 */}
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">累计登记工时</span>
            <div className="text-xl font-bold text-white mt-0.5">{totalHours} <span className="text-xs font-normal text-muted-foreground">小时</span></div>
          </div>
        </div>

        {/* 指标卡片 2 */}
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">覆盖项目总数</span>
            <div className="text-xl font-bold text-white mt-0.5">{projectCount} <span className="text-xs font-normal text-muted-foreground">个</span></div>
          </div>
        </div>

        {/* 指标卡片 3 */}
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">近7天日均登记</span>
            <div className="text-xl font-bold text-white mt-0.5">{averageDailyHours} <span className="text-xs font-normal text-muted-foreground">小时</span></div>
          </div>
        </div>
      </div>

      {/* 报表主体图表分栏 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧：7天统计走势与登账记录 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 7天走势图 */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              近 7 天开发工时登记走势 (小时)
            </h3>

            {/* 自定义 SVG 条形图 */}
            <div className="relative pt-4">
              <svg viewBox={`0 0 500 ${chartHeight}`} className="w-full h-44 overflow-visible">
                {/* 网格水平参考线 */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const y = chartHeight - p * chartHeight;
                  const labelVal = (p * maxHours).toFixed(1);
                  return (
                    <g key={idx} className="opacity-40">
                      <line x1="40" y1={y} x2="500" y2={y} stroke="var(--border)" strokeDasharray="3,3" />
                      <text x="5" y={y + 4} fill="currentColor" className="text-[9px] text-muted-foreground font-mono">
                        {labelVal}h
                      </text>
                    </g>
                  );
                })}

                {/* 绘制条形柱状图 */}
                {dailyTrend.map((item, idx) => {
                  const colWidth = 45;
                  const colGap = 20;
                  const x = 50 + idx * (colWidth + colGap);
                  const barHeight = (item.hours / maxHours) * (chartHeight - 10);
                  const y = chartHeight - barHeight;

                  return (
                    <g key={item.date} className="group cursor-pointer">
                      {/* 悬浮提示框背景与文字 */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <rect x={x - 10} y={y - 25} width="65" height="18" rx="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="0.5" />
                        <text x={x + 22.5} y={y - 13} textAnchor="middle" fill="#fff" className="text-[8px] font-bold">
                          {item.hours.toFixed(1)}h
                        </text>
                      </g>

                      {/* 柱状条（渐变背景） */}
                      <rect
                        x={x}
                        y={y}
                        width={colWidth}
                        height={barHeight}
                        rx="4"
                        fill="url(#barGradient)"
                        className="transition-all duration-300 hover:opacity-80"
                      />

                      {/* 柱脚日期刻度 */}
                      <text x={x + colWidth / 2} y={chartHeight + 15} textAnchor="middle" fill="currentColor" className="text-[9px] text-muted-foreground">
                        {item.date}
                      </text>
                    </g>
                  );
                })}

                {/* 渐变滤镜定义 */}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="pt-2 text-[10px] text-muted-foreground">
              注：将鼠标悬停在条形柱上可快速查看当日总计登记的开发耗时详情。
            </div>
          </div>

          {/* 最近 10 条登账明细 */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">最新登账记录日志</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                    <th className="p-3">登记人</th>
                    <th className="p-3">所属项目</th>
                    <th className="p-3">关联任务</th>
                    <th className="p-3">描述事项</th>
                    <th className="p-3">耗时</th>
                    <th className="p-3 text-right">登记日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-muted-foreground">
                        暂无相关工时登账明细。
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/10 transition-all">
                        <td className="p-3 font-semibold text-white">{log.user.name}</td>
                        <td className="p-3 text-muted-foreground uppercase font-bold text-[10px]">
                          [{log.task.project.key}]
                        </td>
                        <td className="p-3 font-medium text-white max-w-[150px] truncate">
                          {log.task.title}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[150px] truncate">
                          {log.description || <span className="italic">未填写工作事项</span>}
                        </td>
                        <td className="p-3 font-bold text-indigo-400">{log.hours}h</td>
                        <td className="p-3 text-muted-foreground text-right">
                          {format(new Date(log.logDate), "yyyy-MM-dd", { locale: zhCN })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右侧：项目工时分布环形图与列表 */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-6">
            <h3 className="text-base font-semibold text-white">项目工时占比统计</h3>

            {/* 环形图展示 */}
            {projectCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">暂无工时分布数据</p>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-6">
                
                {/* SVG 环形 Donut Chart */}
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 120 120" className="-rotate-90 h-full w-full">
                    {/* 背景底环 */}
                    <circle cx="60" cy="60" r={donutRadius} fill="none" stroke="var(--border)" strokeWidth="10" className="opacity-30" />
                    
                    {/* 项目分段环 */}
                    {projectDistribution.map((proj, idx) => {
                      const percent = proj.hours / totalHours;
                      const strokeDasharray = `${percent * donutCircumference} ${donutCircumference}`;
                      const strokeDashoffset = -accumulatedPercent * donutCircumference;
                      accumulatedPercent += percent;

                      // 定义简单的分段渐变颜色
                      const colors = ["#4f46e5", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];
                      const segmentColor = colors[idx % colors.length];

                      return (
                        <circle
                          key={proj.name}
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="none"
                          stroke={segmentColor}
                          strokeWidth="10"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 hover:stroke-[12]"
                        />
                      );
                    })}
                  </svg>
                  
                  {/* 中心文字标签 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">总工时</span>
                    <span className="text-sm font-extrabold text-white font-mono">{totalHours}h</span>
                  </div>
                </div>

                {/* 项目工时列表细化 */}
                <div className="w-full space-y-3.5 text-xs">
                  {projectDistribution.map((proj, idx) => {
                    const percent = ((proj.hours / totalHours) * 100).toFixed(1);
                    const colors = ["bg-indigo-600", "bg-emerald-600", "bg-purple-600", "bg-amber-600", "bg-pink-600", "bg-blue-600"];
                    const barColor = colors[idx % colors.length];

                    return (
                      <div key={proj.name} className="space-y-1.5">
                        <div className="flex items-center justify-between font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${barColor}`} />
                            <span className="text-white font-semibold truncate max-w-[120px]">
                              [{proj.key}] {proj.name}
                            </span>
                          </div>
                          <span className="text-muted-foreground shrink-0 font-bold text-[10px]">
                            {proj.hours}h ({percent}%)
                          </span>
                        </div>
                        {/* 进度条 */}
                        <div className="h-1.5 w-full bg-input/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
