import type { Metadata } from "next";
import { getUnplannedWorkItems } from "@/actions/plans";
import UnplannedWorkClient from "@/components/plans/unplanned-work-client";

export const metadata: Metadata = {
  title: "AI2PmP - 计划外工作池",
  description: "内部研发项目管理系统 - 计划外工作池",
};

export default async function UnplannedWorkPage() {
  const res = await getUnplannedWorkItems();
  return <UnplannedWorkClient items={res.data || []} />;
}
