import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { PlanItemStatus, PlanStatus, PlanType, ProductLineRole } from "@prisma/client";

const teamName = "数字化建设组";
const leaderName = "陈鹏飞";
const planTitle = "数字化建设组 2026年三季度里程碑计划";

const items = [
  {
    domain: "市场支持",
    title: "市场支持 - 数字化管理系统资料与解决方案文档",
    quarterGoal:
      "1、编写数字化管理系统核心业务功能模块介绍文档；\n2、乌海市数字化转型入库产品资料编写；\n3、配合市场小组工作，解决方案等文档的编写与整理。",
    success: "输出相关文档",
    m1: "",
    m2: "",
    m3: "",
  },
  {
    domain: "产品迭代",
    title: "产品迭代 - 数字化管理系统 v1.6.8",
    quarterGoal: "数字化管理系统 v1.6.8",
    success: "数字化管理系统工作台整体样式优化",
    m1: "数字化管理系统 v1.6.8 完成上线",
    m2: "",
    m3: "",
  },
  {
    domain: "AI赋能",
    title: "AI赋能 - 日志管理 v1.3.4",
    quarterGoal: "数字化管理系统-应用建设：日志管理（v1.3.4）",
    success:
      "1、日志内容AI摘要；\n2、周报、月报AI自动总结功能，输出风格个性化选择；\n3、日志增加已读未读标记。",
    m1: "数字化管理系统-应用建设：日志管理（v1.3.4）完成上线",
    m2: "",
    m3: "",
  },
  {
    domain: "产品迭代",
    title: "产品迭代 - 消息业务助手 1.6.9",
    quarterGoal: "数字化管理系统-消息（业务助手）（1.6.9）",
    success: "1、消息增加业务助手，可接收审批类消息通知；\n2、大陆通APP离线推送新增其他消息类型。",
    m1: "",
    m2: "数字化管理系统-消息业务助手（1.6.9）完成上线",
    m3: "",
  },
  {
    domain: "产品迭代",
    title: "产品迭代 - 考勤管理 v1.2.0",
    quarterGoal: "数字化管理系统-应用建设：考勤管理（v1.2.0）",
    success:
      "1、使用期间客户提出的问题以及需求；\n2、新用户无法调整班次的问题；\n3、新用户无法分配假期的问题；\n4、其它使用中的问题优化。",
    m1: "",
    m2: "",
    m3: "数字化管理系统-应用建设：考勤管理（v1.2.0）完成上线",
  },
  {
    domain: "运维稳定",
    title: "运维稳定 - 数字化管理系统稳定运行",
    quarterGoal: "数字化管理系统稳定运行",
    success: "系统稳定性≥98%，及时响应已知问题",
    m1: "",
    m2: "",
    m3: "",
  },
];

function buildDescription(item: (typeof items)[number]) {
  return [
    `目标域：${item.domain}`,
    `季度目标：\n${item.quarterGoal}`,
    `成功标准：\n${item.success}`,
    item.m1 ? `M1目标：\n${item.m1}` : "",
    item.m2 ? `M2目标：\n${item.m2}` : "",
    item.m3 ? `M3目标：\n${item.m3}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.productLineTeam.findFirst({ where: { name: teamName } });
    if (!team) {
      throw new Error(`未找到产品线：${teamName}`);
    }

    const leader = await tx.user.findFirst({
      where: { name: leaderName },
      select: { id: true, name: true },
    });
    if (!leader) {
      throw new Error(`未找到组长用户：${leaderName}`);
    }

    await tx.productLineMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: leader.id } },
      update: { role: ProductLineRole.LEADER },
      create: { teamId: team.id, userId: leader.id, role: ProductLineRole.LEADER },
    });

    const existing = await tx.plan.findFirst({
      where: {
        title: planTitle,
        productLineTeamId: team.id,
        year: 2026,
        quarter: 3,
        type: PlanType.QUARTERLY,
      },
      select: { id: true },
    });

    const planData = {
      description:
        "来源：A季度产品目标看板。原表头写 Q2(2026年7-9月)，按用户说明及月份范围录入为 2026 年三季度。产品线组：数字化建设组；组长：陈鹏飞；版本：V1.0。",
      status: PlanStatus.IN_PROGRESS,
      year: 2026,
      quarter: 3,
      month: null,
      halfYear: null,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
      goals: "围绕市场支持、产品迭代、AI赋能和运维稳定，完成数字化管理系统三季度里程碑交付。",
      productLineTeamId: team.id,
    };

    const plan = existing
      ? await tx.plan.update({
          where: { id: existing.id },
          data: planData,
        })
      : await tx.plan.create({
          data: {
            title: planTitle,
            type: PlanType.QUARTERLY,
            createdById: leader.id,
            ...planData,
          },
        });

    await tx.planItem.deleteMany({ where: { planId: plan.id } });
    await tx.planItem.createMany({
      data: items.map((item, index) => ({
        planId: plan.id,
        title: item.title,
        description: buildDescription(item),
        assigneeId: leader.id,
        status: PlanItemStatus.TODO,
        progress: 0,
        sortOrder: index + 1,
      })),
    });

    return { planId: plan.id, teamId: team.id, leaderId: leader.id, itemCount: items.length };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
