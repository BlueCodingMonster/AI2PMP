"use client";

import { useState, useTransition } from "react";
import { addProjectMember, updateProjectMemberRole, removeProjectMember } from "@/actions/projects";
import { ProjectRole } from "@prisma/client";
import { Plus, Trash2, ShieldAlert, Loader2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

const roleLabels: Record<ProjectRole, string> = {
  OWNER: "负责人 (Owner)",
  ADMIN: "管理员 (Admin)",
  DEVELOPER: "开发人 (Developer)",
  TESTER: "测试人 (Tester)",
  VIEWER: "只读 (Viewer)",
};

interface MemberProps {
  projectId: string;
  currentMembers: any[];
  allUsers: { id: string; name: string; username: string }[];
}

export default function ProjectMembers({ projectId, currentMembers, allUsers }: MemberProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 添加成员状态
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(ProjectRole.DEVELOPER);
  const [error, setError] = useState<string | null>(null);

  // 过滤出还未加入本项目的用户候选列表
  const memberIds = new Set(currentMembers.map((m) => m.userId));
  const candidateUsers = allUsers.filter((u) => !memberIds.has(u.id));

  // 添加成员
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError("请选择团队成员");
      return;
    }

    startTransition(async () => {
      try {
        const res = await addProjectMember(projectId, selectedUserId, selectedRole);
        if (res.success) {
          setSelectedUserId("");
          router.refresh();
        } else {
          setError(res.error || "添加成员失败");
        }
      } catch (err) {
        console.error("添加成员出错:", err);
        setError("系统错误，请重试");
      }
    });
  };

  // 移出成员
  const handleRemoveMember = (userId: string, name: string) => {
    if (!window.confirm(`确定要将 "${name}" 移出本项目吗？`)) return;

    startTransition(async () => {
      try {
        const res = await removeProjectMember(projectId, userId);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "移除失败");
        }
      } catch (err) {
        console.error("移除成员出错:", err);
      }
    });
  };

  // 修改成员角色
  const handleRoleChange = (userId: string, role: ProjectRole) => {
    startTransition(async () => {
      try {
        const res = await updateProjectMemberRole(projectId, userId, role);
        if (!res.success) {
          alert(res.error || "修改角色失败");
        } else {
          router.refresh();
        }
      } catch (err) {
        console.error("修改角色出错:", err);
      }
    });
  };

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-border/60 pb-3">
        <Users className="h-4 w-4 text-purple-400" />
        项目成员列表 ({currentMembers.length})
      </h3>

      {/* 错误提示 */}
      {error && (
        <div className="rounded bg-red-500/10 border border-red-500/20 p-2.5 text-[10px] text-red-400 flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* 成员展示列表 */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {currentMembers.map((member) => {
          const isOwner = member.role === ProjectRole.OWNER;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 bg-black/10 rounded-lg p-2.5 border border-border/30 hover:border-border/60 transition-all text-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{member.user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{member.user.username}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 角色选择器，如果是 OWNER 锁定不可修改 */}
                {isOwner ? (
                  <span className="rounded bg-indigo-500/25 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                    {roleLabels[member.role as ProjectRole]}
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value as ProjectRole)}
                    disabled={isPending}
                    className="rounded border border-border bg-input py-1 px-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(roleLabels).map(([roleVal, labelText]) => (
                      <option key={roleVal} value={roleVal}>
                        {labelText}
                      </option>
                    ))}
                  </select>
                )}

                {/* 移出按钮，OWNER 不可移出 */}
                {!isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user.name)}
                    disabled={isPending}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="移出项目"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 添加成员小表单 */}
      {candidateUsers.length > 0 ? (
        <form onSubmit={handleAddMember} className="border-t border-border/40 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-white flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
            添加新成员入组
          </h4>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded border border-border bg-input py-1.5 px-2 text-[10px] text-white focus:outline-none"
            >
              <option value="">选择用户...</option>
              {candidateUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              className="w-full rounded border border-border bg-input py-1.5 px-2 text-[10px] text-white focus:outline-none"
            >
              {Object.entries(roleLabels)
                .filter(([r]) => r !== "OWNER") // 不能直接把新成员添加为 OWNER
                .map(([roleVal, labelText]) => (
                  <option key={roleVal} value={roleVal}>
                    {labelText}
                  </option>
                ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 w-full rounded bg-indigo-600/90 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            确认添加
          </button>
        </form>
      ) : (
        <p className="text-[10px] text-muted-foreground text-center pt-2">
          所有注册用户均已加入本项目。
        </p>
      )}
    </div>
  );
}
