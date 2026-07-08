"use client";

import { useState, useEffect, useTransition } from "react";
import { createMember, updateMember } from "@/actions/team";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: any; // 如果是编辑模式，传入当前用户信息
}

export default function MemberModal({ isOpen, onClose, editData }: MemberModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!editData;

  // 表单状态
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化
  useEffect(() => {
    if (editData) {
      setName(editData.name || "");
      setUsername(editData.username || "");
      setPassword(""); // 编辑时不输入密码则代表不修改
      setPhone(editData.phone || "");
      setDepartment(editData.department || "");
      setIsAdmin(editData.isAdmin || false);
      setIsActive(editData.isActive || false);
    } else {
      setName("");
      setUsername("");
      setPassword("");
      setPhone("");
      setDepartment("");
      setIsAdmin(false);
      setIsActive(true);
    }
    setError(null);
  }, [editData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("请输入真实姓名");
      return;
    }
    if (!username.trim()) {
      setError("请输入登录名");
      return;
    }
    if (!isEditMode && !password) {
      setError("请输入初始登录密码");
      return;
    }
    if (!isEditMode && password.length < 6) {
      setError("登录密码至少为 6 位数");
      return;
    }

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          const payload = {
            name: name.trim(),
            username: username.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            department: department.trim() || undefined,
            isAdmin,
            isActive,
          };
          res = await updateMember(editData.id, payload);
        } else {
          const payload = {
            name: name.trim(),
            username: username.trim().toLowerCase(),
            password: password,
            phone: phone.trim() || undefined,
            department: department.trim() || undefined,
            isAdmin,
            isActive,
          };
          res = await createMember(payload);
        }

        if (!res.success) {
          setError(res.error || "保存失败，请稍后重试");
          return;
        }

        onClose();
        router.refresh();
      } catch (err) {
        console.error("提交团队成员出错:", err);
        setError("系统错误，请重试");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-semibold text-white">
            {isEditMode ? `修改成员 - ${editData.name}` : "录入团队成员"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 姓名 */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">真实姓名 *</label>
            <input
              type="text"
              required
              placeholder="请输入成员姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 登录名 */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">登录名 *</label>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="例如: zhanghua"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 密码（新增模式必填，编辑模式不填代表不修改） */}
          {!isEditMode && (
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">初始密码 *</label>
              <input
                type="password"
                required
                placeholder="请输入至少6位初始密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* 电话 */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">联系电话</label>
            <input
              type="text"
              placeholder="例如: 13800138000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 部门 */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground font-medium">所属部门</label>
            <input
              type="text"
              placeholder="例如: 产品部、研发二组、质保中心"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* 权限及激活状态选项 */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded border-border bg-input text-indigo-600 focus:ring-primary h-4.5 w-4.5"
              />
              <span className="text-muted-foreground font-medium">设为系统管理员</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border bg-input text-indigo-600 focus:ring-primary h-4.5 w-4.5"
              />
              <span className="text-muted-foreground font-medium">账户已启用 (Active)</span>
            </label>
          </div>

          {/* 按钮行 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-input px-4 py-2 font-medium text-white hover:bg-muted"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 font-medium text-white shadow-lg disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEditMode ? "确认保存" : "确认录入"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
