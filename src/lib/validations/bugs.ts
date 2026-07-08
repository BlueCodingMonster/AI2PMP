import { z } from "zod";
import { BugStatus, BugSeverity, Priority } from "@prisma/client";

export const bugSchema = z.object({
  title: z.string().min(2, "缺陷标题至少2个字符").max(100, "缺陷标题最多100个字符").trim(),
  description: z.string().optional(),
  status: z.nativeEnum(BugStatus).default(BugStatus.OPEN),
  severity: z.nativeEnum(BugSeverity).default(BugSeverity.MAJOR),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  projectId: z.string({ required_error: "请选择所属项目" }),
  assigneeId: z.string().optional().nullable(),
  environment: z.string().optional(),
  stepsToReproduce: z.string().optional(),
});

export type BugInput = z.infer<typeof bugSchema>;
