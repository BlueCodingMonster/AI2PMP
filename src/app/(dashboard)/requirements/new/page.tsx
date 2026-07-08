import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import RequirementForm from "@/components/requirements/requirement-form";
import { getAssignees, getProjectsList } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";

export default async function NewRequirementPage() {
  // 获取数据
  const [usersResult, projectsResult, teamsResult] = await Promise.all([
    getAssignees(),
    getProjectsList(),
    getProductLineTeams(),
  ]);

  const users = usersResult.success ? usersResult.data : [];
  const projects = projectsResult.success ? projectsResult.data : [];
  const productLineTeams = (teamsResult.success ? teamsResult.data : []).map((t: any) => ({ id: t.id, name: t.name }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 头部面包屑 / 导航 */}
      <div className="space-y-2">
        <Link
          href="/requirements"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回需求池
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">提报新需求</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          填写并提交产品新创意或技术债务。新提交的需求默认保存为「草稿」状态，待评审。
        </p>
      </div>

      {/* 需求表单 */}
      <RequirementForm users={users} projects={projects} productLineTeams={productLineTeams} />
    </div>
  );
}
