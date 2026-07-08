import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import RequirementForm from "@/components/requirements/requirement-form";
import { getRequirementById, getAssignees, getProjectsList } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";

interface EditPageProps {
  params: Promise<{
    requirementId: string;
  }>;
}

export default async function EditRequirementPage({ params }: EditPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { requirementId } = await params;
  const [reqResult, usersResult, projectsResult, teamsResult] = await Promise.all([
    getRequirementById(requirementId),
    getAssignees(),
    getProjectsList(),
    getProductLineTeams(),
  ]);

  if (!reqResult.success || !reqResult.data) {
    notFound();
  }

  const req = reqResult.data;
  const users = usersResult.success ? usersResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((t: any) => ({ id: t.id, name: t.name }));

  // 校验权限：仅创建者或管理员可以编辑
  const hasEditPermission = req.createdById === session.user.id || session.user.isAdmin;
  if (!hasEditPermission) {
    redirect(`/requirements/${req.id}`);
  }

  // 格式化初始数据以匹配表单
  const initialData = {
    id: req.id,
    title: req.title,
    description: req.description || "",
    type: req.type,
    source: req.source,
    priority: req.priority,
    businessValue: req.businessValue,
    complexity: req.complexity,
    estimatedDays: req.estimatedDays,
    projectId: req.projectId || "",
    assigneeId: req.assigneeId || "",
    acceptanceCriteria: req.acceptanceCriteria || "",
    productLineTeamId: req.productLineTeamId || "",
    proposer: req.proposer || "",
    proposedAt: req.proposedAt,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 头部面包屑 */}
      <div className="space-y-2">
        <Link
          href={`/requirements/${req.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回需求详情
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">编辑需求</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          修改需求的详细信息，完成后点击保存。
        </p>
      </div>

      {/* 编辑表单 */}
      <RequirementForm users={users} projects={projects} productLineTeams={productLineTeams} initialData={initialData} />
    </div>
  );
}
