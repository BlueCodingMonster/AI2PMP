"use server";

import { OperationVersionType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { operationRecordSchema, type OperationRecordInput } from "@/lib/validations/operations";

const include = {
  ownershipProductVersion: { include: { product: true } },
  ownershipProjectVersion: { include: { project: true } },
  fixProductVersion: { include: { product: true } },
  fixProjectVersion: { include: { project: true } },
  handlers: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.OperationRecordInclude;

function date(value?: string | null) {
  return value ? new Date(value) : null;
}

function sanitizeRichText(value: string) {
  return value
    .replace(/<\/?(?:script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

async function validateVersions(data: OperationRecordInput) {
  if (data.ownershipVersionType === OperationVersionType.PRODUCT) {
    const owner = await prisma.productVersion.findUnique({ where: { id: data.ownershipVersionId }, select: { productId: true } });
    if (!owner) return "归属产品版本不存在";
    if (data.fixVersionType === OperationVersionType.PRODUCT && data.fixVersionId) {
      const fixed = await prisma.productVersion.findUnique({ where: { id: data.fixVersionId }, select: { productId: true } });
      if (!fixed || fixed.productId !== owner.productId) return "修复版本必须属于同一产品";
    } else if (data.fixVersionId) return "修复版本必须与归属版本类型一致";
  } else {
    const owner = await prisma.projectVersion.findUnique({ where: { id: data.ownershipVersionId }, select: { projectId: true } });
    if (!owner) return "归属项目版本不存在";
    if (data.fixVersionType === OperationVersionType.PROJECT && data.fixVersionId) {
      const fixed = await prisma.projectVersion.findUnique({ where: { id: data.fixVersionId }, select: { projectId: true } });
      if (!fixed || fixed.projectId !== owner.projectId) return "修复版本必须属于同一项目";
    } else if (data.fixVersionId) return "修复版本必须与归属版本类型一致";
  }
  return null;
}

function toData(data: OperationRecordInput) {
  return {
    ownershipVersionType: data.ownershipVersionType,
    ownershipProductVersionId: data.ownershipVersionType === OperationVersionType.PRODUCT ? data.ownershipVersionId : null,
    ownershipProjectVersionId: data.ownershipVersionType === OperationVersionType.PROJECT ? data.ownershipVersionId : null,
    type: data.type,
    eventDescription: sanitizeRichText(data.eventDescription),
    occurredAt: new Date(data.occurredAt),
    reporter: data.reporter,
    status: data.status,
    operationContent: data.operationContent,
    processingStartedAt: date(data.processingStartedAt),
    processingCompletedAt: date(data.processingCompletedAt),
    customerConfirmationStatus: data.customerConfirmationStatus,
    fixVersionType: data.fixVersionType || null,
    fixProductVersionId: data.fixVersionType === OperationVersionType.PRODUCT ? data.fixVersionId || null : null,
    fixProjectVersionId: data.fixVersionType === OperationVersionType.PROJECT ? data.fixVersionId || null : null,
    followUpActions: data.followUpActions || null,
    notes: data.notes || null,
  };
}

export async function getOperationRecords() {
  try {
    return { success: true, data: await prisma.operationRecord.findMany({ include, orderBy: { occurredAt: "desc" } }) };
  } catch (error) {
    console.error("[getOperationRecords]", error);
    return { success: false, error: "获取运维记录失败", data: [] };
  }
}

export async function getOperationVersionOptions() {
  const [products, projects] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" }, include: { versions: { orderBy: { version: "desc" } } } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, include: { versions: { orderBy: { version: "desc" } } } }),
  ]);
  return {
    products: products.flatMap((product) => product.versions.map((version) => ({ id: version.id, ownerId: product.id, label: `${product.name} / ${version.version}`, version: version.version }))),
    projects: projects.flatMap((project) => project.versions.map((version) => ({ id: version.id, ownerId: project.id, label: `${project.name} / ${version.version}`, version: version.version }))),
  };
}

export async function createOperationRecord(input: OperationRecordInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = operationRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };
  const versionError = await validateVersions(parsed.data);
  if (versionError) return { success: false, error: versionError };
  try {
    await prisma.operationRecord.create({ data: { ...toData(parsed.data), createdById: session.user.id, handlers: { connect: parsed.data.handlerIds.map((id) => ({ id })) } } });
    revalidatePath("/operations");
    return { success: true };
  } catch (error) {
    console.error("[createOperationRecord]", error);
    return { success: false, error: "新增运维记录失败" };
  }
}

export async function updateOperationRecord(id: string, input: OperationRecordInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const parsed = operationRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "数据校验失败" };
  const versionError = await validateVersions(parsed.data);
  if (versionError) return { success: false, error: versionError };
  try {
    await prisma.operationRecord.update({ where: { id }, data: { ...toData(parsed.data), handlers: { set: parsed.data.handlerIds.map((userId) => ({ id: userId })) } } });
    revalidatePath("/operations");
    return { success: true };
  } catch (error) {
    console.error("[updateOperationRecord]", error);
    return { success: false, error: "更新运维记录失败" };
  }
}

export async function deleteOperationRecord(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  try {
    await prisma.operationRecord.delete({ where: { id } });
    revalidatePath("/operations");
    return { success: true };
  } catch (error) {
    console.error("[deleteOperationRecord]", error);
    return { success: false, error: "删除运维记录失败" };
  }
}
