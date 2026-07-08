"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductVersionStatus } from "@prisma/client";
import {
  Boxes,
  GitBranch,
  Layers3,
  Loader2,
  PackagePlus,
  Plus,
} from "lucide-react";
import {
  createProductModule,
  createProductPlatform,
  createProductVersion,
  updateProductVersionStatus,
} from "@/actions/product-lines";

type VersionTree = Array<{
  id: string;
  name: string;
  description: string | null;
  modules: Array<{
    id: string;
    name: string;
    description: string | null;
    versions: Array<{
      id: string;
      title: string;
      version: string;
      description: string | null;
      status: ProductVersionStatus;
      startDate: Date | string | null;
      releaseDate: Date | string | null;
      _count: { planItems: number };
    }>;
  }>;
}>;

interface ProductVersionsManagerProps {
  teamId: string;
  versionTree: VersionTree;
}

const statusLabels: Record<ProductVersionStatus, string> = {
  PLANNING: "规划中",
  DESIGNING: "设计中",
  DEVELOPING: "研发中",
  TESTING: "测试中",
  RELEASED: "已发布",
  DELAYED: "已延期",
  CANCELLED: "已取消",
};

const statusClasses: Record<ProductVersionStatus, string> = {
  PLANNING: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  DESIGNING: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  DEVELOPING: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  TESTING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  RELEASED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  DELAYED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  CANCELLED: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

function formatDate(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("zh-CN");
}

export default function ProductVersionsManager({ teamId, versionTree }: ProductVersionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [platformName, setPlatformName] = useState("");
  const [platformDescription, setPlatformDescription] = useState("");

  const [modulePlatformId, setModulePlatformId] = useState(versionTree[0]?.id ?? "");
  const [moduleName, setModuleName] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  const moduleOptions = useMemo(
    () =>
      versionTree.flatMap((platform) =>
        platform.modules.map((module) => ({
          id: module.id,
          name: module.name,
          platformName: platform.name,
        }))
      ),
    [versionTree]
  );

  const [versionModuleId, setVersionModuleId] = useState(moduleOptions[0]?.id ?? "");
  const [versionTitle, setVersionTitle] = useState("");
  const [versionNo, setVersionNo] = useState("");
  const [versionDescription, setVersionDescription] = useState("");
  const [versionStatus, setVersionStatus] = useState<ProductVersionStatus>(ProductVersionStatus.PLANNING);
  const [startDate, setStartDate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const submitPlatform = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProductPlatform({
        productLineTeamId: teamId,
        name: platformName,
        description: platformDescription || null,
      });

      if (!result.success) {
        setError(result.error ?? "新增产品/平台失败");
        return;
      }

      setPlatformName("");
      setPlatformDescription("");
      router.refresh();
    });
  };

  const submitModule = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProductModule({
        productPlatformId: modulePlatformId,
        name: moduleName,
        description: moduleDescription || null,
      });

      if (!result.success) {
        setError(result.error ?? "新增板块/模块失败");
        return;
      }

      setModuleName("");
      setModuleDescription("");
      router.refresh();
    });
  };

  const submitVersion = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProductVersion({
        productLineTeamId: teamId,
        productModuleId: versionModuleId,
        title: versionTitle,
        version: versionNo,
        description: versionDescription || null,
        status: versionStatus,
        startDate: startDate || null,
        releaseDate: releaseDate || null,
      });

      if (!result.success) {
        setError(result.error ?? "新增产品版本失败");
        return;
      }

      setVersionTitle("");
      setVersionNo("");
      setVersionDescription("");
      setVersionStatus(ProductVersionStatus.PLANNING);
      setStartDate("");
      setReleaseDate("");
      router.refresh();
    });
  };

  const changeStatus = (versionId: string, status: ProductVersionStatus) => {
    setError(null);

    startTransition(async () => {
      const result = await updateProductVersionStatus(versionId, { status });
      if (!result.success) {
        setError(result.error ?? "更新产品版本状态失败");
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="glass rounded-xl p-6 space-y-5 text-xs sm:text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            产品版本维护
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            在这里维护产品/平台、板块/模块和版本迭代；季度计划目标项可以选择关联到具体版本。
          </p>
        </div>
        <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
          {versionTree.length} 个产品/平台
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <form onSubmit={submitPlatform} className="rounded-lg border border-border/50 bg-black/10 p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <PackagePlus className="h-4 w-4 text-cyan-400" />
            新增产品/平台
          </h3>
          <input
            required
            value={platformName}
            onChange={(event) => setPlatformName(event.target.value)}
            placeholder="如：大陆通平台、能源管控中心"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          />
          <textarea
            rows={2}
            value={platformDescription}
            onChange={(event) => setPlatformDescription(event.target.value)}
            placeholder="范围说明，可选"
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            新增产品/平台
          </button>
        </form>

        <form onSubmit={submitModule} className="rounded-lg border border-border/50 bg-black/10 p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Layers3 className="h-4 w-4 text-indigo-400" />
            新增板块/模块
          </h3>
          <select
            required
            value={modulePlatformId}
            onChange={(event) => setModulePlatformId(event.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          >
            <option value="">选择所属产品/平台</option>
            {versionTree.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
          <input
            required
            value={moduleName}
            onChange={(event) => setModuleName(event.target.value)}
            placeholder="如：日志管理、资金账户"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          />
          <textarea
            rows={2}
            value={moduleDescription}
            onChange={(event) => setModuleDescription(event.target.value)}
            placeholder="模块边界说明，可选"
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending || !modulePlatformId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            新增板块/模块
          </button>
        </form>

        <form onSubmit={submitVersion} className="rounded-lg border border-border/50 bg-black/10 p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Boxes className="h-4 w-4 text-emerald-400" />
            新增版本
          </h3>
          <select
            required
            value={versionModuleId}
            onChange={(event) => setVersionModuleId(event.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          >
            <option value="">选择所属板块/模块</option>
            {moduleOptions.map((module) => (
              <option key={module.id} value={module.id}>
                {module.platformName} / {module.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              required
              value={versionTitle}
              onChange={(event) => setVersionTitle(event.target.value)}
              placeholder="版本标题"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
            />
            <input
              required
              value={versionNo}
              onChange={(event) => setVersionNo(event.target.value)}
              placeholder="版本号，如 v1.2.0"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
            />
          </div>
          <textarea
            rows={2}
            value={versionDescription}
            onChange={(event) => setVersionDescription(event.target.value)}
            placeholder="版本目标说明，可选"
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={versionStatus}
              onChange={(event) => setVersionStatus(event.target.value as ProductVersionStatus)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
            />
            <input
              type="date"
              value={releaseDate}
              onChange={(event) => setReleaseDate(event.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-white outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !versionModuleId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            新增版本
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {versionTree.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-xs text-muted-foreground">
            当前产品线还没有维护产品/平台。先新增产品/平台，再新增模块和版本。
          </div>
        ) : (
          versionTree.map((platform) => (
            <div key={platform.id} className="rounded-lg border border-border/50 bg-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{platform.name}</h3>
                  {platform.description && <p className="mt-1 text-xs text-muted-foreground">{platform.description}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{platform.modules.length} 个模块</span>
              </div>

              <div className="mt-4 space-y-3">
                {platform.modules.length === 0 ? (
                  <p className="rounded border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                    暂无板块/模块。
                  </p>
                ) : (
                  platform.modules.map((module) => (
                    <div key={module.id} className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white">{module.name}</h4>
                          {module.description && <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{module.versions.length} 个版本</span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {module.versions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">暂无版本。</p>
                        ) : (
                          module.versions.map((version) => (
                            <div
                              key={version.id}
                              className="grid grid-cols-1 gap-3 rounded-lg border border-border/40 bg-black/10 p-3 md:grid-cols-[1fr_auto]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-white">{version.title}</span>
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    {version.version}
                                  </span>
                                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusClasses[version.status]}`}>
                                    {statusLabels[version.status]}
                                  </span>
                                </div>
                                {version.description && <p className="mt-1 text-xs text-muted-foreground">{version.description}</p>}
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {formatDate(version.startDate) || "未设开始"} - {formatDate(version.releaseDate) || "未设发布"} · 已关联计划项 {version._count.planItems}
                                </p>
                              </div>
                              <select
                                value={version.status}
                                onChange={(event) => changeStatus(version.id, event.target.value as ProductVersionStatus)}
                                disabled={isPending}
                                className="h-9 rounded-lg border border-border bg-input px-2 text-xs text-white outline-none focus:border-primary"
                              >
                                {Object.entries(statusLabels).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
