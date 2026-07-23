"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderKanban,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ProjectStatus } from "@prisma/client";
import {
  createProject,
  createProjectVersion,
  deleteProject,
  deleteProjectVersion,
  updateProject,
  updateProjectVersion,
} from "@/actions/projects";

type Person = {
  id: string;
  name: string;
  username: string;
  department: string | null;
  position: string | null;
};
type Project = {
  id: string;
  name: string;
  key: string;
  customerName: string;
  customerContact: string | null;
  customerPhone: string | null;
  projectManagerId: string | null;
  projectManager: Person | null;
  marketManager: string | null;
  salesManager: string | null;
  contractNumber: string | null;
  contractAmount: string | null;
  contractSignedAt: string | null;
  warrantyMonths: number | null;
  warrantyExpiresAt: string | null;
  warrantyExpired: boolean;
  status: ProjectStatus;
  acceptanceDate: string | null;
  description: string | null;
  versions: Array<{ id: string; version: string }>;
};

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: ProjectStatus.CONTRACT_SIGNED, label: "合同签订" },
  { value: ProjectStatus.IMPLEMENTING, label: "实施中" },
  { value: ProjectStatus.ACCEPTANCE, label: "验收中" },
  { value: ProjectStatus.ARCHIVED, label: "完成归档" },
];
const statusLabel = Object.fromEntries(
  statusOptions.map((item) => [item.value, item.label]),
) as Record<ProjectStatus, string>;
const fieldClass =
  "w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground outline-none transition focus:border-cyan-500/60";
