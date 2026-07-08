import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FolderKanban } from "lucide-react";
import ProjectForm from "@/components/projects/project-form";
import { getProjectById } from "@/actions/projects";
import { auth } from "@/lib/auth";

interface EditProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;
  const result = await getProjectById(projectId);

  if (!result.success || !result.data) {
    notFound();
  }

  const project = result.data;

  // 格式化初始数据以匹配表单
  const initialData = {
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description || "",
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回项目详情
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">修改项目设置</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          调整项目的周期、状态与描述。
        </p>
      </div>

      <ProjectForm initialData={initialData} />
    </div>
  );
}
