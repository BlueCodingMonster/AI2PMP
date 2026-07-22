"use client";

import Link from "next/link";
import { CalendarRange, Eye, Pencil, Plus, ArrowDownToLine, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { planPublicationStatusLabels } from "@/lib/plans/dictionaries";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { deleteQuarterlyPlan } from "@/actions/quarterly-plans";
import { deleteMonthlyPlan } from "@/actions/monthly-plans";

type PlanRow = {
  id: string; year: number; quarter?: number; month?: number; status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | string | null; updatedAt: Date | string; productLineTeam: { name: string; members: Array<{ user: { name: string } }> };
  _count: Record<string, number>;
};

type TeamOption = {
  id: string;
  name: string;
};

export default function PlanListClient({
  tab,
  plans,
  canCreate,
  teams = [],
  defaultYear,
  defaultPeriod,
  defaultTeamIds = [],
  defaultStatus
}: {
  tab: "quarterly" | "monthly";
  plans: PlanRow[];
  canCreate: boolean;
  teams?: TeamOption[];
  defaultYear?: number;
  defaultPeriod?: number;
  defaultTeamIds?: string[];
  defaultStatus?: string;
}) {
  const quarterly = tab === "quarterly";
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该计划吗？删除后将不可恢复。")) return;
    try {
      const res = quarterly ? await deleteQuarterlyPlan(id) : await deleteMonthlyPlan(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "删除失败");
      }
    } catch (error) {
      alert("发生错误：" + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(defaultTeamIds);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTeamsLabel = () => {
    if (selectedTeamIds.length === 0) return "全部产品线小组";
    if (selectedTeamIds.length === 1) {
      const t = teams.find(team => team.id === selectedTeamIds[0]);
      return t ? t.name : "1 个小组";
    }
    return `已选: ${selectedTeamIds.length} 个小组`;
  };

  const teamDropdown = (
    <div ref={teamDropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
        className="w-full text-left rounded-lg border border-border bg-input px-3 py-2 text-sm text-white flex justify-between items-center"
      >
        <span className="truncate">{selectedTeamsLabel()}</span>
        <span className="text-xs text-muted-foreground ml-1">▼</span>
      </button>
      {isTeamDropdownOpen && (
        <div className="absolute left-0 mt-1 w-full rounded-lg border border-border bg-input p-2 shadow-lg z-50 max-h-60 overflow-y-auto space-y-1">
          {teams.map((team) => {
            const isChecked = selectedTeamIds.includes(team.id);
            return (
              <label key={team.id} className="flex items-center gap-2 px-2 py-1 text-sm text-white hover:bg-white/5 rounded cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setSelectedTeamIds(prev =>
                      prev.includes(team.id)
                        ? prev.filter(id => id !== team.id)
                        : [...prev, team.id]
                    );
                  }}
                  className="rounded border-border bg-transparent text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="truncate">{team.name}</span>
              </label>
            );
          })}
        </div>
      )}
      <input type="hidden" name="productLineTeamId" value={selectedTeamIds.join(",")} />
    </div>
  );

  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-white"><CalendarRange className="h-6 w-6 text-indigo-400" />计划管理</h1><p className="mt-1 text-sm text-muted-foreground">季度里程碑与月度项目经营计划独立管理</p></div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const urlParams = new URLSearchParams(window.location.search);
            const year = urlParams.get("year") || new Date().getFullYear();
            const teamId = urlParams.get("productLineTeamId") || "";
            if (quarterly) {
              const quarter = urlParams.get("period") || "3";
              window.location.href = `/api/plans/quarterly/export?year=${year}&quarter=${quarter}&productLineTeamId=${teamId}`;
            } else {
              const month = urlParams.get("period") || (new Date().getMonth() + 1);
              window.location.href = `/api/plans/monthly/export?year=${year}&month=${month}&productLineTeamId=${teamId}`;
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition-colors"
        >
          <ArrowDownToLine className="h-4 w-4" />
          批量导出 Excel
        </button>
        {canCreate && <Link href={`/plans/${tab}/new`} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" />新建{quarterly ? "季度" : "月度"}计划</Link>}
      </div>
    </div>
    <div className="flex gap-2 border-b border-border">
      <Link href="/plans?tab=quarterly" className={`px-4 py-3 text-sm ${quarterly ? "border-b-2 border-indigo-500 text-white" : "text-muted-foreground"}`}>季度里程碑计划</Link>
      <Link href="/plans?tab=monthly" className={`px-4 py-3 text-sm ${!quarterly ? "border-b-2 border-indigo-500 text-white" : "text-muted-foreground"}`}>月度项目经营计划</Link>
    </div>
    <form className={`glass grid gap-3 rounded-xl p-4 ${quarterly ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
      <input type="hidden" name="tab" value={tab} />
      
      {quarterly ? (
        <>
          <input
            name="year"
            type="number"
            required
            placeholder="年度"
            defaultValue={defaultYear || new Date().getFullYear()}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-white"
          />
          <select name="period" defaultValue={defaultPeriod || ""} className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-white">
            <option value="">全部季度</option>
            {Array.from({ length: 4 }, (_, i) => <option key={i + 1} value={i + 1}>{`Q${i + 1}`}</option>)}
          </select>
          {teamDropdown}
        </>
      ) : (
        <>
          <input
            type="month"
            name="yearMonth"
            defaultValue={defaultYear && defaultPeriod ? `${defaultYear}-${String(defaultPeriod).padStart(2, '0')}` : ""}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-white"
          />
          {teamDropdown}
        </>
      )}

      <select name="status" defaultValue={defaultStatus || ""} className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-white">
        <option value="">全部状态</option>
        <option value="DRAFT">草稿</option>
        <option value="PUBLISHED">已发布</option>
      </select>
      <button className="rounded-lg border border-indigo-500/30 px-3 py-2 text-sm text-indigo-300">筛选</button>
    </form>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-white/5 text-xs text-muted-foreground"><tr><th className="px-4 py-3">周期</th><th className="px-4 py-3">产品线小组</th><th className="px-4 py-3">组长</th><th className="px-4 py-3">{quarterly ? "目标/风险" : "事项总数"}</th>{!quarterly && <><th className="px-4 py-3">风险</th><th className="px-4 py-3">资源需求</th></>}<th className="px-4 py-3">状态</th><th className="px-4 py-3">发布时间</th><th className="px-4 py-3">最后修改</th><th className="px-4 py-3">操作</th></tr></thead>
      <tbody>{plans.length === 0 ? <tr><td colSpan={quarterly ? 8 : 10} className="px-4 py-12 text-center text-muted-foreground">暂无计划</td></tr> : plans.map((plan) => {
        const total = Object.values(plan._count).reduce((sum, value) => sum + value, 0);
        return <tr key={plan.id} className="border-t border-border"><td className="px-4 py-3 text-white">{plan.year}年 {quarterly ? `Q${plan.quarter}` : `${plan.month}月`}</td><td className="px-4 py-3">{plan.productLineTeam.name}</td><td className="px-4 py-3">{plan.productLineTeam.members.map((member) => member.user.name).join("、") || "—"}</td><td className="px-4 py-3">{quarterly ? `${plan._count.goals ?? 0} / ${plan._count.risks ?? 0}` : total}</td>{!quarterly && <><td className="px-4 py-3">{plan._count.risks ?? 0}</td><td className="px-4 py-3">{plan._count.resourceRequests ?? 0}</td></>}<td className="px-4 py-3">{planPublicationStatusLabels[plan.status]}</td><td className="px-4 py-3">{plan.publishedAt ? format(new Date(plan.publishedAt), "yyyy-MM-dd HH:mm") : "—"}</td><td className="px-4 py-3">{format(new Date(plan.updatedAt), "yyyy-MM-dd HH:mm")}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><Link href={`/plans/${tab}/${plan.id}`} title="查看" className="hover:text-indigo-400 transition-colors"><Eye className="h-4 w-4" /></Link><Link href={`/plans/${tab}/${plan.id}/edit`} title="编辑" className="hover:text-indigo-400 transition-colors"><Pencil className="h-4 w-4" /></Link><button onClick={() => handleDelete(plan.id)} title="删除" className="text-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button></div></td></tr>;
      })}</tbody></table></div>
  </div>;
}
