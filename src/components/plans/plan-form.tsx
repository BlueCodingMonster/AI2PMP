"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan, updatePlan, getParentPlanOptions, getPlanProductLineOptions } from "@/actions/plans";
import { PlanType, PlanStatus } from "@prisma/client";
import { Loader2, ArrowLeft, Save, Calendar } from "lucide-react";
import Link from "next/link";

interface PlanFormProps {
  initialData?: {
    id: string;
    title?: string;
    description?: string | null;
    type?: PlanType;
    status?: PlanStatus;
    productLineTeamId?: string | null;
    year?: number;
    halfYear?: number | null;
    quarter?: number | null;
    month?: number | null;
    startDate?: Date | string;
    endDate?: Date | string;
    parentPlanId?: string | null;
    sourcePlanId?: string | null;
    replacementPlanId?: string | null;
    adjustedReason?: string | null;
    voidedReason?: string | null;
    voidedAt?: Date | string | null;
    goals?: string | null;
  };
}

type ProductLineOption = { id: string; name: string };
type RelatedPlanOption = {
  id: string;
  title: string;
  type?: PlanType;
  halfYear?: number | null;
  quarter?: number | null;
  month?: number | null;
};

const typeLabels: Record<PlanType, string> = {
  ANNUAL: "年度计划",
  HALF_YEAR: "半年计划",
  QUARTERLY: "季度计划",
  MONTHLY: "月度计划",
};

