import { z } from "zod";
import { CustomerConfirmationStatus, OperationStatus, OperationType, OperationVersionType } from "@prisma/client";

const optionalText = z.string().trim().max(5000, "内容最多5000个字符").optional().nullable();
const optionalDateTime = z.string().trim().optional().nullable();

export const operationRecordSchema = z.object({
  ownershipVersionType: z.nativeEnum(OperationVersionType),
  ownershipVersionId: z.string().trim().min(1, "请选择归属版本"),
  type: z.nativeEnum(OperationType),
  eventDescription: z.string().trim().min(1, "请输入事件描述").max(20000, "事件描述最多20000个字符"),
  occurredAt: z.string().trim().min(1, "请选择发生时间"),
  reporter: z.string().trim().min(1, "请输入反馈人员").max(100, "反馈人员最多100个字符"),
  handlerIds: z.array(z.string().min(1)).min(1, "请至少选择一名处理人员"),
  status: z.nativeEnum(OperationStatus),
  operationContent: z.string().trim().min(1, "请输入运维内容").max(10000, "运维内容最多10000个字符"),
  processingStartedAt: optionalDateTime,
  processingCompletedAt: optionalDateTime,
  customerConfirmationStatus: z.nativeEnum(CustomerConfirmationStatus),
  fixVersionType: z.nativeEnum(OperationVersionType).optional().nullable(),
  fixVersionId: z.string().trim().optional().nullable(),
  followUpActions: optionalText,
  notes: optionalText,
}).superRefine((data, context) => {
  if (Boolean(data.fixVersionType) !== Boolean(data.fixVersionId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fixVersionId"], message: "请完整选择修复版本" });
  }
  const start = data.processingStartedAt ? new Date(data.processingStartedAt) : null;
  const completed = data.processingCompletedAt ? new Date(data.processingCompletedAt) : null;
  if (start && completed && completed < start) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["processingCompletedAt"], message: "完成处理时间不能早于开始处理时间" });
  }
  if (data.status === OperationStatus.COMPLETED && !completed) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["processingCompletedAt"], message: "已完成时必须填写完成处理时间" });
  }
  if (data.customerConfirmationStatus === CustomerConfirmationStatus.CONFIRMED && data.status !== OperationStatus.COMPLETED) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerConfirmationStatus"], message: "只有已完成的记录才能标记为客户已确认" });
  }
});

export type OperationRecordInput = z.infer<typeof operationRecordSchema>;
