"use client";

import { useState, useTransition } from "react";
import { deleteMember } from "@/actions/team";
import { Plus, Search, Edit2, Trash2, Shield, UserX, UserCheck, Phone, AtSign, Briefcase } from "lucide-react";
import MemberModal from "./member-modal";
import { useRouter } from "next/navigation";

interface TeamClientProps {
  members: any[];
  currentUser: {
    id: string;
    isAdmin: boolean;
  };
}

export default function TeamClient({ members, currentUser }: TeamClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const canManage = currentUser.isAdmin;

  // 模糊匹配过滤成员列表
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 删除成员
  const handleDeleteMember = (member: any) => {
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

  const handleEditClick = (member: any) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedMember(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 text-xs sm:text-sm">
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => {
            const initials = member.name.slice(0, 2);
            return (
              <div
                key={member.id}
                className={`group glass rounded-xl border p-5 flex flex-col justify-between hover:border-primary/30 transition-all ${
                  !member.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-4">
                  {/* 首栏：状态与管理 */}
                  <div className="flex items-center justify-between">
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

                    {/* 操作按钮 */}
                    {(canManage || currentUser.id === member.id) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditClick(member)}
                          className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-white"
                          title="编辑成员信息"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {canManage && currentUser.id !== member.id && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            disabled={isPending}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                            title="删除成员"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 姓名与部门头像 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white uppercase shadow-inner">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{member.name}</h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {member.department || "未设定部门"}
                      </p>
                    </div>
                  </div>

                  {/* 联系与业务指标面板 */}
                  <div className="space-y-1.5 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <AtSign className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{member.username}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{member.phone || "未录入电话"}</span>
                    </p>
                  </div>
                </div>

                {/* 业务统计指标 */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-border/20 text-center text-[10px]">
                  <div className="bg-black/10 rounded-lg p-1.5">
                    <span className="font-semibold text-white block">
                      {member._count.projectMemberships}
                    </span>
                    <span className="text-[9px] text-muted-foreground">项目</span>
                  </div>
                  <div className="bg-black/10 rounded-lg p-1.5">
                    <span className="font-semibold text-white block">
                      {member._count.assignedRequirements}
                    </span>
                    <span className="text-[9px] text-muted-foreground">需求</span>
                  </div>
                  <div className="bg-black/10 rounded-lg p-1.5">
                    <span className="font-semibold text-white block">
                      {member._count.assignedTasks}
                    </span>
                    <span className="text-[9px] text-muted-foreground">任务</span>
                  </div>
                  <div className="bg-black/10 rounded-lg p-1.5">
                    <span className="font-semibold text-white block">
                      {member._count.assignedBugs}
                    </span>
                    <span className="text-[9px] text-muted-foreground">缺陷</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 成员录入/编辑 Modal 弹窗 */}
      <MemberModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={selectedMember}
      />
    </div>
  );
}