function formatLocalDate(dateObj?: Date | string) {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  const monthStr = `${d.getMonth() + 1}`.padStart(2, "0");
  const dayStr = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${monthStr}-${dayStr}`;
}

function getQuarterFromMonth(month: number) {
  return Math.ceil(month / 3);
}

function relatedPlanLabel(plan: RelatedPlanOption) {
  const parts = [plan.title];
  if (plan.type) parts.push(`(${typeLabels[plan.type]}`);
  if (plan.halfYear) parts.push(`H${plan.halfYear}`);
  if (plan.quarter) parts.push(`Q${plan.quarter}`);
  if (plan.month) parts.push(`${plan.month}月`);
  return parts.join(" ").replace("(", "(").replace(/$/, plan.type ? ")" : "");
}

export default function PlanForm({ initialData }: PlanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [type, setType] = useState<PlanType>(initialData?.type || PlanType.ANNUAL);
  const [status, setStatus] = useState<PlanStatus>(initialData?.status || PlanStatus.DRAFT);
  const [productLineTeamId, setProductLineTeamId] = useState(initialData?.productLineTeamId || "");
  const [year, setYear] = useState<number>(initialData?.year || new Date().getFullYear());
  const [halfYear, setHalfYear] = useState<number>(initialData?.halfYear || 1);
  const [quarter, setQuarter] = useState<number>(initialData?.quarter || 1);
  const [month, setMonth] = useState<number>(initialData?.month || 1);
  const [startDate, setStartDate] = useState<string>(
    initialData?.startDate ? formatLocalDate(initialData.startDate) : ""
  );
  const [endDate, setEndDate] = useState<string>(
    initialData?.endDate ? formatLocalDate(initialData.endDate) : ""
  );
  const [parentPlanId, setParentPlanId] = useState<string>(initialData?.parentPlanId || "");
  const [adjustedReason, setAdjustedReason] = useState(initialData?.adjustedReason || "");
  const [voidedReason, setVoidedReason] = useState(initialData?.voidedReason || "");
  const [goals, setGoals] = useState(initialData?.goals || "");

  const [productLineOptions, setProductLineOptions] = useState<ProductLineOption[]>([]);
  const [parentOptions, setParentOptions] = useState<RelatedPlanOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductLines = async () => {
      const res = await getPlanProductLineOptions();
      if (res.success && res.data) {
        setProductLineOptions(res.data);
        if (!productLineTeamId && res.data.length > 0) {
          setProductLineTeamId(res.data[0].id);
        }
      }
    };

    fetchProductLines();
  }, [productLineTeamId]);

  useEffect(() => {
    const fetchParents = async () => {
      if (type === PlanType.ANNUAL || !productLineTeamId) {
        setParentOptions([]);
        setParentPlanId("");
        return;
      }

      setLoadingParents(true);
      try {
        const res = await getParentPlanOptions(type, Number(year), productLineTeamId);
        if (res.success && res.data) {
          setParentOptions(res.data);
          if (initialData?.parentPlanId && res.data.some((opt) => opt.id === initialData.parentPlanId)) {
            setParentPlanId(initialData.parentPlanId);
          } else if (!res.data.some((opt) => opt.id === parentPlanId)) {
            setParentPlanId("");
          }
        }
      } catch (err) {
        console.error("加载关联计划失败:", err);
      } finally {
        setLoadingParents(false);
      }
    };

    fetchParents();
  }, [type, year, productLineTeamId, initialData, parentPlanId]);

  const handleTypeChange = (value: PlanType) => {
    setType(value);
    setParentPlanId("");
  };

  const handlePeriodPreset = () => {
    if (type === PlanType.ANNUAL) {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (type === PlanType.HALF_YEAR) {
      if (Number(halfYear) === 1) {
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-06-30`);
      } else {
        setStartDate(`${year}-07-01`);
        setEndDate(`${year}-12-31`);
      }
    } else if (type === PlanType.QUARTERLY) {
      const q = Number(quarter);
      if (q === 1) {
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-03-31`);
      } else if (q === 2) {
        setStartDate(`${year}-04-01`);
        setEndDate(`${year}-06-30`);
      } else if (q === 3) {
        setStartDate(`${year}-07-01`);
        setEndDate(`${year}-09-30`);
      } else {
        setStartDate(`${year}-10-01`);
        setEndDate(`${year}-12-31`);
      }
    } else if (type === PlanType.MONTHLY) {
      const m = Number(month);
      const mStr = `${m}`.padStart(2, "0");
      const lastDay = new Date(year, m, 0).getDate();
      setStartDate(`${year}-${mStr}-01`);
      setEndDate(`${year}-${mStr}-${lastDay}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productLineTeamId) {
      setError("请选择产品线");
      return;
    }
    if (!title.trim()) {
      setError("请输入计划标题");
      return;
    }
    if (!startDate || !endDate) {
      setError("请选择起止日期");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      status,
      productLineTeamId,
      year: Number(year),
      halfYear: undefined,
      quarter:
        type === PlanType.QUARTERLY
          ? Number(quarter)
          : type === PlanType.MONTHLY
          ? getQuarterFromMonth(Number(month))
          : undefined,
      month: type === PlanType.MONTHLY ? Number(month) : undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      parentPlanId: parentPlanId || undefined,
      adjustedReason: adjustedReason.trim() || undefined,
      voidedReason: voidedReason.trim() || undefined,
      voidedAt: status === PlanStatus.CANCELLED ? new Date() : undefined,
      goals: goals.trim() || undefined,
    };

    startTransition(async () => {
      try {
        const res = isEditMode ? await updatePlan(initialData.id, payload) : await createPlan(payload);

        if (!res.success) {
          setError(res.error || "保存失败，请重试");
          return;
        }

        router.push(isEditMode ? `/plans/${initialData.id}` : "/plans");
        router.refresh();
      } catch (err) {
        console.error("保存计划出错:", err);
        setError("系统错误，请稍后重试");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">计划配置</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="productLineTeamId" className="block text-xs font-medium text-muted-foreground">
              产品线 <span className="text-red-500">*</span>
            </label>
            <select
              id="productLineTeamId"
              required
              value={productLineTeamId}
              onChange={(e) => setProductLineTeamId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="">请选择产品线</option>
              {productLineOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-xs font-medium text-muted-foreground">
              发布状态
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanStatus)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value={PlanStatus.DRAFT}>草稿</option>
              <option value={PlanStatus.PUBLISHED}>已发布</option>
              <option value={PlanStatus.IN_PROGRESS}>进行中</option>
              <option value={PlanStatus.ADJUSTED}>已调整</option>
              <option value={PlanStatus.COMPLETED}>已完成</option>
              <option value={PlanStatus.CANCELLED}>已作废</option>
              <option value={PlanStatus.ARCHIVED}>已归档</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="type" className="block text-xs font-medium text-muted-foreground">
              计划类型 <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as PlanType)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value={PlanType.ANNUAL}>年度计划</option>
              <option value={PlanType.QUARTERLY}>季度计划</option>
              <option value={PlanType.MONTHLY}>月度计划</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="year" className="block text-xs font-medium text-muted-foreground">
              所属年度 <span className="text-red-500">*</span>
            </label>
            <input
              id="year"
              type="number"
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
            />
          </div>

          {type === PlanType.HALF_YEAR && (
            <div className="space-y-1.5">
              <label htmlFor="halfYear" className="block text-xs font-medium text-muted-foreground">
                所属半年度 <span className="text-red-500">*</span>
              </label>
              <select
                id="halfYear"
                value={halfYear}
                onChange={(e) => setHalfYear(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value={1}>上半年 (H1)</option>
                <option value={2}>下半年 (H2)</option>
              </select>
            </div>
          )}

          {type === PlanType.QUARTERLY && (
            <div className="space-y-1.5">
              <label htmlFor="quarter" className="block text-xs font-medium text-muted-foreground">
                所属季度 <span className="text-red-500">*</span>
              </label>
              <select
                id="quarter"
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value={1}>第一季度 (Q1)</option>
                <option value={2}>第二季度 (Q2)</option>
                <option value={3}>第三季度 (Q3)</option>
                <option value={4}>第四季度 (Q4)</option>
              </select>
            </div>
          )}

          {type === PlanType.MONTHLY && (
            <div className="space-y-1.5">
              <label htmlFor="month" className="block text-xs font-medium text-muted-foreground">
                所属月份 <span className="text-red-500">*</span>
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {type !== PlanType.ANNUAL && (
          <div className="space-y-1.5">
            <label htmlFor="parentPlanId" className="block text-xs font-medium text-muted-foreground flex items-center gap-2">
              可选关联计划
              {loadingParents && <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />}
            </label>
            <select
              id="parentPlanId"
              value={parentPlanId}
              onChange={(e) => setParentPlanId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-3 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="">不关联其他计划</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {relatedPlanLabel(opt)}
                </option>
              ))}
            </select>
          </div>
        )}

        {status === PlanStatus.ADJUSTED && (
          <div className="space-y-1.5">
            <label htmlFor="adjustedReason" className="block text-xs font-medium text-muted-foreground">
              调整原因
            </label>
            <textarea
              id="adjustedReason"
              rows={2}
              value={adjustedReason}
              onChange={(e) => setAdjustedReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none resize-y"
            />
          </div>
        )}

        {status === PlanStatus.CANCELLED && (
          <div className="space-y-1.5">
            <label htmlFor="voidedReason" className="block text-xs font-medium text-muted-foreground">
              作废原因
            </label>
            <textarea
              id="voidedReason"
              rows={2}
              value={voidedReason}
              onChange={(e) => setVoidedReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none resize-y"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-medium text-muted-foreground">
            计划标题 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="例如: 2026年度研发计划"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-muted-foreground">计划起止时间</label>
            <button
              type="button"
              onClick={handlePeriodPreset}
              className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <Calendar className="h-3.5 w-3.5" />
              自动预设起止时间
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="startDate" className="block text-[10px] text-muted-foreground">开始日期</label>
              <input
                id="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="endDate" className="block text-[10px] text-muted-foreground">结束日期</label>
              <input
                id="endDate"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-2 px-4 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-medium text-muted-foreground">
            计划描述
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="描述该计划的背景、范围和预期效果..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="goals" className="block text-xs font-medium text-muted-foreground">
            核心目标
          </label>
          <textarea
            id="goals"
            rows={5}
            placeholder="1. 完成关键版本交付&#10;2. 推进重点需求落地&#10;3. 控制缺陷和交付风险"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full rounded-lg border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none resize-y"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Link
          href={isEditMode ? `/plans/${initialData.id}` : "/plans"}
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
              {isEditMode ? "保存修改" : "创建计划"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
