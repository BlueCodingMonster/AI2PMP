import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  AlertCircle,
  MessageSquare,
  Activity,
  Users,
  Settings,
  ShieldAlert,
  UserCheck,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";
import { ManagedTaskStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. 从数据库中获取完整的用户信息以支持多层级、多岗位的仪表盘展示
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userId = dbUser.id;
  const username = dbUser.name || "用户";
  const userPosition = dbUser.position || "研发人员";
  const userLevel = dbUser.level || "员工";
  const userDept = dbUser.department || "研发部门";

  // 根据用户的岗位和层级判断角色分类
  const isSystemAdmin = dbUser.isAdmin;
  const isDeptManager = userLevel === "部门经理";
  const isProductManager = userPosition === "产品经理";

  // -------------------------------------------------------------
  // 视图类型一：部门经理 / 系统管理员 (管理大局，聚焦于团队、项目和宏观WBS任务)
  // -------------------------------------------------------------
  if (isSystemAdmin || isDeptManager) {
    // 实施中项目数
    const projectCount = await prisma.project.count({
      where: {
        status: { in: ["CONTRACT_SIGNED", "IMPLEMENTING", "ACCEPTANCE"] },
      },
    });

    // 部门在办 WBS 任务数
    const deptTaskCount = await prisma.managedTask.count({
      where: {
        status: { in: [ManagedTaskStatus.TODO, ManagedTaskStatus.IN_PROGRESS] },
      },
    });

    // 部门未排期任务数
    const unscheduledTaskCount = await prisma.managedTask.count({
      where: {
        status: ManagedTaskStatus.UNSCHEDULED,
      },
    });

    // 待处理需求数
    const pendingRequirementCount = await prisma.requirement.count({
      where: {
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
      },
    });

    const statsCards = [
      {
        label: "部门实施中项目",
        value: projectCount.toString(),
        icon: FolderKanban,
        trend: "当前部门管理的活跃项目总数",
        gradient: "from-indigo-600/20 to-indigo-600/5",
        iconColor: "text-indigo-400",
        borderColor: "border-indigo-500/20",
      },
      {
        label: "部门在办 WBS 任务",
        value: deptTaskCount.toString(),
        icon: CheckSquare,
        trend: "进行中或待办的 WBS 任务总数",
        gradient: "from-purple-600/20 to-purple-600/5",
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/20",
      },
      {
        label: "未排期 WBS 任务",
        value: unscheduledTaskCount.toString(),
        icon: ShieldAlert,
        trend: "待分配执行人或排期的叶子任务",
        gradient: "from-amber-600/20 to-amber-600/5",
        iconColor: "text-amber-400",
        borderColor: "border-amber-500/20",
      },
      {
        label: "待处理需求",
        value: pendingRequirementCount.toString(),
        icon: FileText,
        trend: "待评审或评审中的产品需求数",
        gradient: "from-rose-600/20 to-rose-600/5",
        iconColor: "text-rose-400",
        borderColor: "border-rose-500/20",
      },
    ];

    // 获取部门待办任务列表 (WBS任务)
    const deptTodos = await prisma.managedTask.findMany({
      where: {
        status: { in: [ManagedTaskStatus.TODO, ManagedTaskStatus.IN_PROGRESS] },
      },
      take: 8,
      orderBy: {
        planEndDate: "asc",
      },
      include: {
        executor: { select: { name: true } },
        productLineTeam: { select: { name: true } },
      },
    });

    const formattedTodos = deptTodos.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.productLineTeam.name} | 执行人：${t.executor?.name || "未指定"}`,
      typeLabel: "WBS",
      priority: "中",
      priorityColor: "bg-amber-500/20 text-amber-400",
      dueDate: t.planEndDate
        ? new Date(t.planEndDate).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
        : "无期限",
      link: "/managed-tasks",
    }));

    // 获取系统最新动态 (最新需求、项目更新、最新WBS任务状态变更)
    const recentRequirements = await prisma.requirement.findMany({
      take: 4,
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });

    const recentProjects = await prisma.project.findMany({
      take: 4,
      orderBy: { updatedAt: "desc" },
      include: { projectManager: { select: { name: true } } },
    });

    const recentWbsLogs = await prisma.managedTaskStatusLog.findMany({
      take: 4,
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { name: true } },
        task: { select: { title: true } },
      },
    });

    const activities: any[] = [];
    recentWbsLogs.forEach((log) => {
      activities.push({
        id: `wbs-log-${log.id}`,
        user: log.changedBy.name || "成员",
        action: "更新了 WBS 任务状态",
        target: log.task.title,
        time: log.changedAt,
        icon: CheckSquare,
        color: "text-emerald-400",
      });
    });
    recentRequirements.forEach((r) => {
      activities.push({
        id: `req-${r.id}`,
        user: r.createdBy.name || "成员",
        action: "创建了需求",
        target: r.title,
        time: r.createdAt,
        icon: FileText,
        color: "text-amber-400",
      });
    });
    recentProjects.forEach((p) => {
      activities.push({
        id: `proj-${p.id}`,
        user: p.projectManager?.name || "PM",
        action: "更新了项目",
        target: p.name,
        time: p.updatedAt,
        icon: FolderKanban,
        color: "text-indigo-400",
      });
    });

    const recentActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
      .map((act) => {
        let timeStr = "刚刚";
        try {
          timeStr = formatDistanceToNow(new Date(act.time), { addSuffix: true, locale: zhCN });
        } catch {
          timeStr = new Date(act.time).toLocaleDateString();
        }
        return { ...act, time: timeStr };
      });

    return (
      <div className="space-y-6 animate-fade-in">
        {/* ===== 欢迎区域 ===== */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">你好，{username}</h1>
            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              {isSystemAdmin ? "系统管理员" : `${userDept} · 部门经理`}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            这是您的<b>部门管理工作台</b>，支持监控部门实施项目、WBS 待办任务整体走势和最新动态。
          </p>
        </div>

        {/* ===== 统计卡片 ===== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/3 blur-2xl transition-all duration-500 group-hover:h-32 group-hover:w-32" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">{card.trend}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ${card.iconColor}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 下方双列布局 ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 最近动态 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">全局动态监控</h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-1">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-card-foreground">
                        <span className="font-medium text-white">{activity.user}</span> {activity.action}{" "}
                        <span className="font-medium text-indigo-400">{activity.target}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无最近活动动态</div>
              )}
            </div>
          </div>

          {/* 我的待办 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">部门 WBS 待办任务监视</h2>
              <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                <AlertCircle className="h-3 w-3" />
                {formattedTodos.length} 项
              </span>
            </div>

            <div className="space-y-1">
              {formattedTodos.length > 0 ? (
                formattedTodos.map((todo) => (
                  <Link
                    key={todo.id}
                    href={todo.link}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-indigo-500">
                      <div className="h-2 w-2 rounded-sm bg-transparent transition-colors group-hover:bg-indigo-500/50" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-card-foreground group-hover:text-white transition-colors">
                        {todo.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {todo.subtitle}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                      {todo.typeLabel}
                    </span>

                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${todo.priorityColor}`}>
                      {todo.priority}
                    </span>

                    <span className="shrink-0 text-xs text-muted-foreground">{todo.dueDate}</span>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">目前无进行中的待办任务。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 视图类型二：产品经理 (聚焦需求、产品线及规划，卡片重点关注需求池状态)
  // -------------------------------------------------------------
  if (isProductManager) {
    // 待评审需求
    const pendingReqCount = await prisma.requirement.count({
      where: { status: "PENDING_REVIEW" },
    });
    // 评审中需求
    const underReviewReqCount = await prisma.requirement.count({
      where: { status: "UNDER_REVIEW" },
    });
    // 已排期需求
    const scheduledReqCount = await prisma.requirement.count({
      where: { status: "SCHEDULED" },
    });
    // 进行中项目
    const activeProjCount = await prisma.project.count({
      where: { status: { in: ["CONTRACT_SIGNED", "IMPLEMENTING", "ACCEPTANCE"] } },
    });

    const statsCards = [
      {
        label: "待评审需求",
        value: pendingReqCount.toString(),
        icon: FileText,
        trend: "等待您进行初审的需求",
        gradient: "from-rose-600/20 to-rose-600/5",
        iconColor: "text-rose-400",
        borderColor: "border-rose-500/20",
      },
      {
        label: "评审中需求",
        value: underReviewReqCount.toString(),
        icon: MessageSquare,
        trend: "正处于技术/业务评审中的需求",
        gradient: "from-amber-600/20 to-amber-600/5",
        iconColor: "text-amber-400",
        borderColor: "border-amber-500/20",
      },
      {
        label: "已排期需求",
        value: scheduledReqCount.toString(),
        icon: CheckSquare,
        trend: "已进入开发迭代计划的需求数",
        gradient: "from-purple-600/20 to-purple-600/5",
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/20",
      },
      {
        label: "实施中项目",
        value: activeProjCount.toString(),
        icon: FolderKanban,
        trend: "系统承载的实施中项目数",
        gradient: "from-indigo-600/20 to-indigo-600/5",
        iconColor: "text-indigo-400",
        borderColor: "border-indigo-500/20",
      },
    ];

    // 获取待评审的需求列表
    const pendingReqs = await prisma.requirement.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
      },
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const formattedReqs = pendingReqs.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: `提议人：${r.proposer || r.createdBy.name || "匿名"} | 来源：${
        r.source === "PRODUCT_PLANNING"
          ? "产品规划"
          : r.source === "CUSTOMER_FEEDBACK"
          ? "客户反馈"
          : r.source === "INTERNAL_REQUEST"
          ? "内部需求"
          : "市场需求"
      }`,
      typeLabel: "需求",
      priority: r.priority === "URGENT" ? "紧急" : r.priority === "HIGH" ? "高" : r.priority === "MEDIUM" ? "中" : "低",
      priorityColor:
        r.priority === "URGENT" || r.priority === "HIGH"
          ? "bg-rose-500/20 text-rose-400"
          : r.priority === "MEDIUM"
          ? "bg-amber-500/20 text-amber-400"
          : "bg-sky-500/20 text-sky-400",
      dueDate: r.proposedAt ? new Date(r.proposedAt).toLocaleDateString("zh-CN") : "未定",
      link: "/requirements",
    }));

    // 获取我的 WBS 任务列表
    const myPmTasks = await prisma.managedTask.findMany({
      where: {
        executorId: userId,
        status: { in: [ManagedTaskStatus.TODO, ManagedTaskStatus.IN_PROGRESS] },
      },
      take: 8,
      orderBy: { planEndDate: "asc" },
      include: { productLineTeam: { select: { name: true } } },
    });

    const formattedTodos = myPmTasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.productLineTeam.name,
      typeLabel: "WBS",
      priority: "中",
      priorityColor: "bg-amber-500/20 text-amber-400",
      dueDate: t.planEndDate ? new Date(t.planEndDate).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "无期限",
      link: "/managed-tasks",
    }));

    return (
      <div className="space-y-6 animate-fade-in">
        {/* ===== 欢迎区域 ===== */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">你好，{username}</h1>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
              产品规划部 · 产品经理
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            这是您的<b>产品规划工作台</b>，集中处理需求提案评审、管理规划进度与产品需求池。
          </p>
        </div>

        {/* ===== 统计卡片 ===== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/3 blur-2xl transition-all duration-500 group-hover:h-32 group-hover:w-32" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">{card.trend}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ${card.iconColor}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 下方双列布局 ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 需求池处理 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white font-sans">待处理产品需求提案</h2>
              <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                {formattedReqs.length} 项待评审
              </span>
            </div>

            <div className="space-y-1">
              {formattedReqs.length > 0 ? (
                formattedReqs.map((req) => (
                  <Link
                    key={req.id}
                    href={req.link}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-rose-500">
                      <div className="h-2 w-2 rounded-sm bg-transparent transition-colors group-hover:bg-rose-500/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-card-foreground group-hover:text-white transition-colors">
                        {req.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {req.subtitle}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${req.priorityColor}`}>
                      {req.priority}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">目前无等待评审的需求提案。</div>
              )}
            </div>
          </div>

          {/* 我的待办 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">我的 WBS 待办</h2>
              <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                <AlertCircle className="h-3 w-3" />
                {formattedTodos.length} 项
              </span>
            </div>

            <div className="space-y-1">
              {formattedTodos.length > 0 ? (
                formattedTodos.map((todo) => (
                  <Link
                    key={todo.id}
                    href={todo.link}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-indigo-500">
                      <div className="h-2 w-2 rounded-sm bg-transparent transition-colors group-hover:bg-indigo-500/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-card-foreground group-hover:text-white transition-colors">
                        {todo.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {todo.subtitle}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${todo.priorityColor}`}>
                      {todo.priority}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{todo.dueDate}</span>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">没有指派给您的未完成任务。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 视图类型三：研发普通员工 (聚焦于个人执行，卡片突出展示个人待办、已完成人天和参与项目)
  // -------------------------------------------------------------
  // 进行中 WBS 任务数
  const myTaskCount = await prisma.managedTask.count({
    where: {
      executorId: userId,
      status: { in: [ManagedTaskStatus.TODO, ManagedTaskStatus.IN_PROGRESS] },
    },
  });

  // 本月已完工任务数
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const myCompletedCount = await prisma.managedTask.count({
    where: {
      executorId: userId,
      status: ManagedTaskStatus.DONE,
      actualFinishAt: { gte: startOfMonth },
    },
  });

  // 参与的项目数
  const myProjectCount = await prisma.projectMember.count({
    where: { userId },
  });

  // 个人累计已完成人天工作量
  const workdaySum = await prisma.managedTask.aggregate({
    where: {
      executorId: userId,
      status: ManagedTaskStatus.DONE,
    },
    _sum: {
      actualWorkdays: true,
    },
  });
  const totalWorkdays = workdaySum._sum.actualWorkdays || 0;

  const statsCards = [
    {
      label: "我的 WBS 待办",
      value: myTaskCount.toString(),
      icon: CheckSquare,
      trend: "指派给你的在办开发任务",
      gradient: "from-purple-600/20 to-purple-600/5",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/20",
    },
    {
      label: "本月已完工 WBS",
      value: myCompletedCount.toString(),
      icon: UserCheck,
      trend: "本月已按时完成并核销的叶子任务数",
      gradient: "from-indigo-600/20 to-indigo-600/5",
      iconColor: "text-indigo-400",
      borderColor: "border-indigo-500/20",
    },
    {
      label: "参与项目总数",
      value: myProjectCount.toString(),
      icon: FolderKanban,
      trend: "您当前所属的项目成员组个数",
      gradient: "from-rose-600/20 to-rose-600/5",
      iconColor: "text-rose-400",
      borderColor: "border-rose-500/20",
    },
    {
      label: "个人累计完工工作量",
      value: `${totalWorkdays} 人天`,
      icon: Clock,
      trend: "已完成叶子任务的实际工时累积",
      gradient: "from-amber-600/20 to-amber-600/5",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
  ];

  // 我的待办任务列表 (WBS 计划)
  const myTodosList = await prisma.managedTask.findMany({
    where: {
      executorId: userId,
      status: { in: [ManagedTaskStatus.TODO, ManagedTaskStatus.IN_PROGRESS] },
    },
    take: 8,
    orderBy: {
      planEndDate: "asc",
    },
    include: {
      productLineTeam: { select: { name: true } },
    },
  });

  const formattedTodos = myTodosList.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.productLineTeam.name,
    typeLabel: "WBS",
    priority: "中",
    priorityColor: "bg-amber-500/20 text-amber-400",
    dueDate: t.planEndDate
      ? new Date(t.planEndDate).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
      : "无期限",
    link: "/managed-tasks",
  }));

  // 获取我参与的小组的最新 WBS 活动状态变更日志 (没有的话拉取全局)
  const myTeams = await prisma.productLineMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const myTeamIds = myTeams.map((m) => m.teamId);

  const recentWbsLogs = await prisma.managedTaskStatusLog.findMany({
    where: myTeamIds.length > 0 ? { task: { productLineTeamId: { in: myTeamIds } } } : undefined,
    take: 8,
    orderBy: { changedAt: "desc" },
    include: {
      changedBy: { select: { name: true } },
      task: { select: { title: true } },
    },
  });

  const recentActivities = recentWbsLogs.map((log) => {
    let timeStr = "刚刚";
    try {
      timeStr = formatDistanceToNow(new Date(log.changedAt), { addSuffix: true, locale: zhCN });
    } catch {
      timeStr = new Date(log.changedAt).toLocaleDateString();
    }
    return {
      id: `team-wbs-log-${log.id}`,
      user: log.changedBy.name || "成员",
      action: "更新了 WBS 任务状态",
      target: log.task.title,
      time: timeStr,
      icon: Zap,
      color: "text-emerald-400",
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== 欢迎区域 ===== */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">你好，{username} 👋</h1>
          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
            {userDept} · {userPosition}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          欢迎回到 SDLC 研发效能平台，这是您的<b>个人研发工作台</b>。
        </p>
      </div>

      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
          >
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/3 blur-2xl transition-all duration-500 group-hover:h-32 group-hover:w-32" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">{card.trend}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ${card.iconColor}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 下方双列布局 ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 我的小组动态 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">小组最近动态</h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-card-foreground">
                      <span className="font-medium text-white">{activity.user}</span> {activity.action}{" "}
                      <span className="font-medium text-indigo-400">{activity.target}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无小组最近活动动态</div>
            )}
          </div>
        </div>

        {/* 我的待办 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">我的待办任务</h2>
            <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              <AlertCircle className="h-3 w-3" />
              {formattedTodos.length} 项
            </span>
          </div>

          <div className="space-y-1">
            {formattedTodos.length > 0 ? (
              formattedTodos.map((todo) => (
                <Link
                  key={todo.id}
                  href={todo.link}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-indigo-500">
                    <div className="h-2 w-2 rounded-sm bg-transparent transition-colors group-hover:bg-indigo-500/50" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-card-foreground group-hover:text-white transition-colors">
                      {todo.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {todo.subtitle}
                    </p>
                  </div>

                  <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
                    {todo.typeLabel}
                  </span>

                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${todo.priorityColor}`}>
                    {todo.priority}
                  </span>

                  <span className="shrink-0 text-xs text-muted-foreground">{todo.dueDate}</span>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">太棒了，目前没有未完成的待办任务！</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
