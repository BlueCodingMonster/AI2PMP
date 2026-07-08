import Link from "next/link";
import { ArrowLeft, FolderKanban } from "lucide-react";
import ProjectForm from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回项目列表
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">创建新项目</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          项目是协作和任务管理的物理边界，创建项目后可以邀请团队成员并分配研发职责。
        </p>
      </div>

      <ProjectForm />
    </div>
  );
}
