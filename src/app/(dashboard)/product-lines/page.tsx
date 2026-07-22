import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProductLinesClient from "@/components/product-lines/product-lines-client";
import { Layers } from "lucide-react";

export const metadata = {
  title: "SDLC · 产品线小组",
  description: "SDLC · 研发效能平台 - 研发组织架构与产品线架构",
};

export default async function ProductLinesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!session.user.isAdmin) {
    redirect("/");
  }

  const result = await getProductLineTeams();
  const teams = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部标题区 */}
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">产品线研发小组</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          按产品线组织固定团队，包含组长（由产品经理或研发工程师担任）、PM、前后端开发及测试成员；支持临时借调派遣。
        </p>
      </div>

      {/* 小组管理大盘组件 */}
      <ProductLinesClient initialTeams={teams} />
    </div>
  );
}