type ProjectFormState = {
  name: string;
  key: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  projectManagerId: string;
  marketManager: string;
  salesManager: string;
  contractNumber: string;
  contractAmount: string;
  contractSignedAt: string;
  warrantyMonths: string;
  warrantyExpiresAt: string;
  status: ProjectStatus;
  acceptanceDate: string;
  description: string;
};
const emptyForm: ProjectFormState = {
  name: "",
  key: "",
  customerName: "",
  customerContact: "",
  customerPhone: "",
  projectManagerId: "",
  marketManager: "",
  salesManager: "",
  contractNumber: "",
  contractAmount: "",
  contractSignedAt: "",
  warrantyMonths: "",
  warrantyExpiresAt: "",
  status: ProjectStatus.CONTRACT_SIGNED,
  acceptanceDate: "",
  description: "",
};

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function ProjectLedgerManager({
  projects,
  people,
}: {
  projects: Project[];
  people: Person[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [versionNo, setVersionNo] = useState("");
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editVersionNo, setEditVersionNo] = useState("");

  const selected =
    projects.find((item) => item.id === selectedId) ?? projects[0];
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword
      ? projects.filter((item) =>
          [item.name, item.key, item.customerName].some((value) =>
            value.toLowerCase().includes(keyword),
          ),
        )
      : projects;
  }, [projects, query]);

  const change = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const beginCreate = () => {
    setForm(emptyForm);
    setMode("create");
    setError(null);
  };
  const beginEdit = (project = selected) => {
    if (!project) return;
    setSelectedId(project.id);
    setForm({
      name: project.name,
      key: project.key,
      customerName: project.customerName,
      customerContact: project.customerContact ?? "",
      customerPhone: project.customerPhone ?? "",
      projectManagerId: project.projectManagerId ?? "",
      marketManager: project.marketManager ?? "",
      salesManager: project.salesManager ?? "",
      contractNumber: project.contractNumber ?? "",
      contractAmount: project.contractAmount ?? "",
      contractSignedAt: dateValue(project.contractSignedAt),
      warrantyMonths: project.warrantyMonths?.toString() ?? "",
      warrantyExpiresAt: dateValue(project.warrantyExpiresAt),
      status: project.status,
      acceptanceDate: dateValue(project.acceptanceDate),
      description: project.description ?? "",
    });
    setMode("edit");
    setError(null);
  };

  const submitProject = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      ...form,
      warrantyMonths:
        form.warrantyMonths === "" ? null : Number(form.warrantyMonths),
      contractAmount: form.contractAmount || null,
    };
    startTransition(async () => {
      if (mode === "edit" && selected) {
        const result = await updateProject(selected.id, payload);
        if (!result.success) return setError(result.error ?? "保存项目失败");
      } else {
        const result = await createProject(payload);
        if (!result.success) return setError(result.error ?? "保存项目失败");
        if (result.data?.id) setSelectedId(result.data.id);
      }
      setMode("view");
      router.refresh();
    });
  };

  const removeProject = (project = selected) => {
    if (
      !project ||
      !window.confirm(
        `确认删除“${project.name}”及其全部版本吗？此操作不可恢复。`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (!result.success) return setError(result.error ?? "删除项目失败");
      if (selectedId === project.id) setSelectedId("");
      router.refresh();
    });
  };

  const submitVersion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      const result = await createProjectVersion({
        projectId: selected.id,
        version: versionNo,
      });
      if (!result.success) return setError(result.error ?? "新增版本失败");
      setVersionNo("");
      router.refresh();
    });
  };
  const saveVersion = (event: React.FormEvent, id: string) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProjectVersion(id, editVersionNo);
      if (!result.success) return setError(result.error ?? "编辑版本失败");
      setEditingVersionId(null);
      router.refresh();
    });
  };
  const removeVersion = (item: { id: string; version: string }) => {
    if (!window.confirm(`确认删除项目版本“${item.version}”吗？`)) return;
    startTransition(async () => {
      const result = await deleteProjectVersion(item.id);
      if (!result.success) return setError(result.error ?? "删除版本失败");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-9 text-white">项目管理</h1>
            <p className="text-xs text-muted-foreground">
              独立维护客户合同项目资料及交付版本。
            </p>
          </div>
        </div>
        <span className="rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <strong className="mr-1 text-white">{projects.length}</strong>项目
        </span>
      </header>
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-black/10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border/60 bg-black/10 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-semibold text-white">项目列表</h2>
              <p className="text-[10px] text-muted-foreground">
                选择项目查看资料与版本
              </p>
            </div>
            <button
              onClick={beginCreate}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-cyan-600 px-2.5 text-[11px] font-semibold text-white hover:bg-cyan-500"
            >
              <Plus className="h-3.5 w-3.5" />
              项目
            </button>
          </div>
          <label className="relative mb-2 block">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、编号或客户"
              className={`${fieldClass} pl-8`}
            />
          </label>
          <div className="space-y-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition ${item.id === selected?.id && mode !== "create" ? "bg-cyan-500/15 ring-1 ring-cyan-500/30 font-semibold" : item.warrantyExpired ? "bg-red-500/[0.08] text-foreground ring-1 ring-red-500/30 hover:bg-red-500/10" : "text-foreground hover:bg-muted"}`}
              >
                <button
                  onClick={() => {
                    setSelectedId(item.id);
                    setMode("view");
                    setError(null);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                >
                  <FolderKanban className={`h-4 w-4 shrink-0 ${item.id === selected?.id && mode !== "create" ? "text-cyan-600 dark:text-cyan-300" : "text-slate-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-xs ${item.id === selected?.id && mode !== "create" ? "font-bold text-cyan-900 dark:text-cyan-100" : "font-medium text-foreground"}`}>
                      {item.name}
                    </span>
                    <span className={`block truncate text-[10px] ${item.id === selected?.id && mode !== "create" ? "text-cyan-700 dark:text-cyan-300" : "text-muted-foreground"}`}>
                      {item.key} · {item.customerName}
                    </span>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${item.id === selected?.id && mode !== "create" ? "bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 font-bold" : "bg-muted text-muted-foreground font-medium"}`}>
                    {item.versions.length}
                  </span>
                </button>
                {item.warrantyExpired && (
                  <span className="shrink-0 rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">
                    质保已过期
                  </span>
                )}
                <button
                  title="编辑项目"
                  aria-label={`编辑项目 ${item.name}`}
                  onClick={() => beginEdit(item)}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:bg-white/10 hover:text-cyan-300 group-hover:opacity-100 focus:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  title="删除项目"
                  aria-label={`删除项目 ${item.name}`}
                  onClick={() => removeProject(item)}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                暂无匹配项目
              </p>
            )}
          </div>
        </aside>
        <main className="min-w-0 p-4 lg:p-5">
          {mode !== "view" ? (
            <ProjectForm
              form={form}
              people={people}
              mode={mode}
              pending={pending}
              change={change}
              submit={submitProject}
              cancel={() => setMode("view")}
            />
          ) : !selected ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">
              请先新增项目
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                      {selected.key}
                    </span>
                    <h2 className="text-lg font-semibold text-white">
                      {selected.name}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                    {statusLabel[selected.status]}
                  </span>
                  <button
                    onClick={() => beginEdit()}
                    title="编辑项目"
                    className="rounded p-1.5 text-muted-foreground hover:bg-white/10 hover:text-cyan-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeProject()}
                    title="删除项目"
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <section>
                <h3 className="mb-2 text-xs font-semibold text-white">
                  项目资料
                </h3>
                <div className="grid gap-x-6 gap-y-3 rounded-lg border border-border/50 bg-white/[0.02] p-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Info label="客户联系人" value={selected.customerContact} />
                  <Info label="客户联系电话" value={selected.customerPhone} />
                  <Info
                    label="项目负责人"
                    value={selected.projectManager?.name}
                  />
                  <Info label="市场负责人" value={selected.marketManager} />
                  <Info label="销售负责人" value={selected.salesManager} />
                  <Info label="合同编号" value={selected.contractNumber} />
                  <Info
                    label="合同金额"
                    value={
                      selected.contractAmount
                        ? `¥ ${Number(selected.contractAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`
                        : null
                    }
                  />
                  <Info
                    label="合同签订日期"
                    value={dateValue(selected.contractSignedAt)}
                  />
                  <Info
                    label="质保周期（月）"
                    value={selected.warrantyMonths?.toString()}
                  />
                  <Info
                    label="质保到期日"
                    value={dateValue(selected.warrantyExpiresAt)}
                  />
                  <Info
                    label="验收日期"
                    value={dateValue(selected.acceptanceDate)}
                  />
                  {selected.description && (
                    <div className="sm:col-span-2 xl:col-span-3">
                      <Info label="项目说明" value={selected.description} />
                    </div>
                  )}
                </div>
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">项目版本</h3>
                  <span className="text-[10px] text-muted-foreground">
                    {selected.versions.length} 个版本
                  </span>
                </div>
                <form
                  onSubmit={submitVersion}
                  className="flex gap-2 rounded-lg border border-border/50 bg-white/[0.02] p-3"
                >
                  <input
                    required
                    value={versionNo}
                    onChange={(e) => setVersionNo(e.target.value)}
                    placeholder="输入版本号，如 V1.0"
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  <button
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    新增版本
                  </button>
                </form>
                <div className="overflow-hidden rounded-lg border border-border/50">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                    <span>版本号</span>
                    <span>操作</span>
                  </div>
                  {selected.versions.length === 0 ? (
                    <div className="py-10 text-center text-xs text-muted-foreground">
                      暂无项目版本
                    </div>
                  ) : (
                    selected.versions.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-t border-border/40 px-3 py-2.5"
                      >
                        {editingVersionId === item.id ? (
                          <form
                            onSubmit={(e) => saveVersion(e, item.id)}
                            className="flex min-w-0 gap-2"
                          >
                            <input
                              required
                              autoFocus
                              value={editVersionNo}
                              onChange={(e) => setEditVersionNo(e.target.value)}
                              className={`${fieldClass} h-8`}
                            />
                            <button className="rounded bg-cyan-600 p-1.5 text-white">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVersionId(null)}
                              className="rounded p-1.5 text-muted-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs font-semibold text-white">
                            {item.version}
                          </span>
                        )}
                        {editingVersionId !== item.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingVersionId(item.id);
                                setEditVersionNo(item.version);
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:text-cyan-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeVersion(item)}
                              className="rounded p-1.5 text-muted-foreground hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-xs font-medium text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

function FormField({
  form,
  change,
  name,
  label,
  required,
  type = "text",
  placeholder,
  disabled,
  step,
  min,
}: {
  form: ProjectFormState;
  change: (key: keyof ProjectFormState, value: string) => void;
  name: keyof ProjectFormState;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] text-muted-foreground">
        {label}
        {required && <b className="ml-0.5 text-red-400">*</b>}
      </span>
      <input
        required={required}
        disabled={disabled}
        type={type}
        step={step}
        min={min}
        value={form[name]}
        onChange={(event) => change(name, event.target.value)}
        placeholder={placeholder}
        className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
      />
    </label>
  );
}

function ProjectForm({
  form,
  people,
  mode,
  pending,
  change,
  submit,
  cancel,
}: {
  form: typeof emptyForm;
  people: Person[];
  mode: "create" | "edit";
  pending: boolean;
  change: (key: keyof typeof emptyForm, value: string) => void;
  submit: (event: React.FormEvent) => void;
  cancel: () => void;
}) {
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            {mode === "create" ? "新增项目" : "编辑项目资料"}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            项目台账独立维护，暂不关联其他业务模块。
          </p>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="rounded p-1.5 text-muted-foreground hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FormField form={form} change={change} name="name" label="项目名称" required />
        <FormField
          form={form}
          change={change}
          name="key"
          label="项目编号"
          required
          placeholder="如 NYGL"
          disabled={mode === "edit"}
        />
        <FormField form={form} change={change} name="customerName" label="客户名称" required />
        <FormField form={form} change={change} name="customerContact" label="客户联系人" />
        <FormField form={form} change={change} name="customerPhone" label="客户联系电话" />
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            项目负责人<b className="ml-0.5 text-red-400">*</b>
          </span>
          <select
            required
            value={form.projectManagerId}
            onChange={(e) => change("projectManagerId", e.target.value)}
            className={fieldClass}
          >
            <option value="">请选择人员</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}（{person.department || "未分部门"}）
              </option>
            ))}
          </select>
        </label>
        <FormField form={form} change={change} name="marketManager" label="市场负责人" />
        <FormField form={form} change={change} name="salesManager" label="销售负责人" />
        <FormField form={form} change={change} name="contractNumber" label="合同编号" />
        <FormField
          form={form}
          change={change}
          name="contractAmount"
          label="合同金额（元）"
          type="number"
          min="0"
          step="0.01"
        />
        <FormField form={form} change={change} name="contractSignedAt" label="合同签订日期" type="date" />
        <FormField
          form={form}
          change={change}
          name="warrantyMonths"
          label="质保周期（月）"
          type="number"
          min="0"
          step="1"
        />
        <FormField form={form} change={change} name="warrantyExpiresAt" label="质保到期日" type="date" />
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">项目状态</span>
          <select
            value={form.status}
            onChange={(e) => change("status", e.target.value)}
            className={fieldClass}
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <FormField
          form={form}
          change={change}
          name="acceptanceDate"
          label="验收日期"
          type="date"
          required={form.status === ProjectStatus.ARCHIVED}
        />
      </div>
      <label className="block space-y-1">
        <span className="text-[10px] text-muted-foreground">项目说明/备注</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
          className={`${fieldClass} resize-y`}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg px-4 py-2 text-xs text-muted-foreground hover:bg-white/5"
        >
          取消
        </button>
        <button
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}保存项目
        </button>
      </div>
    </form>
  );
}
