"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Save,
  Clock,
} from "lucide-react";
import { saveWorkCalendar } from "@/actions/managed-tasks";

type IdName = { id: string; name: string };
type CalendarItem = {
  id: string;
  year: number;
  status: string;
  standardHours: number;
  workWindows: string | null;
  days: Array<{
    date: string;
    type: string;
    standardHours: number | null;
    workWindows: string | null;
    label: string | null;
    notes: string | null;
  }>;
};

type Context = {
  users: (IdName & { position?: string | null })[];
  teams: Array<IdName & { members: Array<{ userId: string; role: string }> }>;
};

const dayTypeLabels: Record<string, string> = {
  REGULAR_WORKDAY: "普通工作日",
  REGULAR_WEEKEND: "普通周末",
  LEGAL_HOLIDAY: "法定节假日",
  ADJUSTED_WORKDAY: "调休工作日",
  SPECIAL_REST_DAY: "特殊休息日",
  SPECIAL_WORKDAY: "特殊工作日",
};
const dayTypes = Object.keys(dayTypeLabels);

const initialCalendar = {
  year: new Date().getFullYear(),
  status: "DRAFT",
  standardHours: 8,
  workWindows: `[
  {
    "name": "冬季作息 (10.01 - 04.30)",
    "startMMDD": "10-01",
    "endMMDD": "04-30",
    "windows": [
      { "start": "08:00", "end": "12:00" },
      { "start": "13:00", "end": "17:00" }
    ]
  },
  {
    "name": "夏季作息 (05.01 - 09.30)",
    "startMMDD": "05-01",
    "endMMDD": "09-30",
    "windows": [
      { "start": "08:00", "end": "12:00" },
      { "start": "13:30", "end": "17:30" }
    ]
  }
]`,
  days: [] as Array<{
    date: string;
    type: string;
    standardHours: number | "";
    workWindows: string;
    label: string;
    notes: string;
  }>,
};

const controlClass =
  "min-h-10 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500 w-full";

