import { z } from "zod";
import { TaskStatus, Priority, TaskType } from "@prisma/client";

export const taskSchema = z.object({
  title: z.string().min(2, "任务标题至少2个字符").max(100, "任务标题最多100个字符").trim(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  type: z.nativeEnum(TaskType).default(TaskType.TASK),
  projectId: z.string({ required_error: "请选择所属项目" }),
  requirementId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).optional().nullable(),
  dueDate: z.string().or(z.date()).optional().nullable(),
  estimatedHours: z.number().min(0.5, "预估工时至少0.5小时").optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;
