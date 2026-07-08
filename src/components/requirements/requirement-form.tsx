"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRequirement, updateRequirement } from "@/actions/requirements";
import { RequirementInput } from "@/lib/validations/requirements";
import { RequirementType, RequirementSource, Priority } from "@prisma/client";
import { Loader2, ArrowLeft, Save, Star } from "lucide-react";
import Link from "next/link";

interface RequirementFormProps {
  users: { id: string; name: string; username: string }[];
  projects: { id: string; name: string; key: string }[];
  productLineTeams: { id: string; name: string }[];
  initialData?: any; // 如果是编辑模式，传入旧数据
}

export default function RequirementForm({ users, projects, productLineTeams, initialData }: RequirementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  // 表单字段状态
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [type, setType] = useState<RequirementType>(initialData?.type || RequirementType.FUNCTIONAL);
  const [source, setSource] = useState<RequirementSource>(initialData?.source || RequirementSource.PRODUCT_PLANNING);
  const [priority, setPriority] = useState<Priority>(initialData?.priority || Priority.MEDIUM);
  const [businessValue, setBusinessValue] = useState<number>(initialData?.businessValue || 5);
  const [complexity, setComplexity] = useState<number>(initialData?.complexity || 5);
  const [estimatedDays, setEstimatedDays] = useState<string>(initialData?.estimatedDays?.toString() || "");
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || "");
  const [assigneeId, setAssigneeId] = useState<string>(initialData?.assigneeId || "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(initialData?.acceptanceCriteria || "");
  
  // 新增字段状态
  const [productLineTeamId, setProductLineTeamId] = useState<string>(initialData?.productLineTeamId || "");
  const [proposer, setProposer] = useState<string>(initialData?.proposer || "");
  
  const formatLocalDate = (dateObj?: Date) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    const monthStr = `${d.getMonth() + 1}`.padStart(2, "0");
    const dayStr = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${monthStr}-${dayStr}`;
  };

  const [proposedAt, setProposedAt] = useState<string>(
    initialData?.proposedAt 
      ? formatLocalDate(initialData.proposedAt) 
      : formatLocalDate(new Date())
  );
  
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 基础校验
    if (!title.trim()) {
      setError("请输入需求标题");
      return;
    }

    const payload: RequirementInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      source,
      priority,
      businessValue: Number(businessValue),
      complexity: Number(complexity),
      estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
      projectId: projectId || undefined,
      assigneeId: assigneeId || undefined,
      acceptanceCriteria: acceptanceCriteria.trim() || undefined,
      productLineTeamId: productLineTeamId || undefined,
      proposer: proposer.trim() || undefined,
      proposedAt: proposedAt || undefined,
    };

    startTransition(async () => {
      try {
        let res;
        if (isEditMode) {
          res = await updateRequirement(initialData.id, payload);
        } else {
          res = await createRequirement(payload);
        }

        if (!res.success) {
          setError(res.error || "操作失败，请重试");
          return;
        }

        router.push(isEditMode ? `/requirements/${initialData.id}` : "/requirements");
        router.refresh();
      } catch (err) {
        console.error("提交需求出错:", err);
        setError("系统错误，请稍后重试");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 基础信息卡片 */}
      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">基础信息</h2>

        {/* 标题 */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-medium text-muted-foreground">
            需求标题 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="请输入简洁明了的需求标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        {/* 描述 */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-medium text-muted-foreground">
            需求详细描述（支持 Markdown）
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="描述此需求要解决什么问题、用户场景是什么以及功能的详细说明..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none resize-y"
          />
        </div>

        {/* 属性网格 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 类型 */}
          <div className="space-y-1.5">
            <label htmlFor="type" className="block text-xs font-medium text-muted-foreground">
              需求类型 <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as RequirementType)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value={RequirementType.FUNCTIONAL}>功能需求</option>
              <option value={RequirementType.NON_FUNCTIONAL}>非功能需求</option>
              <option value={RequirementType.ENHANCEMENT}>体验优化</option>
              <option value={RequirementType.OPTIMIZATION}>性能优化</option>
              <option value={RequirementType.TECH_DEBT}>技术债务</option>
            </select>
          </div>

          {/* 来源 */}
          <div className="space-y-1.5">
            <label htmlFor="source" className="block text-xs font-medium text-muted-foreground">
              需求来源 <span className="text-red-500">*</span>
            </label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value as RequirementSource)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value={RequirementSource.PRODUCT_PLANNING}>产品规划</option>
              <option value={RequirementSource.CUSTOMER_FEEDBACK}>客户反馈</option>
              <option value={RequirementSource.INTERNAL_SUGGESTION}>内部建议</option>
              <option value={RequirementSource.MARKET_ANALYSIS}>市场分析</option>
              <option value={RequirementSource.TECH_DEBT}>技术债务</option>
            </select>
          </div>

          {/* 优先级 */}
          <div className="space-y-1.5">
            <label htmlFor="priority" className="block text-xs font-medium text-muted-foreground">
              优先级
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value={Priority.LOW}>低</option>
              <option value={Priority.MEDIUM}>中</option>
              <option value={Priority.HIGH}>高</option>
              <option value={Priority.URGENT}>紧急</option>
            </select>
          </div>
        </div>
      </div>

      {/* 评估与计划卡片 */}
      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">规划评估</h2>

        {/* 评分滑块（价值/复杂度） */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 业务价值 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                业务价值评分
              </label>
              <span className="text-sm font-semibold text-amber-400">{businessValue} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={businessValue}
              onChange={(e) => setBusinessValue(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-muted-foreground">评分越高代表给用户或业务带来的收益越大。</p>
          </div>

          {/* 技术复杂度 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground">技术复杂度评分</label>
              <span className="text-sm font-semibold text-indigo-400">{complexity} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={complexity}
              onChange={(e) => setComplexity(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-muted-foreground">评分越高表示设计、架构和开发的难度越高。</p>
          </div>
        </div>

        {/* 关联项目、负责人与预估时间 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 关联项目 */}
          <div className="space-y-1.5">
            <label htmlFor="projectId" className="block text-xs font-medium text-muted-foreground">
              关联项目（可选）
            </label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">暂不关联项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  [{project.key}] {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* 责任人 */}
          <div className="space-y-1.5">
            <label htmlFor="assigneeId" className="block text-xs font-medium text-muted-foreground">
              分配责任人（可选）
            </label>
            <select
              id="assigneeId"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">待分配</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* 预估时间 */}
          <div className="space-y-1.5">
            <label htmlFor="estimatedDays" className="block text-xs font-medium text-muted-foreground">
              预估工期（人天）
            </label>
            <input
              id="estimatedDays"
              type="number"
              step="0.5"
              placeholder="例如: 3.5"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 验收标准 */}
        <div className="space-y-1.5">
          <label htmlFor="acceptanceCriteria" className="block text-xs font-medium text-muted-foreground">
            验收标准（Acceptance Criteria）
          </label>
          <textarea
            id="acceptanceCriteria"
            rows={4}
            placeholder="- 输入明确的验收准则，如：\n- [ ] 1. 点击提交能够保存\n- [ ] 2. 字段为空时报错提示"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none resize-y"
          />
        </div>
      </div>

      {/* 需求来源与产品线归属卡片 */}
      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">需求来源信息</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 归属产品线小组 */}
          <div className="space-y-1.5">
            <label htmlFor="productLineTeamId" className="block text-xs font-medium text-muted-foreground">
              归属产品线小组（可选）
            </label>
            <select
              id="productLineTeamId"
              value={productLineTeamId}
              onChange={(e) => setProductLineTeamId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="">暂不关联产品线</option>
              {productLineTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* 需求提出方 */}
          <div className="space-y-1.5">
            <label htmlFor="proposer" className="block text-xs font-medium text-muted-foreground">
              需求提出方
            </label>
            <input
              id="proposer"
              type="text"
              placeholder="例如: 运营部-李四、大客户A"
              value={proposer}
              onChange={(e) => setProposer(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {/* 提出时间 */}
          <div className="space-y-1.5">
            <label htmlFor="proposedAt" className="block text-xs font-medium text-muted-foreground">
              需求提出时间
            </label>
            <input
              id="proposedAt"
              type="date"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 按钮行 */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isEditMode ? `/requirements/${initialData.id}` : "/requirements"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          取消并返回
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在保存...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? "保存修改" : "创建需求"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
