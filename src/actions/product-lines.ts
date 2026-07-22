"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  productLineTeamSchema,
  memberSecondmentSchema,
  productSchema,
  productVersionSchema,
  productVersionStatusSchema,
  ProductLineTeamInput,
  MemberSecondmentInput,
  ProductInput,
  ProductVersionInput,
} from "@/lib/validations/product-lines";
import { ProductLineRole, SecondmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * 获取所有产品线小组（含固定成员和当前借入人数）
 */
export async function getProductLineTeams() {
  try {
    const teams = await prisma.productLineTeam.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true } },
          },
        },
        projects: {
          select: { id: true, name: true, key: true },
        },
        products: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        secondmentsTo: {
          where: { status: SecondmentStatus.ACTIVE },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    return { success: true, data: teams };
  } catch (error) {
    console.error("[getProductLineTeams] 获取产品线小组列表失败:", error);
    return { success: false, error: "获取产品线小组列表失败", data: [] };
  }
}

/**
 * 获取单个产品线小组的详情（包含固定班底、借入/借出成员、关联项目）
 */
export async function getProductLineTeamById(teamId: string) {
  try {
    const team = await prisma.productLineTeam.findUnique({
      where: { id: teamId },
      include: {
        members: {
          orderBy: { role: "asc" },
          include: {
            user: { select: { id: true, name: true, username: true, email: true, department: true } },
          },
        },
        projects: {
          select: { id: true, name: true, key: true, status: true },
        },
        products: {
          select: { id: true, name: true, description: true },
          orderBy: { name: "asc" },
        },
        // 临时借入的成员 (toTeamId === teamId)
        secondmentsTo: {
          where: { status: SecondmentStatus.ACTIVE },
          include: {
            user: { select: { id: true, name: true, username: true, email: true } },
            fromTeam: { select: { id: true, name: true } },
          },
        },
        // 借出到其他小组的固定成员 (fromTeamId === teamId)
        secondmentsFrom: {
          where: { status: SecondmentStatus.ACTIVE },
          include: {
            user: { select: { id: true, name: true, username: true, email: true } },
            toTeam: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!team) {
      return { success: false, error: "产品线小组不存在" };
    }

    return { success: true, data: team };
  } catch (error) {
    console.error("[getProductLineTeamById] 获取小组详情失败:", error);
    return { success: false, error: "获取小组详情失败" };
  }
}

/**
 * 创建产品线小组
 */
export async function createProductLineTeam(input: ProductLineTeamInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = productLineTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  try {
    const team = await prisma.productLineTeam.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });

    revalidatePath("/product-lines");
    return { success: true, data: team };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "该产品线小组名称已存在" };
    }
    console.error("[createProductLineTeam] 创建小组失败:", error);
    return { success: false, error: "创建小组失败" };
  }
}

/**
 * 更新产品线小组信息
 */
export async function updateProductLineTeam(teamId: string, input: ProductLineTeamInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = productLineTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  try {
    const team = await prisma.productLineTeam.update({
      where: { id: teamId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });

    revalidatePath("/product-lines");
    revalidatePath(`/product-lines/${teamId}`);
    return { success: true, data: team };
  } catch (error) {
    console.error("[updateProductLineTeam] 更新小组失败:", error);
    return { success: false, error: "更新小组失败" };
  }
}

/**
 * 删除产品线小组
 */
export async function deleteProductLineTeam(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.productLineTeam.delete({
      where: { id: teamId },
    });

    revalidatePath("/product-lines");
    return { success: true };
  } catch (error) {
    console.error("[deleteProductLineTeam] 删除小组失败:", error);
    return { success: false, error: "删除小组失败" };
  }
}

/**
 * 分配/新增固定小组成员
 */
export async function assignTeamMember(teamId: string, userId: string, role: ProductLineRole) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const member = await prisma.productLineMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      update: { role },
      create: {
        teamId,
        userId,
        role,
      },
    });

    revalidatePath(`/product-lines/${teamId}`);
    return { success: true, data: member };
  } catch (error) {
    console.error("[assignTeamMember] 分配小组成员失败:", error);
    return { success: false, error: "分配小组成员失败" };
  }
}

/**
 * 移除固定小组成员
 */
export async function removeTeamMember(teamId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.productLineMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    revalidatePath(`/product-lines/${teamId}`);
    return { success: true };
  } catch (error) {
    console.error("[removeTeamMember] 移除小组成员失败:", error);
    return { success: false, error: "移除小组成员失败" };
  }
}

