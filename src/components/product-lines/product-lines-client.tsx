"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, ShieldAlert, Layers, ChevronRight } from "lucide-react";
import TeamModal from "./team-modal";

interface ProductLinesClientProps {
  initialTeams: any[];
}

export default function ProductLinesClient({ initialTeams }: ProductLinesClientProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredTeams = initialTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      {/* 搜索与快捷操作 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card border border-border p-4 rounded-xl">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索小组名称/核心职责..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-1.5 pl-9 pr-4 text-xs text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 shrink-0"
        >
          <Plus className="h-4 w-4" />
          成立研发产品线小组
        </button>
      </div>

      {/* 小组卡片网格 */}
      {filteredTeams.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center text-muted-foreground">
          未筛选到符合条件的产品线研发小组。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => {
            // 找出组长 (role === LEADER)
            const leaderMember = team.members.find((m: any) => m.role === "LEADER");
            const leaderName = leaderMember ? leaderMember.user.name : "未指派";
            const fixedCount = team.members.length;
            const secondmentCount = team.secondmentsTo.length;

            return (
              <div
                key={team.id}
                className="glass rounded-2xl border border-border/50 hover:border-primary/20 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-white text-base truncate">{team.name}</h3>
                    <span className="shrink-0 rounded px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                      <Layers className="h-3 w-3" />
                      产品线
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed line-clamp-2 h-8 text-[11px]">
                    {team.description || <span className="italic">该产品线小组暂无核心职责描述说明</span>}
                  </p>
                </div>

                {/* 团队统计 */}
                <div className="grid grid-cols-3 gap-2 bg-black/10 rounded-xl p-3 border border-border/30 text-center text-[10px]">
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px] font-semibold tracking-wider">组长</span>
                    <span className="text-white font-bold block mt-1 truncate">{leaderName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px] font-semibold tracking-wider">固定班底</span>
                    <span className="text-white font-bold block mt-1 font-mono">{fixedCount}人</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase text-[8px] font-semibold tracking-wider">临时借调</span>
                    <span className="text-indigo-400 font-bold block mt-1 font-mono">+{secondmentCount}人</span>
                  </div>
                </div>

                {/* 关联项目条目 */}
                <div className="space-y-1.5 text-[10px]">
                  <span className="text-muted-foreground uppercase text-[8px] font-semibold tracking-wider">承接研发项目 ({team.projects.length})</span>
                  {team.projects.length === 0 ? (
                    <p className="italic text-gray-600">暂无项目归属</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                      {team.projects.map((p: any) => (
                        <span key={p.id} className="rounded bg-input/60 border border-border/40 px-2 py-0.5 text-white">
                          [{p.key}] {p.name.slice(0, 10)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 进入配置详情 */}
                <Link
                  href={`/product-lines/${team.id}`}
                  className="w-full text-center inline-flex items-center justify-center gap-1 text-xs font-bold rounded-lg border border-border bg-input py-2 text-white hover:bg-muted transition-colors"
                >
                  小组成员管理与临时借调
                  <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                </Link>

              </div>
            );
          })}
        </div>
      )}

      {/* 创建模态框 */}
      <TeamModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
