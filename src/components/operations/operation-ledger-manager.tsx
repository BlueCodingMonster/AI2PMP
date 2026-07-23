"use client";

import { useRef, useState, useTransition } from "react";
import { ClipboardList, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { createOperationRecord, deleteOperationRecord, updateOperationRecord } from "@/actions/operations";

type VersionType = "PRODUCT" | "PROJECT";
type VersionOption = { id: string; ownerId: string; label: string; version: string };
type Person = { id: string; name: string };
type RecordItem = {
  id: string; sequenceNo: number; ownershipVersionType: VersionType; ownershipVersionId: string;
  type: string; eventDescription: string; occurredAt: string; reporter: string; handlerIds: string[];
  handlers: Person[]; status: string; operationContent: string; processingStartedAt: string | null;
  processingCompletedAt: string | null; customerConfirmationStatus: string; fixVersionType: VersionType | null;
  fixVersionId: string | null; followUpActions: string | null; notes: string | null; createdAt: string;
};

const typeLabels: Record<string, string> = { DATA_REPAIR: "数据修复", ENVIRONMENT_CONFIGURATION: "环境配置", CONSULTATION: "咨询答疑", CODE_BUG: "代码缺陷（Bug）", OTHER: "其他" };
const statusLabels: Record<string, string> = { PENDING: "待处理", PROCESSING: "处理中", PENDING_CONFIRMATION: "待确认", COMPLETED: "已完成" };
const confirmationLabels: Record<string, string> = { PENDING: "待确认", CONFIRMED: "已确认" };
const initialForm = { ownershipVersionType: "PRODUCT" as VersionType, ownershipVersionId: "", type: "DATA_REPAIR", eventDescription: "", occurredAt: "", reporter: "", handlerIds: [] as string[], status: "PENDING", operationContent: "", processingStartedAt: "", processingCompletedAt: "", customerConfirmationStatus: "PENDING", fixVersionType: "" as "" | VersionType, fixVersionId: "", followUpActions: "", notes: "" };
type Form = typeof initialForm;

function localDateTime(value: string | null) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function displayDate(value: string | null) { return value ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "—"; }
function plainText(html: string) { return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const run = (command: string) => { document.execCommand(command); ref.current?.focus(); onChange(ref.current?.innerHTML || ""); };
  return <div className="rounded-lg border border-border bg-input"><div className="flex gap-1 border-b border-border p-2">{[["bold", "加粗"], ["italic", "斜体"], ["insertUnorderedList", "项目符号"]].map(([command, label]) => <button key={command} type="button" onClick={() => run(command)} className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-white">{label}</button>)}</div><div ref={ref} contentEditable suppressContentEditableWarning onInput={(event) => onChange(event.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: value }} className="min-h-32 px-3 py-2 text-sm text-white outline-none" /></div>;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Record<string, string> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="control">{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
}
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block space-y-1.5 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs text-muted-foreground">{label}</span>{children}</label>; }
function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-white/[0.018] p-4"><div className="mb-4"><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>{children}</section>; }
function StatusBadge({ value }: { value: string }) { const color = value === "COMPLETED" ? "bg-emerald-500/10 text-emerald-300" : value === "PROCESSING" ? "bg-blue-500/10 text-blue-300" : value === "PENDING_CONFIRMATION" ? "bg-amber-500/10 text-amber-300" : "bg-slate-500/10 text-slate-300"; return <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{statusLabels[value]}</span>; }

export default function OperationLedgerManager({ records, versions, people }: { records: RecordItem[]; versions: { products: VersionOption[]; projects: VersionOption[] }; people: Person[] }) {
  const [query, setQuery] = useState(""); const [typeFilter, setTypeFilter] = useState(""); const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false); const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(initialForm); const [error, setError] = useState(""); const [pending, startTransition] = useTransition();
  const options = form.ownershipVersionType === "PRODUCT" ? versions.products : versions.projects;
  const owner = options.find((item) => item.id === form.ownershipVersionId);
  const fixOptions = options.filter((item) => !owner || item.ownerId === owner.ownerId);
  const optionLabel = (record: RecordItem) => (record.ownershipVersionType === "PRODUCT" ? versions.products : versions.projects).find((item) => item.id === record.ownershipVersionId)?.label || "版本已删除";
  const filtered = records.filter((record) => {
    const text = `${record.sequenceNo} ${optionLabel(record)} ${plainText(record.eventDescription)} ${record.reporter} ${record.handlers.map((item) => item.name).join(" ")}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!typeFilter || record.type === typeFilter) && (!statusFilter || record.status === statusFilter);
  });
  const change = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => { setEditingId(null); setForm({ ...initialForm, occurredAt: localDateTime(new Date().toISOString()) }); setError(""); setModalOpen(true); };
  const openEdit = (record: RecordItem) => { setEditingId(record.id); setForm({ ownershipVersionType: record.ownershipVersionType, ownershipVersionId: record.ownershipVersionId, type: record.type, eventDescription: record.eventDescription, occurredAt: localDateTime(record.occurredAt), reporter: record.reporter, handlerIds: record.handlerIds, status: record.status, operationContent: record.operationContent, processingStartedAt: localDateTime(record.processingStartedAt), processingCompletedAt: localDateTime(record.processingCompletedAt), customerConfirmationStatus: record.customerConfirmationStatus, fixVersionType: record.fixVersionType || "", fixVersionId: record.fixVersionId || "", followUpActions: record.followUpActions || "", notes: record.notes || "" }); setError(""); setModalOpen(true); };
  const submit = () => startTransition(async () => { setError(""); const payload = { ...form, fixVersionType: form.fixVersionType || null, fixVersionId: form.fixVersionId || null }; const result = editingId ? await updateOperationRecord(editingId, payload as never) : await createOperationRecord(payload as never); if (!result.success) return setError(result.error || "保存失败"); setModalOpen(false); });
  const remove = (id: string) => { if (!confirm("确定删除这条运维记录吗？")) return; startTransition(async () => { const result = await deleteOperationRecord(id); if (!result.success) alert(result.error); }); };

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-white"><ClipboardList className="h-6 w-6 text-indigo-400" />运维信息台账</h1><p className="mt-1 text-sm text-muted-foreground">统一记录版本相关的数据修复、环境配置、咨询答疑与代码缺陷处理。</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"><Plus className="h-4 w-4" />新增运维记录</button></div>
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_180px_180px]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索编号、版本、事件或反馈人员" className="control w-full pl-9" /></label><Select value={typeFilter} onChange={setTypeFilter} options={{ "": "全部类型", ...typeLabels }} /><Select value={statusFilter} onChange={setStatusFilter} options={{ "": "全部状态", ...statusLabels }} /></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[1300px] text-left text-sm"><thead className="bg-white/5 text-xs text-muted-foreground"><tr>{["记录编号", "归属版本", "运维类型", "事件描述", "发生时间", "反馈人员", "处理人员", "处理状态", "客户确认", "完成时间", "操作"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{filtered.map((record) => <tr key={record.id} className="border-t border-border align-top hover:bg-white/[0.025]"><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-indigo-300">OPS-{new Date(record.occurredAt).getFullYear()}-{String(record.sequenceNo).padStart(4, "0")}</td><td className="px-4 py-3 text-white">{optionLabel(record)}</td><td className="whitespace-nowrap px-4 py-3">{typeLabels[record.type]}</td><td className="max-w-72 px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{plainText(record.eventDescription)}</span></td><td className="whitespace-nowrap px-4 py-3">{displayDate(record.occurredAt)}</td><td className="px-4 py-3">{record.reporter}</td><td className="px-4 py-3">{record.handlers.map((item) => item.name).join("、")}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td><td className="px-4 py-3">{confirmationLabels[record.customerConfirmationStatus]}</td><td className="whitespace-nowrap px-4 py-3">{displayDate(record.processingCompletedAt)}</td><td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(record)} className="rounded p-2 text-indigo-300 hover:bg-indigo-500/10"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(record.id)} disabled={pending} className="rounded p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-16 text-center text-muted-foreground">暂无符合条件的运维记录</td></tr>}</tbody></table></div>
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"><div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h2 className="text-lg font-semibold text-white">{editingId ? "编辑运维记录" : "新增运维记录"}</h2><p className="mt-0.5 text-xs text-muted-foreground">带 * 的字段为必填项</p></div><button onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <FormSection title="事件信息" description="明确运维事件的归属、来源与发生时间">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8"><Field label="归属版本 *"><div className="grid gap-2 sm:grid-cols-[140px_1fr]"><Select value={form.ownershipVersionType} onChange={(value) => setForm((current) => ({ ...current, ownershipVersionType: value as VersionType, ownershipVersionId: "", fixVersionType: "", fixVersionId: "" }))} options={{ PRODUCT: "产品版本", PROJECT: "项目版本" }} /><select value={form.ownershipVersionId} onChange={(event) => change("ownershipVersionId", event.target.value)} className="control w-full"><option value="">请选择归属版本</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></Field></div>
            <div className="lg:col-span-4"><Field label="运维类型 *"><Select value={form.type} onChange={(value) => change("type", value)} options={typeLabels} /></Field></div>
            <div className="lg:col-span-12"><Field label="事件描述 *"><RichTextEditor key={`${editingId || "new"}-${modalOpen}`} value={form.eventDescription} onChange={(value) => change("eventDescription", value)} /></Field></div>
            <div className="lg:col-span-6"><Field label="发生时间 *"><input type="datetime-local" value={form.occurredAt} onChange={(event) => change("occurredAt", event.target.value)} className="control w-full" /></Field></div>
            <div className="lg:col-span-6"><Field label="反馈人员 *"><input value={form.reporter} onChange={(event) => change("reporter", event.target.value)} className="control w-full" placeholder="手动录入反馈人姓名" /></Field></div>
          </div>
        </FormSection>
        <FormSection title="处理信息" description="记录责任人员、当前进度和实际处理内容">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12"><Field label={`处理人员 *${form.handlerIds.length ? `（已选 ${form.handlerIds.length} 人）` : ""}`}><div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border bg-input p-2 sm:grid-cols-3 lg:grid-cols-5">{people.map((person) => { const checked = form.handlerIds.includes(person.id); return <label key={person.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-100" : "border-transparent text-foreground hover:bg-muted"}`}><input type="checkbox" checked={checked} onChange={(event) => change("handlerIds", event.target.checked ? [...form.handlerIds, person.id] : form.handlerIds.filter((id) => id !== person.id))} className="accent-indigo-500" />{person.name}</label>; })}</div></Field></div>
            <div className="lg:col-span-3"><Field label="处理状态 *"><Select value={form.status} onChange={(value) => change("status", value)} options={statusLabels} /></Field></div>
            <div className="lg:col-span-3"><Field label="客户确认情况 *"><Select value={form.customerConfirmationStatus} onChange={(value) => change("customerConfirmationStatus", value)} options={confirmationLabels} /></Field></div>
            <div className="lg:col-span-3"><Field label="开始处理时间"><input type="datetime-local" value={form.processingStartedAt} onChange={(event) => change("processingStartedAt", event.target.value)} className="control w-full" /></Field></div>
            <div className="lg:col-span-3"><Field label="完成处理时间"><input type="datetime-local" value={form.processingCompletedAt} onChange={(event) => change("processingCompletedAt", event.target.value)} className="control w-full" /></Field></div>
            <div className="lg:col-span-12"><Field label="运维内容 *"><textarea value={form.operationContent} onChange={(event) => change("operationContent", event.target.value)} rows={4} className="control w-full resize-y" placeholder="填写具体处理步骤、操作内容和处理结果" /></Field></div>
          </div>
        </FormSection>
        <FormSection title="结果与跟进" description="补充修复版本及后续需要持续跟踪的事项">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5"><Field label="修复版本"><select value={form.fixVersionId} disabled={!form.ownershipVersionId} onChange={(event) => { change("fixVersionId", event.target.value); change("fixVersionType", event.target.value ? form.ownershipVersionType : ""); }} className="control w-full"><option value="">不选择</option>{fixOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field></div>
            <div className="lg:col-span-7"><Field label="后续措施"><textarea value={form.followUpActions} onChange={(event) => change("followUpActions", event.target.value)} rows={3} className="control w-full resize-y" placeholder="填写后续优化、跟踪或预防措施" /></Field></div>
            <div className="lg:col-span-12"><Field label="备注"><textarea value={form.notes} onChange={(event) => change("notes", event.target.value)} rows={2} className="control w-full resize-y" placeholder="其他补充信息" /></Field></div>
          </div>
        </FormSection>
        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-card/95 px-5 py-4 sm:px-6"><button onClick={() => setModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white">取消</button><button disabled={pending} onClick={submit} className="min-w-24 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{pending ? "保存中..." : "保存"}</button></div>
    </div></div>}
    <style jsx global>{`.control{width:100%;min-height:2.5rem;border:1px solid var(--border);border-radius:.5rem;background:var(--input);padding:.5rem .75rem;color:var(--foreground);font-size:.875rem;outline:none}.control option{background:var(--card);color:var(--foreground)}.control:focus{border-color:#6366f1;box-shadow:0 0 0 1px rgba(99,102,241,.2)}.control:disabled{cursor:not-allowed;opacity:.5}`}</style>
  </div>;
}
