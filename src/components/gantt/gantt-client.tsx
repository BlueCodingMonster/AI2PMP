"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { GanttChart, Search, Calendar, ChevronRight, AlertCircle } from "lucide-react";

interface GanttClientProps {
  tasks: any[];
  projects: { id: string; name: string; key: string }[];
}

export default function GanttClient({ tasks, projects }: GanttClientProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  
  // 选择时间范围：默认当前月
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 计算当前月份的起止日期
  const startDate = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const endDate = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  // 计算当前月的所有天
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const totalDays = days.length;

  // 过滤出属于选中项目，且设置了开始和结束日期的任务
  const projectTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.projectId === selectedProjectId &&
        t.startDate &&
        t.dueDate
    );
  }, [tasks, selectedProjectId]);

  // 未设置日期的任务数量
  const undatedTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => t.projectId === selectedProjectId && (!t.startDate || !t.dueDate)
    ).length;
  }, [tasks, selectedProjectId]);

  // 前进/后退月份
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  };

  // 根据项目的 key，格式化任务编号
  const projectKey = useMemo(() => {
    const proj = projects.find((p) => p.id === selectedProjectId);
    return proj ? proj.key : "TASK";
  }, [projects, selectedProjectId]);

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      {/* 控制面板 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 项目过滤 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs text-white focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          {/* 月份切换器 */}
          <div className="flex items-center gap-2 bg-input/40 border border-border rounded-lg p-0.5">
            <button
              onClick={handlePrevMonth}
              className="px-2 py-1 hover:bg-muted text-white rounded transition-colors text-xs"
            >
              &lt; 上个月
            </button>
            <span className="px-3 text-xs font-semibold text-white">
              {format(currentMonth, "yyyy年MM月", { locale: zhCN })}
            </span>
            <button
              onClick={handleNextMonth}
              className="px-2 py-1 hover:bg-muted text-white rounded transition-colors text-xs"
            >
              下个月 &gt;
            </button>
          </div>
        </div>

        {undatedTasksCount > 0 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            已隐藏 {undatedTasksCount} 个未设置起止日期的任务
          </div>
        )}
      </div>

      {/* 甘特图主体结构 */}
      {projectTasks.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground">
          该项目在此周期内暂无已排期的开发任务。请先为任务设置「计划开始/结束日期」。
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden border border-border/60 flex flex-col">
          {/* 顶层网格头部滚动容器 */}
          <div className="overflow-x-auto">
            {/* 设定最小宽度保证天数格子不挤压 */}
            <div className="min-w-[800px] flex">
              
              {/* 左侧任务名称栏头部 */}
              <div className="w-64 shrink-0 border-r border-border bg-muted/20 p-3 font-semibold text-white flex items-center">
                任务列表名称
              </div>

              {/* 右侧时间轴刻度头部 */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(30px, 1fr))` }}>
                {days.map((day) => {
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <div
                      key={day.toString()}
                      className={`text-center py-2 border-r border-border/30 text-[9px] flex flex-col items-center justify-center font-medium ${
                        isToday
                          ? "bg-indigo-500/10 text-indigo-400 font-bold"
                          : isWeekend
                          ? "bg-black/20 text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>{format(day, "dd")}</span>
                      <span className="text-[8px] opacity-70">
                        {format(day, "eeeee", { locale: zhCN })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 列表行 */}
            <div className="min-w-[800px] divide-y divide-border/30 border-t border-border">
              {projectTasks.map((task) => {
                // 计算当前任务的开始偏移天数和跨度天数 (限制在当前月范围内)
                const taskStart = new Date(task.startDate);
                const taskDue = new Date(task.dueDate);

                // 计算相对于当前月第一天的偏移量
                let offsetDays = differenceInDays(taskStart, startDate);
                let durationDays = differenceInDays(taskDue, taskStart) + 1;

                // 边界剪裁 (如果任务超出当前月，视觉上进行阶段裁剪)
                if (offsetDays < 0) {
                  durationDays = durationDays + offsetDays;
                  offsetDays = 0;
                }
                
                // 确保长度不超过当月剩余天数
                if (offsetDays + durationDays > totalDays) {
                  durationDays = totalDays - offsetDays;
                }

                // 若计算后剩余长度 <= 0，则该任务在这个月份没有时间线展示
                const isVisibleThisMonth = durationDays > 0 && offsetDays < totalDays;

                if (!isVisibleThisMonth) return null;

                // 状态文字及进度颜色
                const isCompleted = task.status === "DONE";

                return (
                  <div key={task.id} className="flex hover:bg-muted/5 group transition-colors">
                    
                    {/* 左侧任务名称 */}
                    <div className="w-64 shrink-0 border-r border-border p-3 flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-bold text-indigo-400 shrink-0 uppercase">
                          {projectKey}-{task.id.slice(0, 4).toUpperCase()}
                        </span>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-bold text-white hover:text-indigo-300 transition-colors truncate block text-xs"
                        >
                          {task.title}
                        </Link>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        负责人: {task.assignee?.name || "未指派"}
                      </span>
                    </div>

                    {/* 右侧时间线网格及进度条 */}
                    <div
                      className="flex-1 grid relative"
                      style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(30px, 1fr))` }}
                    >
                      {/* 背景网格线 */}
                      {days.map((day) => (
                        <div
                          key={`bg-${day.toString()}`}
                          className={`border-r border-border/10 h-full ${
                            day.getDay() === 0 || day.getDay() === 6 ? "bg-black/5" : ""
                          }`}
                        />
                      ))}

                      {/* 绝对定位进度条 */}
                      <div
                        className="absolute inset-y-0 py-2.5 flex items-center"
                        style={{
                          gridColumnStart: offsetDays + 1,
                          gridColumnEnd: offsetDays + 1 + durationDays,
                        }}
                      >
                        <div
                          className={`w-full h-5 rounded-lg flex items-center justify-between px-2.5 shadow-md transition-all group-hover:scale-[1.01] ${
                            isCompleted
                              ? "bg-gradient-to-r from-emerald-600/70 to-emerald-500/70 text-emerald-100 border border-emerald-500/20"
                              : "bg-gradient-to-r from-indigo-600/70 to-purple-600/70 text-indigo-100 border border-indigo-500/20"
                          }`}
                          title={`${task.title} (${format(taskStart, "yyyy-MM-dd")} ~ ${format(taskDue, "yyyy-MM-dd")})`}
                        >
                          <span className="text-[9px] font-bold truncate pr-1">
                            {task.status === "DONE" ? "已完成" : "进行中"}
                          </span>
                          <span className="text-[9px] font-extrabold font-mono">
                            {task.status === "DONE" ? "100%" : "进行中"}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
