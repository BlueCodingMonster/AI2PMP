"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { deleteMember, resetPassword } from "@/actions/team";
import { Plus, Search, Edit2, Trash2, Shield, UserX, UserCheck, Eye, Key } from "lucide-react";
import MemberModal, { type MemberEditData } from "./member-modal";
import { useRouter } from "next/navigation";

interface TeamClientProps {
  members: TeamMember[];
  currentUser: {
    id: string;
    isAdmin: boolean;
  };
}

type TeamMember = MemberEditData & {
  email: string | null;
  createdAt: Date | string;
  _count: { projectMemberships: number };
};

export default function TeamClient({ members, currentUser }: TeamClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const canManage = currentUser.isAdmin;

  // 模糊匹配过滤成员列表
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 删除成员
  const handleDeleteMember = (member: TeamMember) => {
    if (!window.confirm(`确定要删除成员 "${member.name}" 吗？`)) return;

    startTransition(async () => {
      try {
        const res = await deleteMember(member.id);
        if (res.success) {
          if (res.warning) {
            alert(res.warning);
          }
          router.refresh();
        } else {
          alert(res.error || "删除失败");
        }
      } catch (err) {
        console.error("删除成员出错:", err);
      }
    });
  };

  const handleResetPassword = (member: TeamMember) => {
    const newPassword = window.prompt(`确定要重置成员 "${member.name}" 的密码吗？\n请输入新密码（留空则默认为 123456）：`, "123456");
    if (newPassword === null) return;

    startTransition(async () => {
      try {
        const res = await resetPassword(member.id, newPassword);
        if (res.success) {
          alert(`成员 "${member.name}" 的密码已成功重置为: ${res.password}`);
          router.refresh();
        } else {
          alert(res.error || "密码重置失败");
        }
      } catch (err) {
        console.error("密码重置出错:", err);
      }
    });
  };

  const handleEditClick = (member: TeamMember) => {
    setSelectedMember(member);
    setIsViewMode(false);
    setModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedMember(null);
    setIsViewMode(false);
    setModalOpen(true);
  };

  const handleViewClick = (member: TeamMember) => {
    setSelectedMember(member);
    setIsViewMode(true);
    setModalOpen(true);
  };

  // 1. 统计部门人员数量
  const departmentStats = members.reduce((acc, m) => {
    const dept = m.department || "未分配部门";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentList = Object.entries(departmentStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 2. 统计岗位人员数量
  const positionStats = members.reduce((acc, m) => {
    const pos = m.position || "未分配岗位";
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const positionList = Object.entries(positionStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      {/* 团队统计板块（默认收起） */}
      <div className="rounded-2xl border border-border bg-card">
        <button
          onClick={() => setStatsOpen(!statsOpen)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-sans">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            团队人员构成分析
          </h2>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              statsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {statsOpen && (
          <div className="px-5 pb-5">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* 双栏统计 */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 左侧部门统计 */}
                <div className="space-y-2 border-r border-border/40 pr-0 sm:pr-6">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    部门构成
                  </h3>
                  {(() => {
                    const deptColors = ["#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#64748b"];
                    return departmentList.map((dept, idx) => {
                      const percentage = Math.round((dept.count / members.length) * 100);
                      const color = deptColors[idx % deptColors.length];
                      return (
                        <div key={dept.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-white font-medium">{dept.name}</span>
                          </div>
                          <span className="text-muted-foreground">{dept.count}人 ({percentage}%)</span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 右侧岗位统计 */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    岗位构成
                  </h3>
                  {(() => {
                    const posColors = ["#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f59e0b", "#06b6d4", "#14b8a6", "#64748b"];
                    return positionList.map((pos, idx) => {
                      const percentage = Math.round((pos.count / members.length) * 100);
                      const color = posColors[idx % posColors.length];
                      return (
                        <div key={pos.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-white font-medium truncate" title={pos.name}>{pos.name}</span>
                          </div>
                          <span className="text-muted-foreground shrink-0">{pos.count}人 ({percentage}%)</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 头部筛选与录入操作 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card border border-border p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索成员姓名、登录名或部门..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2 pl-10 pr-4 text-xs text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {canManage && (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 shrink-0"
          >
            <Plus className="h-4 w-4" />
            录入新成员
          </button>
        )}
      </div>

      {/* 成员展示列表 */}
      {filteredMembers.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground">
          没有找到匹配的团队成员。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-black/20 text-muted-foreground font-semibold">
                <th className="p-4">姓名</th>
                <th className="p-4">登录名</th>
                <th className="p-4">部门</th>
                <th className="p-4">层级 / 岗位</th>
                <th className="p-4">联系电话</th>
                <th className="p-4">状态</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMembers.map((member) => {
                const initials = member.name.slice(0, 2);
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-accent/30 transition-colors ${
                      !member.isActive ? "opacity-60" : ""
                    }`}
                  >
                    {/* 姓名 (含头像) */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase shadow-inner">
                          {initials}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{member.name}</span>
                        </div>
                      </div>
                    </td>
                    {/* 登录名 */}
                    <td className="p-4 text-muted-foreground">
                      @{member.username}
                    </td>
                    {/* 部门 */}
                    <td className="p-4 text-muted-foreground">
                      {member.department || "—"}
                    </td>
                    {/* 层级 / 岗位 */}
                    <td className="p-4 text-indigo-300">
                      {member.level || "—"} · {member.position || "—"}
                    </td>
                    {/* 联系电话 */}
                    <td className="p-4 text-muted-foreground">
                      {member.phone || "—"}
                    </td>
                    {/* 状态 */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {member.isAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400 border border-indigo-500/20">
                            <Shield className="h-2.5 w-2.5" />
                            管理员
                          </span>
                        )}
                        {member.isActive ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <UserCheck className="h-2.5 w-2.5" />
                            已启用
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-400 border border-rose-500/20">
                            <UserX className="h-2.5 w-2.5" />
                            已禁用
                          </span>
                        )}
                      </div>
                    </td>
                    {/* 操作 */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleViewClick(member)}
                          className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-white"
                          title="查看成员信息"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {(canManage || currentUser.id === member.id) && (
                          <button
                            onClick={() => handleEditClick(member)}
                            className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-white"
                            title="编辑成员信息"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleResetPassword(member)}
                            disabled={isPending}
                            className="p-1 rounded text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                            title="重置密码"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canManage && currentUser.id !== member.id && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            disabled={isPending}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                            title="删除成员"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 成员录入/编辑 Modal 弹窗 */}
      {modalOpen && <MemberModal
        key={selectedMember?.id ?? "new"}
        isOpen
        onClose={() => setModalOpen(false)}
        editData={selectedMember ?? undefined}
        isViewOnly={isViewMode}
      />}
    </div>
  );
}
