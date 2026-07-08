"use client";

import Link from "next/link";
import { PlanStatus, PlanType } from "@prisma/client";
import { planStatusLabels } from "@/lib/plans/workflow-templates";
import { BarChart3 } from "lucide-react";

const typeLabels: Record<PlanType, string> = {
  ANNUAL: "年度计划",
  HALF_YEAR: "半年计划",
  QUARTERLY: "季度计划",
  MONTHLY: "月度计划",
};

type OverviewRow = {
  id: string;
  title: string;
  type: PlanType;
  status: PlanStatus;
  year: number;
  quarter?: number | null;
  month?: number | null;
  productLineTeam: { id: string; name: string };
  progress: number;
  plannedCount: number;
  unplannedCount: number;
  platformRndCount: number;
  localDeliveryCount: number;
  specialTaskCount: number;
};

export default function PlanOverviewClient({ rows }: { rows: OverviewRow[] }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">计划整体视图</h1>
          <p className="mt-1 text-sm text-muted-foreground">按产品线小组汇总年度、季度、月度计划与执行构成。</p>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl border border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">产品线小组</th>
                <th className="px-4 py-3">计划</th>
                <th className="px-4 py-3">周期</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">进度</th>
                <th className="px-4 py-3 text-right">计划内</th>
                <th className="px-4 py-3 text-right">计划外</th>
                <th className="px-4 py-3 text-right">平台研发</th>
                <th className="px-4 py-3 text-right">项目交付</th>
                <th className="px-4 py-3 text-right">专项任务</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-white">{row.productLineTeam.name}</td>
                  <td className="px-4 py-3">
                    <Link href={`/plans/${row.id}`} className="font-medium text-indigo-300 hover:text-indigo-200">
                      {row.title}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">{typeLabels[row.type]}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{periodLabel(row)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{planStatusLabels[row.status]}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{row.progress}%</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.plannedCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.unplannedCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.platformRndCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.localDeliveryCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.specialTaskCount}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    暂无计划数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function periodLabel(row: OverviewRow) {
  if (row.type === PlanType.ANNUAL) return `${row.year}年`;
  if (row.type === PlanType.QUARTERLY) return `${row.year}年 Q${row.quarter}`;
  if (row.type === PlanType.MONTHLY) return `${row.year}年 ${row.month}月`;
  return `${row.year}年 H1/H2`;
}
