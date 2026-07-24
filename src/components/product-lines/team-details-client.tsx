"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignTeamMember,
  removeTeamMember,
  createSecondment,
  completeSecondment,
  linkProjectToTeam,
  linkProjectsToTeam,
  linkProductsToTeam,
  setProductTeamLink,
  deleteProductLineTeam,
} from "@/actions/product-lines";
import { ProductLineRole, SecondmentStatus } from "@prisma/client";
import {
  ArrowLeft,
  Users,
  UserPlus,
  ArrowRightLeft,
  FolderGit,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Boxes,
  ArrowUpRight,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import TeamModal from "./team-modal";

interface TeamDetailsProps {
  team: any;
  allUsers: any[];
  allProjects: any[];
  allTeams: any[];
  allProducts: any[];
}

const roleLabels: Record<ProductLineRole, string> = {
  LEADER: "组长",
  PM: "产品经理",
  FRONTEND: "前端研发",
  BACKEND: "后端研发",
  TESTER: "测试工程师",
};

const roleColors: Record<ProductLineRole, string> = {
  LEADER: "bg-red-500/10 text-red-400 border-red-500/20",
  PM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FRONTEND: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BACKEND: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  TESTER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function TeamDetailsClient({ team, allUsers, allProjects, allTeams, allProducts }: TeamDetailsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 各种 modal 显隐状态
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSecondmentModalOpen, setIsSecondmentModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // 表单状态 - 新增固定成员
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<ProductLineRole>(ProductLineRole.BACKEND);
  const [memberError, setMemberError] = useState<string | null>(null);

  // 表单状态 - 人员借调
  const [secUserId, setSecUserId] = useState("");
  const [secFromTeamId, setSecFromTeamId] = useState("");
  const [secRole, setSecRole] = useState<ProductLineRole>(ProductLineRole.FRONTEND);
  const [secStartDate, setSecStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [secEndDate, setSecEndDate] = useState("");
  const [secError, setSecError] = useState<string | null>(null);

  // 表单状态 - 关联项目
  const [linkProjectIds, setLinkProjectIds] = useState<string[]>([]);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkProductIds, setLinkProductIds] = useState<string[]>([]);
  const [productLinkError, setProductLinkError] = useState<string | null>(null);

  // 获取该小组目前的固定成员 ID 列表
  const fixedUserIds = team.members.map((m: any) => m.userId);

  // 可作为固定成员的用户（排除已经是的）
  const candidateFixedUsers = allUsers.filter((u) => !fixedUserIds.includes(u.id));

  // 可借调的人员（排除已经是本组固定成员的，以及当前已借入的人）
  const borrowedUserIds = team.secondmentsTo.map((s: any) => s.userId);
  const candidateSecUsers = allUsers.filter(
    (u) => !fixedUserIds.includes(u.id) && !borrowedUserIds.includes(u.id)
  );

  // 未绑定到当前小组的项目
  const candidateProjects = allProjects.filter((p) => p.productLineTeamId !== team.id);
  const linkedProductIds = team.products.map((product: any) => product.id);
  const candidateProducts = allProducts.filter((product) => !linkedProductIds.includes(product.id));

  // 1. 新增/编辑固定小组成员
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);

    if (!memberUserId) {
      setMemberError("请选择用户");
      return;
    }

    startTransition(async () => {
      try {
        const res = await assignTeamMember(team.id, memberUserId, memberRole);
        if (res.success) {
          setIsMemberModalOpen(false);
          setMemberUserId("");
          router.refresh();
        } else {
          setMemberError(res.error || "添加成员失败");
        }
      } catch (err) {
        setMemberError("系统错误");
      }
    });
  };

  // 2. 移除固定小组成员
  const handleRemoveMember = (userId: string) => {
    if (!window.confirm("确定要将该成员从本小组的固定班底中移除吗？")) return;

    startTransition(async () => {
      try {
        const res = await removeTeamMember(team.id, userId);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "移除成员失败");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // 3. 登记借调借入
  const handleAddSecondment = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);

    if (!secUserId) {
      setSecError("请选择借入的用户");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          userId: secUserId,
          fromTeamId: secFromTeamId || null,
          toTeamId: team.id,
          role: secRole,
          startDate: secStartDate,
          endDate: secEndDate || null,
        };

        const res = await createSecondment(payload);
        if (res.success) {
          setIsSecondmentModalOpen(false);
          setSecUserId("");
          setSecFromTeamId("");
          router.refresh();
        } else {
          setSecError(res.error || "登记借调失败");
        }
      } catch (err) {
        setSecError("系统错误");
      }
    });
  };

  // 4. 归还借出人员/结束借调
  const handleCompleteSecondment = (secId: string) => {
    if (!window.confirm("确定要结束该借调记录，将人员归还吗？")) return;

    startTransition(async () => {
      try {
        const res = await completeSecondment(secId);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "结束借调失败");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // 5. 绑定项目到小组
  const handleLinkProject = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    if (linkProjectIds.length === 0) {
      setLinkError("请至少选择一个项目");
      return;
    }

    startTransition(async () => {
      try {
        const res = await linkProjectsToTeam(linkProjectIds, team.id);
        if (res.success) {
          setIsProjectModalOpen(false);
          setLinkProjectIds([]);
          router.refresh();
        } else {
          setLinkError(res.error || "绑定项目失败");
        }
      } catch (err) {
        setLinkError("系统错误");
      }
    });
  };

  // 6. 解绑项目
  const handleUnlinkProject = (projId: string) => {
    if (!window.confirm("确定要取消该项目与本产品线小组的归属绑定吗？")) return;

    startTransition(async () => {
      try {
        const res = await linkProjectToTeam(projId, null);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "取消绑定失败");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleLinkProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductLinkError(null);
    if (linkProductIds.length === 0) return setProductLinkError("请至少选择一个产品线");

    startTransition(async () => {
      const res = await linkProductsToTeam(team.id, linkProductIds);
      if (!res.success) return setProductLinkError(res.error || "关联产品线失败");
      setIsProductModalOpen(false);
      setLinkProductIds([]);
      router.refresh();
    });
  };

  const handleUnlinkProduct = (productId: string) => {
    if (!window.confirm("确定要取消该产品线与本小组的关联吗？")) return;
    startTransition(async () => {
      const res = await setProductTeamLink(team.id, productId, false);
      if (!res.success) return alert(res.error || "取消产品线关联失败");
      router.refresh();
    });
  };

  // 7. 解散小组
  const handleDeleteTeam = () => {
    if (!window.confirm("确定要解散并删除本产品线小组吗？所有关联项目会被释放。")) return;

    startTransition(async () => {
      try {
        const res = await deleteProductLineTeam(team.id);
        if (res.success) {
          router.push("/product-lines");
          router.refresh();
        } else {
          alert(res.error || "解散失败");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-6 text-xs sm:text-sm animate-fade-in">
      {/* 头部面包屑与小组设置 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/product-lines"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回小组总览
        </Link>

        <div className="flex gap-2">
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Edit2 className="h-3.5 w-3.5" />
            修改设置
          </button>
          <button
            onClick={handleDeleteTeam}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 py-1.5 px-3 text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-600 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            解散小组
          </button>
        </div>
      </div>

      {/* 小组基本描述信息 */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded uppercase">
            Product Line Group
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{team.name}</h1>
        <p className="text-muted-foreground leading-relaxed">
          {team.description || <span className="italic">该研发产品线暂无详细业务范围职责描述说明</span>}
        </p>
      </div>

      {/* 三分栏/双分栏布局 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左侧及中间：固定成员与借调 */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* 1. 固定成员管理面板 */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                固定班底配置 ({team.members.length})
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                分配新成员
              </button>
            </div>

            {team.members.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                暂未指派固定组员。点击右上角“分配新成员”指定固定班底。
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {team.members.map((member: any) => {
                  const label = roleLabels[member.role as ProductLineRole];
                  const color = roleColors[member.role as ProductLineRole];
                  // 检查这个人当前是否被借出去了 (有 active 的 secondmentFrom 且 userId 一致)
                  const isLentOut = team.secondmentsFrom.some(
                    (s: any) => s.userId === member.userId && s.status === SecondmentStatus.ACTIVE
                  );

                  return (
                    <div
                      key={member.id}
                      className="bg-muted/40 rounded-xl p-3 border border-border/60 flex items-center justify-between gap-3 text-xs hover:border-border transition-all"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white truncate block">{member.user.name}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${color}`}
                          >
                            {label}
                          </span>
                          {isLentOut && (
                            <span className="rounded px-1 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[8px] font-extrabold">
                              借出中
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{member.user.username} · {member.user.department || "暂无部门"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="移出本组"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. 临时借入管理面板 */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                临时借调借入 ({team.secondmentsTo.length})
              </h3>
              <button
                onClick={() => setIsSecondmentModalOpen(true)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                登记人员借入
              </button>
            </div>

            {team.secondmentsTo.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                当前没有临时借入人员。项目间人员紧张时，可灵活登记临时派遣借调。
              </p>
            ) : (
              <div className="space-y-3">
                {team.secondmentsTo.map((sec: any) => {
                  const roleLabel = roleLabels[sec.role as ProductLineRole];
                  const roleColor = roleColors[sec.role as ProductLineRole];

                  return (
                    <div
                      key={sec.id}
                      className="bg-muted/40 border border-border/60 rounded-xl p-4 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{sec.user.name}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${roleColor}`}
                          >
                            借入岗位: {roleLabel}
                          </span>
                          <span className="rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                            借入中
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
                          <span>原所属: {sec.fromTeam?.name || <span className="italic">系统未指定小组</span>}</span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            借调周期: {new Date(sec.startDate).toLocaleDateString()} 至{" "}
                            {sec.endDate ? new Date(sec.endDate).toLocaleDateString() : "不限期"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCompleteSecondment(sec.id)}
                        className="rounded-lg border border-border bg-input py-1.5 px-3 text-xs font-semibold text-foreground hover:bg-muted shrink-0 transition-colors"
                      >
                        结束借调/归还
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. 借出到外组情况面板 */}
          {team.secondmentsFrom.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-border/40 pb-3">
                <ArrowRightLeft className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                本组固定成员外借情况 ({team.secondmentsFrom.length})
              </h3>
              <div className="space-y-3">
                {team.secondmentsFrom.map((sec: any) => (
                  <div
                    key={sec.id}
                    className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{sec.user.name}</span>
                        <span className="rounded px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[9px] font-bold">
                          已借出
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        借调去向: <span className="text-slate-900 dark:text-white font-bold">{sec.toTeam.name}</span> · 担任角色: {roleLabels[sec.role as ProductLineRole]}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleCompleteSecondment(sec.id)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      提前收回人员
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 右侧：关联产品线与项目 */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                关联产品线 ({team.products.length})
              </h3>
              <button
                onClick={() => { setProductLinkError(null); setLinkProductIds([]); setIsProductModalOpen(true); }}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
              >
                关联产品线
              </button>
            </div>

            {team.products.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-6">
                本小组尚未关联产品线。
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {team.products.map((product: any) => (
                  <div key={product.id} className="bg-muted/40 border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href="/product-catalog" className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors block truncate">
                        {product.name}
                      </Link>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{product.description || "暂无产品说明"}</p>
                    </div>
                    <button onClick={() => handleUnlinkProduct(product.id)} className="rounded-lg p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0" title="取消产品线关联">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                关联项目 ({team.projects.length})
              </h3>
              <button
                onClick={() => { setLinkError(null); setLinkProjectIds([]); setIsProjectModalOpen(true); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                关联项目
              </button>
            </div>

            {team.projects.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-6">
                本小组尚未关联项目。
              </p>
            ) : (
              <div className="space-y-3.5 text-xs">
                {team.projects.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="bg-muted/40 border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {proj.key}
                      </span>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="font-bold text-white hover:text-indigo-300 transition-colors block truncate mt-1.5"
                      >
                        {proj.name}
                      </Link>
                    </div>

                    <button
                      onClick={() => handleUnlinkProject(proj.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="解绑项目"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== modal 1: 修改小组属性 ===== */}
      <TeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} initialData={team} />

      {/* ===== modal 2: 新增固定组员 ===== */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">指派小组固定成员</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {memberError && (
              <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                {memberError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">选择成员 *</label>
                <select
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-3 text-foreground focus:outline-none"
                >
                  <option value="">请选择人员...</option>
                  {candidateFixedUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-popover text-popover-foreground">
                      {u.name} ({u.department || "无部门"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">指派小组岗位/角色 *</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as ProductLineRole)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-3 text-foreground focus:outline-none"
                >
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <option key={k} value={k} className="bg-popover text-popover-foreground">
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="rounded-lg border border-border bg-input py-2 px-4 text-xs font-medium text-foreground hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  确认分配
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== modal 3: 登记人员借调借入 ===== */}
      {isSecondmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-white">登记临时借调人员 (借调借入)</h3>
              <button onClick={() => setIsSecondmentModalOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {secError && (
              <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                {secError}
              </div>
            )}

            <form onSubmit={handleAddSecondment} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">选择借入人员 *</label>
                <select
                  value={secUserId}
                  onChange={(e) => setSecUserId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:outline-none"
                >
                  <option value="">请选择被借调的人...</option>
                  {candidateSecUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.department || "无部门"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">借出源头小组 (可选)</label>
                <select
                  value={secFromTeamId}
                  onChange={(e) => setSecFromTeamId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:outline-none"
                >
                  <option value="">从系统公共池借调 (不指定原小组)</option>
                  {allTeams.filter((t) => t.id !== team.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">借调角色职责 *</label>
                  <select
                    value={secRole}
                    onChange={(e) => setSecRole(e.target.value as ProductLineRole)}
                    className="w-full rounded-lg border border-border bg-input py-2 px-3 text-white focus:outline-none"
                  >
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">借调开始日期 *</label>
                  <input
                    type="date"
                    required
                    value={secStartDate}
                    onChange={(e) => setSecStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input py-1.5 px-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">预计结束日期 (可选)</label>
                <input
                  type="date"
                  value={secEndDate}
                  onChange={(e) => setSecEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-1.5 px-3 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsSecondmentModalOpen(false)}
                  className="rounded-lg border border-border bg-input py-2 px-4 text-xs font-medium text-white hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  确认登记借调
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== modal 4: 关联产品线 ===== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-white">关联产品线</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {productLinkError && <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">{productLinkError}</div>}

            <form onSubmit={handleLinkProduct} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">选择产品线（可多选）*</label>
                  <button type="button" onClick={() => setLinkProductIds(linkProductIds.length === candidateProducts.length ? [] : candidateProducts.map((product) => product.id))} className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300">
                    {linkProductIds.length === candidateProducts.length && candidateProducts.length > 0 ? "取消全选" : "全选"}
                  </button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-input p-2">
                  {candidateProducts.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-200 hover:bg-white/5"><input type="checkbox" checked={linkProductIds.includes(product.id)} onChange={() => setLinkProductIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} className="h-3.5 w-3.5 accent-cyan-500" /><span className="min-w-0 flex-1 truncate">{product.name}</span></label>)}
                </div>
                {candidateProducts.length === 0 && <p className="text-[10px] text-muted-foreground">暂无可关联的产品线，请先在产品线管理中新增产品。</p>}
                {linkProductIds.length > 0 && <p className="text-[10px] text-cyan-300">已选择 {linkProductIds.length} 个产品线</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-lg border border-border bg-input py-2 px-4 text-xs font-medium text-white hover:bg-muted">取消</button>
                <button type="submit" disabled={isPending || linkProductIds.length === 0} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}确认关联
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== modal 5: 关联项目 ===== */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">关联项目</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {linkError && (
              <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkProject} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">选择项目（可多选）*</label>
                  <button type="button" onClick={() => setLinkProjectIds(linkProjectIds.length === candidateProjects.length ? [] : candidateProjects.map((project) => project.id))} className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {linkProjectIds.length === candidateProjects.length && candidateProjects.length > 0 ? "取消全选" : "全选"}
                  </button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-input p-2">
                  {candidateProjects.map((project) => <label key={project.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-foreground hover:bg-muted/50"><input type="checkbox" checked={linkProjectIds.includes(project.id)} onChange={() => setLinkProjectIds((current) => current.includes(project.id) ? current.filter((id) => id !== project.id) : [...current, project.id])} className="h-3.5 w-3.5 accent-indigo-500" /><span className="shrink-0 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-300">{project.key}</span><span className="min-w-0 flex-1 truncate">{project.name}</span></label>)}
                </div>
                {candidateProjects.length === 0 && <p className="text-[10px] text-muted-foreground">暂无可关联项目。</p>}
                {linkProjectIds.length > 0 && <p className="text-[10px] text-indigo-600 dark:text-indigo-300">已选择 {linkProjectIds.length} 个项目</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="rounded-lg border border-border bg-input py-2 px-4 text-xs font-medium text-foreground hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending || linkProjectIds.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  确认关联
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
