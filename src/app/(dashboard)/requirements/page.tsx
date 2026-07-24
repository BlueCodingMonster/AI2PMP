import Link from "next/link";
import { Filter, Lightbulb, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { Priority, RequirementSource, RequirementStatus } from "@prisma/client";
import { getRequirements } from "@/actions/requirements";
import { getProductLineTeams } from "@/actions/product-lines";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatRequirementNo,
  requirementPriorityLabels,
  requirementSourceLabels,
  requirementStatusLabels,
} from "@/lib/requirements/presentation";
import RequirementRowActions from "@/components/requirements/requirement-row-actions";
import RequirementFilterForm from "@/components/requirements/requirement-filter-form";

type DateType = "proposedAt" | "createdAt" | "reviewedAt";

interface PageProps {
  searchParams: Promise<{
    filtered?: string;
    status?: string | string[];
    priority?: string;
    source?: string;
    productLineTeamId?: string | string[];
    search?: string;
    dateType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const priorities = [Priority.HIGH, Priority.MEDIUM, Priority.LOW] as const;
const statuses = Object.values(RequirementStatus);
const sources = Object.values(RequirementSource);
const dateTypes: Array<{ value: DateType; label: string }> = [
  { value: "proposedAt", label: "提出时间" },
  { value: "createdAt", label: "创建时间" },
  { value: "reviewedAt", label: "评审通过时间" },
];
const pageSizes = [20, 50, 100] as const;

function toArray(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : value;
}

function dateAtStart(value?: string) {
  return value ? new Date(`${value}T00:00:00+08:00`) : undefined;
}

function dateAfter(value?: string) {
  const start = dateAtStart(value);
  return start ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : undefined;
}

export default async function RequirementsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hasExplicitFilters = params.filtered === "1"
    || params.status !== undefined
    || params.productLineTeamId !== undefined
    || params.priority !== undefined
    || params.source !== undefined
    || params.search !== undefined
    || params.dateType !== undefined
    || params.dateFrom !== undefined
    || params.dateTo !== undefined;
  const [session, teamsResult] = await Promise.all([auth(), getProductLineTeams()]);
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { productLineMemberships: { select: { teamId: true } } },
      })
    : null;
  const defaultTeamIds = session?.user?.isAdmin
    ? []
    : (currentUser?.productLineMemberships.map((membership) => membership.teamId) ?? []);
  const selectedStatuses = hasExplicitFilters
    ? toArray(params.status).filter((value): value is RequirementStatus => statuses.includes(value as RequirementStatus))
    : statuses.filter((status) => status !== RequirementStatus.COMPLETED);
  const selectedTeamIds = hasExplicitFilters ? toArray(params.productLineTeamId) : defaultTeamIds;
  const priority = priorities.includes(params.priority as (typeof priorities)[number])
    ? (params.priority as (typeof priorities)[number])
    : undefined;
  const source = sources.includes(params.source as RequirementSource)
    ? (params.source as RequirementSource)
    : undefined;
  const teams = teamsResult.success ? teamsResult.data : [];
  const validTeamIds = new Set(teams.map((team) => team.id));
  const filteredTeamIds = selectedTeamIds.filter((id) => validTeamIds.has(id));
  const selectedDateType = dateTypes.some((item) => item.value === params.dateType)
    ? (params.dateType as DateType)
    : "proposedAt";
  const today = format(new Date(), "yyyy-MM-dd");
  const firstDayOfCurrentMonth = `${today.slice(0, 8)}01`;
  let selectedDateFrom = hasExplicitFilters ? normalizeDate(params.dateFrom) : firstDayOfCurrentMonth;
  let selectedDateTo = hasExplicitFilters ? normalizeDate(params.dateTo) : today;
  if (selectedDateFrom && selectedDateTo && selectedDateFrom > selectedDateTo) {
    [selectedDateFrom, selectedDateTo] = [selectedDateTo, selectedDateFrom];
  }
  const parsedPage = Number(params.page);
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const parsedPageSize = Number(params.pageSize);
  const selectedPageSize = pageSizes.includes(parsedPageSize as (typeof pageSizes)[number])
    ? (parsedPageSize as (typeof pageSizes)[number])
    : 20;

  const requirementsResult = await getRequirements({
    statuses: selectedStatuses,
    priority,
    source,
    productLineTeamIds: filteredTeamIds,
    search: params.search,
    dateType: selectedDateType,
    dateFrom: dateAtStart(selectedDateFrom),
    dateTo: dateAfter(selectedDateTo),
    page: requestedPage,
    pageSize: selectedPageSize,
  });
  const requirements = requirementsResult.data;
  const total = requirementsResult.total;
  const page = requirementsResult.page;
  const pageSize = requirementsResult.pageSize;
  const totalPages = requirementsResult.totalPages;
  const productLineSummary = filteredTeamIds.length === 0
    ? "不限产品线"
    : filteredTeamIds.length === 1
      ? teams.find((team) => team.id === filteredTeamIds[0])?.name ?? "1 个产品线"
      : `${filteredTeamIds.length} 个产品线`;
  const statusSummary = selectedStatuses.length === 0
    ? "不限状态"
    : selectedStatuses.length === 1
      ? requirementStatusLabels[selectedStatuses[0]]
      : `${selectedStatuses.length} 个状态`;

  const paginationHref = (targetPage: number) => {
    const query = new URLSearchParams();
    query.set("filtered", "1");
    if (params.search?.trim()) query.set("search", params.search.trim());
    filteredTeamIds.forEach((id) => query.append("productLineTeamId", id));
    selectedStatuses.forEach((status) => query.append("status", status));
    if (priority) query.set("priority", priority);
    if (source) query.set("source", source);
    query.set("dateType", selectedDateType);
    if (selectedDateFrom) query.set("dateFrom", selectedDateFrom);
    if (selectedDateTo) query.set("dateTo", selectedDateTo);
    query.set("page", String(targetPage));
    query.set("pageSize", String(pageSize));
    return `/requirements?${query.toString()}`;
  };
  const pageWindowEnd = Math.min(totalPages, Math.max(5, page + 2));
  const pageWindowStart = Math.max(1, pageWindowEnd - 4);
  const visiblePages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><Lightbulb className="h-5 w-5" /></div>
          <h1 className="text-2xl font-bold tracking-tight text-white">需求池</h1>
          <span className="whitespace-nowrap rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">{total} 条</span>
        </div>
        <Link href="/requirements/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold !text-white btn-white-text shadow-md hover:from-indigo-500 hover:to-purple-500"><Plus className="h-4 w-4 !text-white" />新建需求</Link>
      </div>

      <div className="glass rounded-xl p-4">
        <RequirementFilterForm
          teams={teams}
          filteredTeamIds={filteredTeamIds}
          selectedStatuses={selectedStatuses}
          productLineSummary={productLineSummary}
          statusSummary={statusSummary}
          statuses={statuses}
          sources={sources}
          priorities={priorities}
          requirementStatusLabels={requirementStatusLabels}
          requirementSourceLabels={requirementSourceLabels}
          requirementPriorityLabels={requirementPriorityLabels}
          dateTypes={dateTypes}
          pageSizes={pageSizes}
          searchParams={{
            search: params.search,
            source,
            priority,
            pageSize,
            dateType: selectedDateType,
            dateFrom: selectedDateFrom,
            dateTo: selectedDateTo,
          }}
        />
      </div>

      <div className="glass overflow-hidden rounded-xl"><div className="overflow-x-auto"><table className="min-w-[1450px] w-full border-collapse text-left text-sm">
        <thead><tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
          <th className="px-4 py-3">需求编号</th><th className="px-4 py-3">需求名称</th><th className="px-4 py-3">归属产品线</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">需求来源</th><th className="px-4 py-3">客户名称或需求方</th><th className="px-4 py-3">提出时间</th><th className="px-4 py-3">创建时间</th><th className="px-4 py-3">创建人</th><th className="px-4 py-3">需求状态</th><th className="px-4 py-3">评审通过时间</th><th className="px-4 py-3">操作</th>
        </tr></thead>
        <tbody className="divide-y divide-border/60">
          {requirements.length === 0 ? <tr><td colSpan={12} className="py-10 text-center text-muted-foreground">暂无符合条件的需求</td></tr> : requirements.map((requirement) => (
            <tr key={requirement.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-indigo-300">{formatRequirementNo(requirement.sequenceNo)}</td>
              <td className="max-w-[260px] truncate px-4 py-3 font-medium text-white"><Link href={`/requirements/${requirement.id}`}>{requirement.title}</Link></td>
              <td className="px-4 py-3 text-xs">{requirement.productLineTeam?.name ?? "—"}</td><td className="px-4 py-3 text-xs">{requirementPriorityLabels[requirement.priority] ?? requirement.priority}</td><td className="px-4 py-3 text-xs">{requirementSourceLabels[requirement.source]}</td><td className="px-4 py-3 text-xs">{requirement.proposer ?? "—"}</td><td className="px-4 py-3 text-xs">{requirement.proposedAt ? format(requirement.proposedAt, "yyyy-MM-dd") : "—"}</td><td className="px-4 py-3 text-xs">{format(requirement.createdAt, "yyyy-MM-dd HH:mm")}</td><td className="px-4 py-3 text-xs">{requirement.createdBy.name}</td><td className="px-4 py-3 text-xs">{requirementStatusLabels[requirement.status]}</td><td className="px-4 py-3 text-xs">{requirement.reviewedAt ? format(requirement.reviewedAt, "yyyy-MM-dd") : "—"}</td><td className="px-4 py-3"><RequirementRowActions requirementId={requirement.id} requirementTitle={requirement.title} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>第 {page}/{totalPages} 页，本页 {requirements.length} 条，共 {total} 条</span>
          <div className="flex flex-wrap items-center gap-1">
            <Link aria-disabled={page === 1} href={paginationHref(1)} className={`rounded-md border border-border px-2.5 py-1.5 ${page === 1 ? "pointer-events-none opacity-40" : "text-white hover:bg-white/5"}`}>首页</Link>
            <Link aria-disabled={page === 1} href={paginationHref(Math.max(1, page - 1))} className={`rounded-md border border-border px-2.5 py-1.5 ${page === 1 ? "pointer-events-none opacity-40" : "text-white hover:bg-white/5"}`}>上一页</Link>
            {visiblePages.map((value) => <Link key={value} href={paginationHref(value)} aria-current={value === page ? "page" : undefined} className={`rounded-md border px-2.5 py-1.5 ${value === page ? "border-indigo-500 bg-indigo-500/15 text-indigo-200" : "border-border text-white hover:bg-white/5"}`}>{value}</Link>)}
            <Link aria-disabled={page === totalPages} href={paginationHref(Math.min(totalPages, page + 1))} className={`rounded-md border border-border px-2.5 py-1.5 ${page === totalPages ? "pointer-events-none opacity-40" : "text-white hover:bg-white/5"}`}>下一页</Link>
            <Link aria-disabled={page === totalPages} href={paginationHref(totalPages)} className={`rounded-md border border-border px-2.5 py-1.5 ${page === totalPages ? "pointer-events-none opacity-40" : "text-white hover:bg-white/5"}`}>末页</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
