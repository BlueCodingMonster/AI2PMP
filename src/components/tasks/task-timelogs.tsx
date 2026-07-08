"use client";

import { useState, useTransition } from "react";
import { addTimeLog } from "@/actions/timelogs";
import { Loader2, Plus, Clock, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TimeLogsProps {
  taskId: string;
  initialLogs: any[];
}

export default function TaskTimeLogs({ taskId, initialLogs }: TimeLogsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 展开/收起登记表单
  const [showForm, setShowForm] = useState(false);

  // 表单状态
  const [hours, setHours] = useState("");
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 计算总耗时
  const totalHours = initialLogs.reduce((sum, log) => sum + log.hours, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hrs = Number(hours);
    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      setError("登记工时必须在 0 到 24 之间");
      return;
    }

    startTransition(async () => {
      try {
        const res = await addTimeLog(taskId, hrs, logDate, description);
        if (res.success) {
          setHours("");
          setDescription("");
          setShowForm(false);
          router.refresh();
        } else {
          setError(res.error || "登账失败");
        }
      } catch (err) {
        console.error("登账错误:", err);
        setError("系统错误，请重试");
      }
    });
  };

  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-400" />
          工时登记 ({totalHours}h)
        </h3>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          {showForm ? "取消" : "登账登记"}
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-[10px] text-red-400">
          {error}
        </div>
      )}

      {/* 登记工时表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-[10px] sm:text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">工时(小时) *</label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="如: 4.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded border border-border bg-input py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-primary text-[10px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">登记日期 *</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded border border-border bg-input py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-primary text-[10px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground font-medium">工作事项描述</label>
            <input
              type="text"
              placeholder="例如: 编写 API 接口文档并联调"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-border bg-input py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-primary text-[10px]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-indigo-600/90 py-1.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 text-[10px]"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            确认登账
          </button>
        </form>
      )}

      {/* 工时日志列表 */}
      {initialLogs.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">
          此任务暂无任何工时记录。
        </p>
      ) : (
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {initialLogs.map((log) => (
            <div
              key={log.id}
              className="bg-black/10 rounded-lg p-2.5 border border-border/30 text-[10px] space-y-1.5"
            >
              <div className="flex items-center justify-between font-medium">
                <span className="text-white">{log.user.name}</span>
                <span className="text-indigo-400 font-bold">{log.hours} 小时</span>
              </div>
              <div className="flex items-start justify-between text-muted-foreground gap-2">
                <span className="truncate max-w-[120px]">{log.description || "未填写工作事项"}</span>
                <span className="shrink-0 flex items-center gap-0.5 opacity-80">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(log.logDate), "MM-dd", { locale: zhCN })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