export default function WorkCalendarManager({
  calendars: initialCalendars,
  context,
}: {
  calendars: CalendarItem[];
  context: Context;
}) {
  const [calendars, setCalendars] = useState<CalendarItem[]>(initialCalendars);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [form, setForm] = useState(initialCalendar);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSelectCalendar = (calendar: CalendarItem) => {
    setSelectedCalendarId(calendar.id);
    setForm({
      year: calendar.year,
      status: calendar.status,
      standardHours: calendar.standardHours,
      workWindows: calendar.workWindows || "",
      days: calendar.days.map((day) => ({
        date: day.date.slice(0, 10),
        type: day.type,
        standardHours: day.standardHours ?? "",
        workWindows: day.workWindows || "",
        label: day.label || "",
        notes: day.notes || "",
      })),
    });
    setError("");
    setSuccess("");
  };

  const handleNewCalendar = () => {
    setSelectedCalendarId(null);
    setForm(initialCalendar);
    setError("");
    setSuccess("");
  };

  const submitCalendar = () => {
    startTransition(async () => {
      setError("");
      setSuccess("");
      // Validate year
      if (!form.year || form.year < 2020 || form.year > 2100) {
        setError("年份必须在 2020 到 2100 之间");
        return;
      }

      // Validate JSON formatting
      if (form.workWindows) {
        try {
          JSON.parse(form.workWindows);
        } catch (e) {
          setError("标准工作窗口配置 JSON 格式不合法，请检查标点或括号");
          return;
        }
      }

      for (const day of form.days) {
        if (day.workWindows) {
          try {
            JSON.parse(day.workWindows);
          } catch (e) {
            setError(`日期 ${day.date} 的工作窗口 JSON 格式不合法`);
            return;
          }
        }
      }
      
      const payload = {
        ...form,
        productLineTeamId: null,
        days: form.days.map((day) => ({
          date: day.date,
          type: day.type,
          standardHours: day.standardHours === "" ? null : Number(day.standardHours),
          workWindows: day.workWindows || null,
          label: day.label || null,
          notes: day.notes || null,
        })),
      };

      const result = await saveWorkCalendar(payload as never);
      if (!result.success) {
        setError(result.error || "保存日历失败");
        return;
      }

      setSuccess("工作日历保存成功！");
      
      const saved = result.data as {
        id: string;
        year: number;
        status: string;
        standardHours: number;
        workWindows: string | null;
      };
      const updatedItem: CalendarItem = {
        id: saved.id,
        year: saved.year,
        status: saved.status,
        standardHours: saved.standardHours,
        workWindows: saved.workWindows,
        days: form.days.map((day) => ({
          date: day.date,
          type: day.type,
          standardHours: day.standardHours === "" ? null : Number(day.standardHours),
          workWindows: day.workWindows || null,
          label: day.label || null,
          notes: day.notes || null,
        })),
      };

      setCalendars((current) => {
        const index = current.findIndex((c) => c.id === updatedItem.id);
        if (index > -1) {
          const next = [...current];
          next[index] = updatedItem;
          return next;
        }
        return [updatedItem, ...current];
      });
      setSelectedCalendarId(updatedItem.id);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 左侧已维护日历列表 */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">已维护日历列表</h2>
          <button
            onClick={handleNewCalendar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            新建日历
          </button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {calendars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              暂无已维护的工作日历
            </div>
          ) : (
            calendars.map((calendar) => {
              const active = selectedCalendarId === calendar.id;
              return (
                <div
                  key={calendar.id}
                  onClick={() => handleSelectCalendar(calendar)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                    active
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                      : "border-border bg-card hover:border-muted hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {calendar.year} 年
                        </span>
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            calendar.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          }`}
                        >
                          {calendar.status === "PUBLISHED" ? "已发布" : "草稿"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                        <span>全局工作日历</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      标准工时: {calendar.standardHours}小时/天
                    </span>
                    <span>
                      例外日期: {calendar.days.length} 天
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧日历配置表单 */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-semibold text-white">
              {selectedCalendarId ? `编辑日历 - ${form.year} 年` : "新建工作日历"}
            </h3>
          </div>

          <div className="p-5 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1.5 text-xs text-muted-foreground">
                日历年份
                <input
                  type="number"
                  value={form.year}
                  disabled={!!selectedCalendarId}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, year: Number(e.target.value) }))
                  }
                  className={controlClass}
                  placeholder="请输入年份，如 2026"
                />
              </label>

              <label className="space-y-1.5 text-xs text-muted-foreground">
                发布状态
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, status: e.target.value }))
                  }
                  className={controlClass}
                >
                  <option value="DRAFT">草稿 (暂不应用)</option>
                  <option value="PUBLISHED">已发布 (立即生效)</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-muted-foreground">
                每日标准工作时长 (小时)
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={form.standardHours}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      standardHours: Number(e.target.value),
                    }))
                  }
                  className={controlClass}
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-xs text-muted-foreground">
              年度默认工作时段与时令规则配置 (JSON 格式)
              <textarea
                value={form.workWindows}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    workWindows: e.target.value,
                  }))
                }
                rows={8}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-indigo-500"
                placeholder="请输入 JSON 作息配置"
              />
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                支持配置静态数组窗口或多时令范围窗口。例如：五一前后作息调整，或常规作息规则。格式必须为 valid JSON。
              </span>
            </label>

            {/* 例外日期管理 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <span className="text-xs font-semibold text-muted-foreground">
                  例外日期设置 (节假日、调休与作息覆写安排)
                </span>
                <button
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      days: [
                        ...current.days,
                        {
                          date: "",
                          type: "LEGAL_HOLIDAY",
                          standardHours: "",
                          workWindows: "",
                          label: "",
                          notes: "",
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-white transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加例外日期
                </button>
              </div>

              <div className="max-h-[350px] space-y-4 overflow-y-auto pr-1">
                {form.days.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-input/20 p-8 text-center text-xs text-muted-foreground">
                    未添加例外日期。系统将自动默认按国家常规双休日（周六日休息，周一至五工作）计算。
                  </div>
                ) : (
                  form.days.map((day, index) => (
                    <div
                      key={index}
                      className="space-y-3 bg-input/10 p-4 rounded-xl border border-border/45"
                    >
                      <div className="grid grid-cols-[1.5fr_1.5fr_1fr_36px] gap-2 items-center">
                        <input
                          type="date"
                          value={day.date}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              days: current.days.map((item, i) =>
                                i === index ? { ...item, date: e.target.value } : item
                              ),
                            }))
                          }
                          className={controlClass}
                          required
                        />
                        <select
                          value={day.type}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              days: current.days.map((item, i) =>
                                i === index ? { ...item, type: e.target.value } : item
                              ),
                            }))
                          }
                          className={controlClass}
                        >
                          {dayTypes.map((type) => (
                            <option key={type} value={type}>
                              {dayTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="工时"
                          value={day.standardHours}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              days: current.days.map((item, i) =>
                                i === index ? { ...item, standardHours: e.target.value === "" ? "" : Number(e.target.value) } : item
                              ),
                            }))
                          }
                          className={controlClass}
                        />
                        <button
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              days: current.days.filter((_, i) => i !== index),
                            }))
                          }
                          className="flex h-10 w-9 items-center justify-center rounded-lg border border-border text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                          title="删除此例外"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="space-y-1.5 block text-[10px] text-muted-foreground">
                          工作时段覆写 (JSON，可选)
                          <input
                            type="text"
                            placeholder='如：[{"start":"08:00","end":"12:00"}]'
                            value={day.workWindows || ""}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                days: current.days.map((item, i) =>
                                  i === index ? { ...item, workWindows: e.target.value } : item
                                ),
                              }))
                            }
                            className={`${controlClass} !min-h-8 text-xs font-mono`}
                          />
                        </label>
                        <label className="space-y-1.5 block text-[10px] text-muted-foreground">
                          例外标签 / 备注说明
                          <input
                            type="text"
                            placeholder="如：五一调休 / 节假日"
                            value={day.label || day.notes || ""}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                days: current.days.map((item, i) =>
                                  i === index ? { ...item, label: e.target.value, notes: e.target.value } : item
                                ),
                              }))
                            }
                            className={`${controlClass} !min-h-8 text-xs`}
                          />
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
              {selectedCalendarId && (
                <button
                  onClick={handleNewCalendar}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  放弃编辑
                </button>
              )}
              <button
                onClick={submitCalendar}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-md"
              >
                <Save className="h-4 w-4" />
                {pending ? "保存中..." : "保存日历"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