/**
 * 登记人员临时借调
 */
export async function createSecondment(input: MemberSecondmentInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = memberSecondmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  const data = parsed.data;

  // 不能借调给自己借入的小组
  if (data.fromTeamId === data.toTeamId) {
    return { success: false, error: "原小组与目标借调小组不能相同" };
  }

  try {
    // 检查此人当前是否已有活跃的借调记录
    const activeSec = await prisma.memberSecondment.findFirst({
      where: {
        userId: data.userId,
        status: SecondmentStatus.ACTIVE,
      },
    });

    if (activeSec) {
      return { success: false, error: "该成员当前正在其他小组借调中，请先结束之前的借调" };
    }

    const secondment = await prisma.memberSecondment.create({
      data: {
        userId: data.userId,
        fromTeamId: data.fromTeamId ?? null,
        toTeamId: data.toTeamId,
        role: data.role,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: SecondmentStatus.ACTIVE,
        createdAt: new Date(),
      },
    });

    revalidatePath(`/product-lines/${data.toTeamId}`);

    revalidatePath(`/product-lines/${data.toTeamId}`);
    if (data.fromTeamId) {
      revalidatePath(`/product-lines/${data.fromTeamId}`);
    }
    return { success: true, data: secondment };
  } catch (error) {
    console.error("[createSecondment] 登记人员借调失败:", error);
    return { success: false, error: "登记人员借调失败" };
  }
}

/**
 * 结束借调 / 归还人员
 */
export async function completeSecondment(secondmentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    const sec = await prisma.memberSecondment.findUnique({
      where: { id: secondmentId },
    });

    if (!sec) {
      return { success: false, error: "借调记录不存在" };
    }

    await prisma.memberSecondment.update({
      where: { id: secondmentId },
      data: {
        status: SecondmentStatus.COMPLETED,
        endDate: new Date(), // 更新结束日期为当前时间
      },
    });



    revalidatePath(`/product-lines/${sec.toTeamId}`);
    if (sec.fromTeamId) {
      revalidatePath(`/product-lines/${sec.fromTeamId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("[completeSecondment] 结束借调失败:", error);
    return { success: false, error: "结束借调失败" };
  }
}

/**
 * 获取可作为产品线小组候选固定成员的用户列表
 */
export async function getEligibleUsersForTeam(teamId: string) {
  try {
    // 找出目前已经是该小组固定成员的用户 ID
    const members = await prisma.productLineMember.findMany({
      where: { teamId },
      select: { userId: true },
    });
    const memberUserIds = members.map((m) => m.userId);

    // 获取所有启用状态的用户，且排除已经是固定成员的人
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { notIn: memberUserIds },
      },
      select: { id: true, name: true, username: true, email: true, department: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("[getEligibleUsersForTeam] 获取候选成员失败:", error);
    return { success: false, error: "获取候选成员失败", data: [] };
  }
}

/**
 * 关联项目到产品线小组
 */
export async function linkProjectToTeam(projectId: string, teamId: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { productLineTeamId: teamId },
    });

    revalidatePath("/projects");
    if (teamId) {
      revalidatePath(`/product-lines/${teamId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("[linkProjectToTeam] 绑定项目到小组失败:", error);
    return { success: false, error: "绑定项目到小组失败" };
  }
}

/** 批量关联多个项目到当前小组。 */
export async function linkProjectsToTeam(projectIds: string[], teamId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const ids = [...new Set(projectIds.filter(Boolean))];
  if (ids.length === 0) return { success: false, error: "请至少选择一个项目" };

  try {
    await prisma.project.updateMany({ where: { id: { in: ids } }, data: { productLineTeamId: teamId } });
    revalidatePath("/projects");
    revalidatePath(`/product-lines/${teamId}`);
    return { success: true };
  } catch (error) {
    console.error("[linkProjectsToTeam] 批量绑定项目到小组失败:", error);
    return { success: false, error: "批量关联项目失败" };
  }
}

/**
 * 关联或解绑产品线小组与全局产品。
 */
export async function setProductTeamLink(teamId: string, productId: string, linked: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    await prisma.productLineTeam.update({
      where: { id: teamId },
      data: { products: linked ? { connect: { id: productId } } : { disconnect: { id: productId } } },
    });
    revalidatePath(`/product-lines/${teamId}`);
    revalidatePath("/product-lines");
    return { success: true };
  } catch (error) {
    console.error("[setProductTeamLink] 维护小组产品线关联失败:", error);
    return { success: false, error: linked ? "关联产品线失败" : "取消产品线关联失败" };
  }
}

/** 批量关联多个产品线到当前小组。 */
export async function linkProductsToTeam(teamId: string, productIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return { success: false, error: "请至少选择一个产品线" };

  try {
    await prisma.productLineTeam.update({
      where: { id: teamId },
      data: { products: { connect: ids.map((id) => ({ id })) } },
    });
    revalidatePath(`/product-lines/${teamId}`);
    revalidatePath("/product-lines");
    return { success: true };
  } catch (error) {
    console.error("[linkProductsToTeam] 批量关联产品线失败:", error);
    return { success: false, error: "批量关联产品线失败" };
  }
}

// 格式化辅助
function formatDate(date: string | Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 获取全局产品及其版本。
 */
export async function getProductTree() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        versions: {
          orderBy: [{ releaseDate: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("[getProductTree] 获取产品版本树失败:", error);
    return { success: false, error: "获取产品版本树失败", data: [] };
  }
}

/**
 * 新增产品。
 */
export async function createProduct(input: ProductInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });

    revalidatePath("/product-catalog");
    return { success: true, data: product };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "该产品已存在" };
    }
    console.error("[createProduct] 新增产品失败:", error);
    return { success: false, error: "新增产品失败" };
  }
}

