"use client";

import { useState, useTransition } from "react";
import { updateProfile, changePassword } from "@/actions/profile";
import {
  User,
  AtSign,
  Phone,
  Briefcase,
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Mail,
  GraduationCap,
  Sparkles,
  Edit2,
  Lock,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    phone: string | null;
    department: string | null;
    level: string | null;
    position: string | null;
    isAdmin: boolean;
    isActive: boolean;
    createdAt: string;
  };
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  // Form states - edit profile
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [editError, setEditError] = useState<string | null>(null);

  // Form states - change password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!name.trim()) {
      setEditError("姓名不能为空");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateProfile({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        });

        if (res.success) {
          setEditModalOpen(false);
          router.refresh();
        } else {
          setEditError(res.error || "更新个人信息失败");
        }
      } catch (err) {
        console.error(err);
        setEditError("系统错误，请重试");
      }
    });
  };

  const handlePwdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError("所有密码字段均必填");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("新密码长度不能少于 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("两次输入的新密码不一致");
      return;
    }

    startTransition(async () => {
      try {
        const res = await changePassword({
          oldPassword,
          newPassword,
        });

        if (res.success) {
          alert("密码修改成功！");
          setPwdModalOpen(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          router.refresh();
        } else {
          setPwdError(res.error || "修改密码失败");
        }
      } catch (err) {
        console.error(err);
        setPwdError("系统错误，请重试");
      }
    });
  };

  const initials = user.name.slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* 头部标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">个人信息</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            查看并维护您的个人档案信息及系统登录密码。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-input border border-border px-4 py-2 text-xs font-semibold text-white hover:bg-accent transition"
          >
            <Edit2 className="h-4 w-4 text-indigo-400" />
            编辑资料
          </button>
          <button
            onClick={() => setPwdModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-input border border-border px-4 py-2 text-xs font-semibold text-white hover:bg-accent transition"
          >
            <Lock className="h-4 w-4 text-amber-400" />
            修改密码
          </button>
        </div>
      </div>

      {/* 个人资料卡片 */}
      <div className="max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* 卡片顶部渐变背景 */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white uppercase border-4 border-card shadow-lg">
              {initials}
            </div>
          </div>
        </div>

        {/* 资料主体内容 */}
        <div className="px-8 pt-14 pb-8 space-y-6">
          {/* 用户姓名与基本标签 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {user.name}
                <span className="text-xs font-normal text-indigo-300">@{user.username}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {user.department || "暂未分配部门"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                  <Shield className="h-3 w-3" />
                  系统管理员
                </span>
              )}
              {user.isActive ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="h-3 w-3" />
                  账号已启用
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                  <UserX className="h-3 w-3" />
                  账号已禁用
                </span>
              )}
            </div>
          </div>

          {/* 详细属性列表网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/90">
            {/* 登录名 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <AtSign className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">登录名</p>
                <p className="font-medium mt-0.5">{user.username}</p>
              </div>
            </div>

            {/* 电子邮箱 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <Mail className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">电子邮箱</p>
                <p className="font-medium mt-0.5 truncate">{user.email || "未绑定邮箱"}</p>
              </div>
            </div>

            {/* 联系电话 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <Phone className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">联系电话</p>
                <p className="font-medium mt-0.5">{user.phone || "未录入电话"}</p>
              </div>
            </div>

            {/* 所属部门 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <Briefcase className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">所属部门</p>
                <p className="font-medium mt-0.5">{user.department || "未分配部门"}</p>
              </div>
            </div>

            {/* 人员层级 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <GraduationCap className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">人员层级</p>
                <p className="font-medium mt-0.5">{user.level || "未设定层级"}</p>
              </div>
            </div>

            {/* 专业岗位 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30">
              <Sparkles className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">专业岗位</p>
                <p className="font-medium mt-0.5">{user.position || "未设定岗位"}</p>
              </div>
            </div>

            {/* 注册时间 */}
            <div className="flex items-start gap-3 bg-black/10 rounded-xl p-3 border border-border/30 md:col-span-2">
              <Calendar className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">账号创建时间</p>
                <p className="font-medium mt-0.5">{user.createdAt}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 编辑个人资料 Modal ===== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white">编辑个人资料</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">真实姓名 *</label>
                <input
                  type="text"
                  required
                  placeholder="请输入真实姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">电子邮箱</label>
                <input
                  type="email"
                  placeholder="请输入您的电子邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">联系电话</label>
                <input
                  type="text"
                  placeholder="请输入您的电话号码"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-border bg-transparent px-4 py-2 font-semibold text-muted-foreground hover:bg-accent hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 修改密码 Modal ===== */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-semibold text-white">修改登录密码</h3>
              <button
                onClick={() => setPwdModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pwdError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {pwdError}
              </div>
            )}

            <form onSubmit={handlePwdSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">当前密码 *</label>
                <input
                  type="password"
                  required
                  placeholder="请输入当前的旧密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">新密码 *</label>
                <input
                  type="password"
                  required
                  placeholder="请输入至少6位新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium">确认新密码 *</label>
                <input
                  type="password"
                  required
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="rounded-lg border border-border bg-transparent px-4 py-2 font-semibold text-muted-foreground hover:bg-accent hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
