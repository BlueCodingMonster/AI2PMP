"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, Search, Loader2 } from "lucide-react";
import { useTransition } from "react";

type DateType = "proposedAt" | "createdAt" | "reviewedAt";

type TeamOption = {
  id: string;
  name: string;
};

interface RequirementFilterFormProps {
  teams: TeamOption[];
  filteredTeamIds: string[];
  selectedStatuses: string[];
  productLineSummary: string;
  statusSummary: string;
  statuses: readonly string[];
  sources: readonly string[];
  priorities: readonly string[];
  requirementStatusLabels: Record<string, string>;
  requirementSourceLabels: Record<string, string>;
  requirementPriorityLabels: Record<string, string>;
  dateTypes: Array<{ value: DateType; label: string }>;
  pageSizes: readonly number[];
  searchParams: {
    search?: string;
    source?: string;
    priority?: string;
    pageSize?: number;
    dateType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function RequirementFilterForm({
  teams,
  filteredTeamIds,
  selectedStatuses,
  productLineSummary,
  statusSummary,
  statuses,
  sources,
  priorities,
  requirementStatusLabels,
  requirementSourceLabels,
  requirementPriorityLabels,
  dateTypes,
  pageSizes,
  searchParams,
}: RequirementFilterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("filtered", "1");
    params.set("page", "1");

    for (const [key, value] of formData.entries()) {
      if (key === "filtered" || key === "page") continue;
      const strVal = String(value).trim();
      if (strVal) {
        params.append(key, strVal);
      }
    }

    startTransition(() => {
      router.push(`/requirements?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-12">
      <input type="hidden" name="filtered" value="1" />
      <input type="hidden" name="page" value="1" />
      <label className="space-y-1.5 text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
        <span>关键字搜索</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            name="search"
            defaultValue={searchParams.search ?? ""}
            placeholder="编号、名称、需求方、创建人"
            className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-xs text-white"
          />
        </div>
      </label>
      <div className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>产品线</span>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
            <span className="truncate">{productLineSummary}</span>
            <span className="text-muted-foreground">▾</span>
          </summary>
          <div className="absolute z-20 mt-1 max-h-64 w-full min-w-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-slate-950 p-2 shadow-xl">
            {teams.map((team) => (
              <label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
                <input
                  type="checkbox"
                  name="productLineTeamId"
                  value={team.id}
                  defaultChecked={filteredTeamIds.includes(team.id)}
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                <span>{team.name}</span>
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>状态</span>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
            <span className="truncate">{statusSummary}</span>
            <span className="text-muted-foreground">▾</span>
          </summary>
          <div className="absolute z-20 mt-1 w-full min-w-44 space-y-1 rounded-lg border border-border bg-slate-950 p-2 shadow-xl">
            {statuses.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
                <input
                  type="checkbox"
                  name="status"
                  value={value}
                  defaultChecked={selectedStatuses.includes(value)}
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                <span>{requirementStatusLabels[value]}</span>
              </label>
            ))}
          </div>
        </details>
      </div>
      <label className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>需求来源</span>
        <select name="source" defaultValue={searchParams.source ?? ""} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
          <option value="">全部来源</option>
          {sources.map((value) => (
            <option key={value} value={value}>
              {requirementSourceLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-xs text-muted-foreground">
        <span>优先级</span>
        <select name="priority" defaultValue={searchParams.priority ?? ""} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
          <option value="">全部优先级</option>
          {priorities.map((value) => (
            <option key={value} value={value}>
              {requirementPriorityLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-xs text-muted-foreground">
        <span>每页条数</span>
        <select name="pageSize" defaultValue={searchParams.pageSize} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
          {pageSizes.map((value) => (
            <option key={value} value={value}>
              {value} 条
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>时间维度</span>
        <select name="dateType" defaultValue={searchParams.dateType} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white">
          {dateTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>开始日期</span>
        <input type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ""} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white" />
      </label>
      <label className="space-y-1.5 text-xs text-muted-foreground xl:col-span-2">
        <span>结束日期</span>
        <input type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ""} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-white" />
      </label>
      <div className="flex gap-2 xl:col-span-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
          筛选
        </button>
        <Link href="/requirements" className="rounded-lg border border-border bg-input px-3 py-2 text-xs text-white hover:bg-white/5">
          恢复默认
        </Link>
      </div>
    </form>
  );
}
