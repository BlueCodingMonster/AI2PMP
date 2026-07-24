export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* 顶部标题骨架屏 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted/50 animate-pulse" />
      </div>

      {/* 统计指标卡片骨架屏 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse" />
            </div>
            <div className="h-8 w-28 rounded-md bg-muted/80 animate-pulse" />
            <div className="h-3 w-36 rounded bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>

      {/* 主体表格/列表骨架屏 */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="h-5 w-36 rounded bg-muted/70 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-muted/40 animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/30">
              <div className="h-4 w-1/4 rounded bg-muted/50 animate-pulse" />
              <div className="h-4 w-1/6 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-1/6 rounded bg-muted/40 animate-pulse" />
              <div className="h-6 w-16 rounded-full bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