/**
 * 编辑产品。
 */
export async function updateProduct(productId: string, input: ProductInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { name: parsed.data.name, description: parsed.data.description ?? null },
    });
    revalidatePath("/product-catalog");
    return { success: true, data: product };
  } catch (error) {
    if (isUniqueConstraintError(error)) return { success: false, error: "该产品已存在" };
    console.error("[updateProduct] 编辑产品/项目失败:", error);
    return { success: false, error: "编辑产品/项目失败" };
  }
}

/**
 * 删除产品及其版本。
 */
export async function deleteProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    await prisma.product.delete({ where: { id: productId } });
    revalidatePath("/product-catalog");
    revalidatePath("/plans");
    return { success: true };
  } catch (error) {
    console.error("[deleteProduct] 删除产品/项目失败:", error);
    return { success: false, error: "删除产品/项目失败" };
  }
}

/**
 * 新增产品版本。
 */
export async function createProductVersion(input: ProductVersionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = productVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true },
    });

    if (!product) {
      return { success: false, error: "产品不存在" };
    }

    const version = await prisma.productVersion.create({
      data: {
        productId: parsed.data.productId,
        title: parsed.data.version,
        version: parsed.data.version,
      },
    });

    revalidatePath("/product-catalog");
    revalidatePath("/plans");
    return { success: true, data: version };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "该产品下版本号已存在" };
    }
    console.error("[createProductVersion] 新增产品版本失败:", error);
    return { success: false, error: "新增产品版本失败" };
  }
}

/**
 * 编辑版本号。
 */
export async function updateProductVersion(versionId: string, input: { version: unknown }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  const parsed = productVersionSchema.pick({ version: true }).safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };

  try {
    const version = await prisma.productVersion.update({
      where: { id: versionId },
      data: { version: parsed.data.version, title: parsed.data.version },
    });
    revalidatePath("/product-catalog");
    revalidatePath("/plans");
    return { success: true, data: version };
  } catch (error) {
    if (isUniqueConstraintError(error)) return { success: false, error: "该产品下版本号已存在" };
    console.error("[updateProductVersion] 编辑版本失败:", error);
    return { success: false, error: "编辑版本失败" };
  }
}

/**
 * 删除版本。
 */
export async function deleteProductVersion(versionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "未登录，无权操作" };

  try {
    await prisma.productVersion.delete({ where: { id: versionId } });
    revalidatePath("/product-catalog");
    revalidatePath("/plans");
    return { success: true };
  } catch (error) {
    console.error("[deleteProductVersion] 删除版本失败:", error);
    return { success: false, error: "删除版本失败" };
  }
}

/**
 * 更新产品版本状态。
 */
export async function updateProductVersionStatus(versionId: string, input: { status: unknown }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "未登录，无权操作" };
  }

  const parsed = productVersionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "数据校验失败" };
  }

  try {
    const version = await prisma.productVersion.update({
      where: { id: versionId },
      data: { status: parsed.data.status },
      select: { id: true },
    });

    revalidatePath("/product-catalog");
    revalidatePath("/plans");
    return { success: true, data: version };
  } catch (error) {
    console.error("[updateProductVersionStatus] 更新产品版本状态失败:", error);
    return { success: false, error: "更新产品版本状态失败" };
  }
}
