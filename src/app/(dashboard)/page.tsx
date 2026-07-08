import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  FolderKanban,
  CheckSquare,
  Bug,
  Clock,
  TrendingUp,
  Activity,
  FileText,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

// ===== 统计卡片数据（占位） =====
const statsCards = [
  {
    label: "进行中项目",
    value: "5",
    icon: FolderKanban,
    trend: "+2 本月",
    gradient: "from-indigo-600/20 to-indigo-600/5",
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-500/20",
  },
  {
    label: "待处理任务",
    value: "12",
    icon: CheckSquare,
    trend: "3 个高优先",
    gradient: "from-purple-600/20 to-purple-600/5",
    iconColor: "text-purple-400",
    borderColor: "border-purple-500/20",
  },
  {
    label: "未解决 Bug",
    value: "8",
    icon: Bug,
    trend: "2 个紧急",
    gradient: "from-rose-600/20 to-rose-600/5",
    iconColor: "text-rose-400",
    borderColor: "border-rose-500/20",
  },
  {
    label: "本月工时",
    value: "156h",
    icon: Clock,
    trend: "日均 7.8h",
    gradient: "from-amber-600/20 to-amber-600/5",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
];

// ===== 最近活动数据（占位） =====
const recentActivities = [
  {
    id: 1,
    user: "张三",
    action: "完成了任务",
    target: "用户认证模块开发",
    time: "10 分钟前",
    icon: CheckSquare,
    color: "text-emerald-400",
  },
  {
    id: 2,
    user: "李四",
    action: "提交了 Bug",
    target: "登录页面样式错位",
    time: "30 分钟前",
    icon: Bug,
    color: "text-rose-400",
  },
  {
    id: 3,
    user: "王五",
    action: "创建了需求",
    target: "数据导出功能",
    time: "1 小时前",
    icon: FileText,
    color: "text-indigo-400",
  },
  {
    id: 4,
    user: "赵六",
    action: "更新了项目进度",
    target: "AI2PmP V1.0",
    time: "2 小时前",
    icon: TrendingUp,
    color: "text-purple-400",
  },
  {
    id: 5,
    user: "张三",
    action: "评论了任务",
    target: "API 接口设计评审",
    time: "3 小时前",
    icon: Activity,
    color: "text-sky-400",
  },
];

// ===== 我的待办数据（占位） =====
const myTodos = [
  {
    id: 1,
    title: "完成用户权限模块的技术方案",
    priority: "高",
    priorityColor: "bg-rose-500/20 text-rose-400",
    dueDate: "今天",
  },
  {
    id: 2,
    title: "评审数据库表结构设计",
    priority: "中",
    priorityColor: "bg-amber-500/20 text-amber-400",
    dueDate: "明天",
  },
  {
    id: 3,
    title: "编写 API 接口文档",
    priority: "中",
    priorityColor: "bg-amber-500/20 text-amber-400",
    dueDate: "07/08",
  },
  {
    id: 4,
    title: "修复登录页面在 Safari 下的兼容问题",
    priority: "高",
    priorityColor: "bg-rose-500/20 text-rose-400",
    dueDate: "07/09",
  },
  {
    id: 5,
    title: "项目周报整理",
    priority: "低",
    priorityColor: "bg-sky-500/20 text-sky-400",
    dueDate: "07/11",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const username = session.user.name || "用户";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== 欢迎区域 ===== */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          你好，{username} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          欢迎回到 AI2PmP 研发项目管理系统，以下是你的工作概览。
        </p>
      </div>

      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.gradient} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
          >
            {/* 装饰光斑 */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/3 blur-2xl transition-all duration-500 group-hover:h-32 group-hover:w-32" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.trend}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ${card.iconColor}`}
              >
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 下方双列布局 ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 最近活动 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">最近活动</h2>
            <button className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              查看全部
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${activity.color}`}
                >
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-card-foreground">
                    <span className="font-medium text-white">
                      {activity.user}
                    </span>{" "}
                    {activity.action}{" "}
                    <span className="font-medium text-indigo-400">
                      {activity.target}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 我的待办 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">我的待办</h2>
            <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              <AlertCircle className="h-3 w-3" />
              {myTodos.length} 项
            </span>
          </div>

          <div className="space-y-1">
            {myTodos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
              >
                {/* 复选框样式占位 */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-indigo-500">
                  <div className="h-2 w-2 rounded-sm bg-transparent transition-colors group-hover:bg-indigo-500/50" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-card-foreground group-hover:text-white transition-colors">
                    {todo.title}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${todo.priorityColor}`}
                >
                  {todo.priority}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {todo.dueDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
