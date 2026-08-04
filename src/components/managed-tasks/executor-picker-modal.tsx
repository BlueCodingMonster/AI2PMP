"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, User, Check, Sparkles, Building2 } from "lucide-react";
import type { Context } from "./task-grid-view";

export function ExecutorPickerModal({
  isOpen,
  onClose,
  value,
  teamId,
  context,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string | null;
  teamId?: string;
  context: Context;
  onSelect: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedTeamTab, setSelectedTeamTab] = useState<string>("ALL"); // ALL | TEAM_ID
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开弹窗时重置搜索和 Tab 状态
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedTeamTab(teamId ? "MY_TEAM" : "ALL");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, teamId]);

  // 本任务所属团队 ID
  const myTeam = useMemo(() => {
    return context.teams.find((t) => t.id === teamId);
  }, [context.teams, teamId]);

  // 本组成员 ID 集合
  const myTeamMemberIds = useMemo(() => {
    if (!myTeam) return new Set<string>();
    return new Set(myTeam.members.map((m) => m.userId));
  }, [myTeam]);

  // 团队切签列表
  const teamTabs = useMemo(() => {
    const tabs = [{ id: "ALL", name: "全部", count: context.users.length }];
    if (myTeam) {
      tabs.push({ id: "MY_TEAM", name: `★ ${myTeam.name} (本组)`, count: myTeamMemberIds.size });
    }
    context.teams.forEach((t) => {
      if (t.id !== teamId) {
        tabs.push({ id: t.id, name: t.name, count: t.members.length });
      }
    });
    return tabs;
  }, [context.teams, context.users.length, myTeam, myTeamMemberIds.size, teamId]);

  // 过滤后的用户列表
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return context.users.filter((u) => {
      // 1. 团队切签过滤
      if (selectedTeamTab === "MY_TEAM") {
        if (!myTeamMemberIds.has(u.id)) return false;
      } else if (selectedTeamTab !== "ALL") {
        const team = context.teams.find((t) => t.id === selectedTeamTab);
        if (!team || !team.members.some((m) => m.userId === u.id)) return false;
      }

      // 2. 搜索框过滤（姓名/岗位）
      if (q) {
        const matchName = u.name.toLowerCase().includes(q);
        const matchPos = u.position ? u.position.toLowerCase().includes(q) : false;
        return matchName || matchPos;
      }

      return true;
    });
  }, [context.users, context.teams, selectedTeamTab, myTeamMemberIds, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal 头部 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-foreground">选择任务负责人</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 搜索与团队切签栏 */}
        <div className="p-4 space-y-3 border-b border-border bg-card">
          {/* 大文字搜索框 */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名、岗位..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                清空
              </button>
            )}
          </div>

          {/* 团队切签横滑栏 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {teamTabs.map((tab) => {
              const active = selectedTeamTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTeamTab(tab.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition flex items-center gap-1.5 ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 快捷取消/设为未分配按钮 */}
        <div className="px-6 py-2.5 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">共找到 {filteredUsers.length} 名符合条件的人员</span>
          <button
            onClick={() => {
              onSelect("");
              onClose();
            }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              !value
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            -- 设为未分配 --
          </button>
        </div>

        {/* 人员卡片网格列表 */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <User className="h-8 w-8 text-muted-foreground/30" />
              <span>未找到符合条件的人员</span>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = u.id === value;
              const isMyTeam = myTeamMemberIds.has(u.id);

              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelect(u.id);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10"
                      : "border-border bg-card hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : isMyTeam
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.name.slice(-2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">{u.name}</span>
                        {isMyTeam && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/30 shrink-0">
                            ★ 本组
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {u.position || "标准成员"} {u.level ? `· ${u.level}` : ""}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
