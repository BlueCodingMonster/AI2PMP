import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bug } from "lucide-react";
import BugForm from "@/components/bugs/bug-form";
import { getBugById } from "@/actions/bugs";
import { getProjectsList, getAssignees } from "@/actions/requirements";
import { auth } from "@/lib/auth";

interface EditBugPageProps {
  params: Promise<{
    bugId: string;
  }>;
}

export default async function EditBugPage({ params }: EditBugPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { bugId } = await params;

  // 并行获取当前缺陷详情、项目列表、人员选项
  const [bugResult, projectsResult, usersResult] = await Promise.all([
    getBugById(bugId),
    getProjectsList(),
    getAssignees(),
  ]);

  if (!bugResult.success || !bugResult.data) {
    notFound();
  }

  const bug = bugResult.data;
  const projects = projectsResult.success ? projectsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  // 格式化初始数据
  const initialData = {
    id: bug.id,
    title: bug.title,
    description: bug.description || "",
    projectId: bug.projectId,
    assigneeId: bug.assigneeId || "",
    status: bug.status,
    severity: bug.severity,
    priority: bug.priority,
    environment: bug.environment || "",
    stepsToReproduce: bug.stepsToReproduce || "",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href={`/bugs/${bug.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回缺陷详情
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bug className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">修改缺陷设置</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          调整 Bug 标题、描述、重现步骤或修改分配负责人。
        </p>
      </div>

      <BugForm projects={projects} users={users} initialData={initialData} />
    </div>
  );
}
