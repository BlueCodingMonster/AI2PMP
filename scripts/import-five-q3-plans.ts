import "dotenv/config";
import bcrypt from "bcryptjs";
import { PlanItemStatus, PlanStatus, PlanType, ProductLineRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type MilestoneItem = {
  domain: string;
  title: string;
  quarterGoal: string;
  success: string;
  m1?: string;
  m1Status?: string;
  m2?: string;
  m2Status?: string;
  m3?: string;
  m3Status?: string;
};

type GroupPlan = {
  teamName: string;
  leaderName: string;
  leaderUsername: string;
  title: string;
  goals: string;
  items: MilestoneItem[];
};

const plans: GroupPlan[] = [
  {
    teamName: "能源管理建设组",
    leaderName: "元新明",
    leaderUsername: "yuanxinming",
    title: "能源管理建设组 2026年三季度里程碑计划",
    goals: "围绕能源管控中心、能源智慧运维、能碳管理中心建设、运维稳定和市场支持推进三季度里程碑。",
    items: [
      {
        domain: "产品升级",
        title: "产品升级 - 能源管控中心",
        quarterGoal: "能源管控中心",
        success:
          "1. 太阳纸业能源管控中心V1.4.6（增加加分厂外网进电量监控数据大屏）\n2. 能源管控中心V1.8.7版本上线（移动端优化账号登录持续时长优化、通知消息优化等）",
        m1: "完成太阳纸业能源管控中心V1.4.6研发、测试、上线",
        m2: "能源管控中心V1.8.7版本需求沟通、产品设计",
        m3: "能源管控中心V1.8.7版本研发测试上线",
      },
      {
        domain: "产品升级",
        title: "产品升级 - 能源智慧运维",
        quarterGoal: "能源智慧运维",
        success:
          "完成能源智慧运维V1.3.4版本上线（常见问题库、工单分配到人员、统计数据优化、故障确认自动生成工单）",
        m2: "完成能源智慧运维V1.3.4产品设计工作",
        m3: "完成能源智慧运维V1.3.4研发、测试、上线",
      },
      {
        domain: "新的模块",
        title: "新的模块 - 能碳管理中心建设",
        quarterGoal: "能碳管理中心建设",
        success: "1. 完成碳排放核算模块工作，上线数字化管理系统应用\n2. 能碳管理中心专项服务设计",
        m1: "完成碳排放核算模块版本开发、测试工作",
        m2: "1. 上线数字管理系统应用；\n2. 专项服务适配。",
        m3: "专项服务上线",
      },
      {
        domain: "运维稳定",
        title: "运维稳定 - 能源管理中心运维",
        quarterGoal: "能源管理中心运维：太阳纸业、山东省计量院、东营科技学院等能源管控中心运维",
        success: "保持系统可用，问题快速响应解决",
        m1: "解决客户反馈的问题",
        m2: "解决客户反馈的问题",
        m3: "解决客户反馈的问题",
      },
      {
        domain: "运维稳定",
        title: "运维稳定 - 计量运维",
        quarterGoal: "计量运维：平度计量所、太阳纸业、梅兰德水厂",
        success: "保持系统可用，问题快速响应解决",
        m1: "解决客户反馈的问题",
        m2: "解决客户反馈的问题",
        m3: "解决客户反馈的问题",
      },
      {
        domain: "市场支持",
        title: "市场支持 - 数字化转型与课题申报支撑",
        quarterGoal: "乌海市数字化转型技术支撑、恒星科技学院绿色低碳校园建设技术支撑、山东省计量院课题联合申报",
        success: "配合市场完成销售工作",
        m1: "输出解决方案",
        m2: "配合市场完成方案改进",
        m3: "配合市场完成方案改进",
      },
    ],
  },
  {
    teamName: "制造产品组",
    leaderName: "黄其萌",
    leaderUsername: "huangqimeng",
    title: "制造产品组 2026年三季度里程碑计划",
    goals: "围绕售后管理、产品交付、产品调研、运维稳定、市场支持、技术创新和AI赋能推进三季度工作。",
    items: [
      {
        domain: "产品迭代",
        title: "产品迭代 - 售后管理模块与一物一码功能优化",
        quarterGoal: "1、售后管理模块V2.0.0\n3、先进产品功能优化需求V2.0.1（结合交付情况）",
        success:
          "1、完成售后管理模块的功能开发、测试，完成扫码页面与一码通的对接\n2、根据实际交付情况完成先进后续优化的功能\n3、根据对标方案讨论落地具体应用模块",
        m1: "1、售后管理模块V2.0.0\n2、先进产品功能优化需求V2.0.1（结合交付情况）",
        m1Status: "售后管理V2.0.0完成需求宣讲、研发工作",
        m2: "根据对标方案编写讨论情况落地应用模块",
        m2Status: "/",
        m3: "根据对标方案编写讨论情况落地应用模块",
        m3Status: "/",
      },
      {
        domain: "产品交付",
        title: "产品交付 - 先进动力产品交付",
        quarterGoal: "先进动力产品交付",
        success: "产品部署、培训",
        m1: "根据实际交付时间决定",
        m1Status: "/",
        m2: "/",
        m2Status: "/",
        m3: "/",
        m3Status: "/",
      },
      {
        domain: "产品调研",
        title: "产品调研 - 数字化转型测试指标梳理",
        quarterGoal: "对标中小企业数字化转型测试指标完成现有产品的梳理、后续构建应用模块的规划可行性方案",
        success: "完成调研文档编写，计划本季度落地1-2个模块（优化/新增）",
        m1: "产品/技术调研",
        m1Status: "完成调研文档编写",
        m2: "/",
        m2Status: "/",
        m3: "/",
        m3Status: "/",
      },
      {
        domain: "运维稳定",
        title: "运维稳定 - 数字化管理系统与制造1.0维护",
        quarterGoal: "1、数字化管理系统相关模块稳定性维护\n2、制造1.0系统稳定性维护",
        success: "保持系统运行的稳定性，实现问题的快速响应",
        m1: "同季度目标",
        m1Status: "保持系统运行的稳定性，实现问题的快速响应",
        m2: "同季度目标",
        m2Status: "/",
        m3: "同季度目标",
        m3Status: "/",
      },
      {
        domain: "市场支持",
        title: "市场支持 - 市场解决方案与项目工作支撑",
        quarterGoal:
          "1、支撑市场团队的解决方案编写等相关工作，例如：乌海项目及其他客户相关的工作支撑\n2、烟台、东营数字化转型项目相关工作",
        success: "符合市场团队预期",
        m1: "同季度目标",
        m1Status: "支撑乌海市、烟台数字化转型项目工作",
        m2: "同季度目标",
        m2Status: "/",
        m3: "同季度目标",
        m3Status: "/",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 专利技术交底书",
        quarterGoal: "完成1项技术交底书",
        success: "提交技术交底书",
        m1: "/",
        m1Status: "/",
        m2: "/",
        m2Status: "/",
        m3: "专利技术交底书",
        m3Status: "提交交底书",
      },
      {
        domain: "AI赋能",
        title: "AI赋能 - 推动AI赋能制造产品",
        quarterGoal: "协同AI组共同推动AI赋能制造产品工作",
        success: "结合方案汇报情况与工作排期推动功能落地",
        m1: "同季度目标",
        m1Status: "/",
        m2: "同季度目标",
        m2Status: "/",
        m3: "同季度目标",
        m3Status: "/",
      },
    ],
  },
  {
    teamName: "平台建设组",
    leaderName: "王云飞",
    leaderUsername: "wangyunfei",
    title: "平台建设组 2026年三季度里程碑计划",
    goals: "围绕大陆通平台账户、一物通售后管理、主要产品编码、门户优化、平台稳定运行和专利交底推进三季度里程碑。",
    items: [
      {
        domain: "产品迭代",
        title: "产品迭代 - 大陆通平台 V1.10.9 平台资金账户",
        quarterGoal: "大陆通平台V1.10.9-平台资金账户",
        success: "运营中心新增平台账户模块，为运营方提供平台账户资金管理的统一视图",
        m1: "测试通过并上线",
        m1Status: "-",
        m2: "-",
        m2Status: "-",
        m3: "-",
        m3Status: "-",
      },
      {
        domain: "新的模块",
        title: "新的模块 - 大陆通平台 V1.11.0 一码通售后管理",
        quarterGoal: "大陆通平台V1.11.0-一码通售后管理",
        success: "一码通新增售后反馈模块",
        m1: "测试通过并上线",
        m1Status: "-",
        m2: "-",
        m2Status: "-",
        m3: "-",
        m3Status: "-",
      },
      {
        domain: "新的模块",
        title: "新的模块 - 大陆通平台 V2.0.0 主要产品编码",
        quarterGoal: "大陆通平台V2.0.0-主要产品编码",
        success: "依据企业标准《标准文本-工业互联网标识解析 主要产品 标识编码》完成主要产品编码能力建设",
        m1: "完成产品设计和代码编写",
        m1Status: "-",
        m2: "测试通过并上线",
        m2Status: "-",
        m3: "-",
        m3Status: "-",
      },
      {
        domain: "产品迭代",
        title: "产品迭代 - 大陆通平台 V2.1.0 门户优化",
        quarterGoal: "大陆通平台V2.1.0-门户优化",
        success: "全面升级门户视觉与交互体验，精简核心业务入口，提升页面加载性能与用户体验",
        m1: "-",
        m1Status: "-",
        m2: "完成产品设计和代码编写",
        m2Status: "-",
        m3: "测试通过并上线",
        m3Status: "-",
      },
      {
        domain: "运维稳定",
        title: "运维稳定 - 大陆通平台平稳运行",
        quarterGoal: "大陆通平台平稳运行",
        success: "系统可用率≥99%",
        m1: "平稳运行",
        m1Status: "-",
        m2: "平稳运行",
        m2Status: "-",
        m3: "平稳运行",
        m3Status: "-",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 三份专利技术交底书",
        quarterGoal: "提交三份专利技术交底书",
        success: "提交三份专利技术交底书",
        m1: "提交两份技术交底书",
        m1Status: "-",
        m2: "提交一份技术交底书",
        m2Status: "-",
        m3: "-",
        m3Status: "-",
      },
    ],
  },
  {
    teamName: "AI与数据资产组",
    leaderName: "刘中志",
    leaderUsername: "liuzhongzhi",
    title: "AI与数据资产组 2026年三季度里程碑计划",
    goals: "围绕AI赋能、市场支持、技术交底、AI产品线方案、数据资产运营、登记服务中心和组织能力提升推进三季度目标。",
    items: [
      {
        domain: "产品迭代",
        title: "产品迭代 - AI赋能数字化系统日志管理",
        quarterGoal: "AI赋能-数字化系统-日志管理",
        success: "完成数字化系统与AI平台对接、日报总结模块、月报总结模块",
        m1: "7月底完成上线",
      },
      {
        domain: "市场支持",
        title: "市场支持 - 乌海数字化转型支持",
        quarterGoal: "乌海数字化转型支持",
        success: "支持市场小组输出方案",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 技术交底书",
        quarterGoal: "完成1项技术交底书",
        success: "上传知识库",
        m1: "输出技术交底书1份",
        m2: "输出技术交底书2份",
      },
      {
        domain: "技术创新",
        title: "技术创新 - AI赋能产品线方案",
        quarterGoal: "完成AI赋能产品线方案",
        success: "完成所有产品线的AI赋能方案并进行汇报",
        m1: "完成平台组、智能设备组初步方案",
        m2: "根据优先级完成项目推进",
        m3: "根据优先级完成项目推进",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 数据资产运营平台方案",
        quarterGoal: "数据资产运营平台方案",
        success: "完成数据集、数据产品的产品研发，提供服务能力",
      },
      {
        domain: "产品迭代",
        title: "产品迭代 - 数据产品登记服务中心",
        quarterGoal: "数据产品登记服务中心",
        success: "完成上线，完成数据产品登记、赋码、证书生成、确权等功能，完成项目上线",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 技术中心AI提交方案推进",
        quarterGoal: "技术中心AI提交方案推进",
        success: "对产品、测试、前端、后端四个维度进行技术选型、预研、实施方案编写",
        m1: "完成初版方案",
        m2: "技术中心内部培训推广并收集反馈，优化方案",
        m3: "技术中心内部培训推广并收集反馈，优化方案",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 组内AI人才技术能力提升",
        quarterGoal: "组内AI人才技术能力提升",
        success: "python语言和LangGraph大模型技术框架，将学习记录进行总结，提高技术中心转型AI人才的技术储备",
        m1: "掌握基础python语言和LangGraph框架逻辑，熟悉现有AI框架的代码",
        m2: "参与AI项目的代码编写，转型成为AI开发工程师",
        m3: "参与AI项目的代码编写，转型成为AI开发工程师",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 数据血缘管理方案",
        quarterGoal: "数据血缘管理方案",
        success: "完成数据血缘管理模块demo，将黑盒化的数据流转过程显性化，组织汇报并通过评审",
        m1: "输出设计方案及数据血缘管理模块并通过汇报",
        m2: "根据汇报情况修改优化模块",
        m3: "将优化后的模块方案及demo进行汇报",
      },
    ],
  },
  {
    teamName: "智慧设备建设组",
    leaderName: "朱清凡",
    leaderUsername: "zhuqingfan",
    title: "智慧设备建设组 2026年三季度里程碑计划",
    goals: "围绕设备监测控制中心、工云学堂、能碳管理中心、AI赋能、运维稳定、市场支持和专利交底推进三季度目标。",
    items: [
      {
        domain: "产品迭代",
        title: "产品迭代 - 设备监测控制中心 v1.3.0",
        quarterGoal: "设备监测控制中心v1.3.0版本",
        success:
          "1. 新增数据告警、过滤功能模块，完成数据告警、过滤的配置功能以及展示页面的开发；\n2. 新增监控管理功能模块，完成摄像头设备的配置、采集与实时画面展示等功能开发；\n3. 完成系统业务数据库迁移；\n4. 完成已知问题优化。",
        m1: "1. 完成相关功能技术预研和讨论，配合产品经理输出需求文档；\n2. 完成业务数据库迁移以及已知问题修复，完成自测。",
        m2:
          "1. 完成流媒体服务器搭建以及配置、测试（需协调借用园区监控）；\n2. 完成数据告警、数据过滤、监控管理等页面以及后台接口开发与联调；\n3. 完成规则链数据采集、数据过滤、数据推送（新增结合钉钉、企业微信等进行推送）等节点的开发与自测。",
        m3: "1. 完成平台与流媒体服务器的对接测试；\n2. 提交测试人员进行系统测试，修改测试问题；\n3. 整理开发过程中相关文档，留存，更新产品帮助手册、白皮书、PPT。",
      },
      {
        domain: "产品迭代",
        title: "产品迭代 - 工云学堂 v2.1.4",
        quarterGoal: "工云学堂v2.1.4版本",
        success: "根据市场需求结果进一步细化（1. 完善收账与清分流程；2. 增加线上开票流程功能）",
        m1: "/",
        m2: "/",
        m3: "/",
      },
      {
        domain: "产品上线",
        title: "产品上线 - 能碳管理中心",
        quarterGoal: "能碳管理中心",
        success: "能碳管理中心数据采集模块上线",
        m1: "能碳管理中心数据采集模块上线",
        m2: "/",
        m3: "/",
      },
      {
        domain: "AI赋能",
        title: "AI赋能 - 输出相关方案文档",
        quarterGoal: "结合本组产品功能，配合AI建设组输出相关方案文档",
        success: "1. 输出设备监测控制中心AI赋能方案模块；\n2. 输出工云学堂AI赋能方案模块。",
        m1: "输出设备监测控制中心AI赋能方案；",
        m2: "输出工云学堂AI赋能方案；",
        m3: "/",
      },
      {
        domain: "运维稳定/市场支持",
        title: "运维稳定/市场支持 - 设备与车项目支撑",
        quarterGoal: "1. 设备监测控制中心智慧天车项目运维支撑；\n2. 信源天车项目验收支撑；",
        success: "1. 保持系统可用率，实现问题快速响应；\n2. 按需支持项目验收工作；",
        m1: "/",
        m2: "/",
        m3: "/",
      },
      {
        domain: "运维稳定",
        title: "运维稳定 - 工云学堂系统运维支撑",
        quarterGoal: "工云学堂系统运维支撑",
        success: "保持系统可用率，实现问题快速响应",
        m1: "/",
        m2: "/",
        m3: "/",
      },
      {
        domain: "市场支持",
        title: "市场支持 - 数字化转型诊断与项目市场支撑",
        quarterGoal: "乌海数字化转型诊断、青岛恒星项目、计量院项目等相关市场工作支撑",
        success: "按市场需要进行支撑，输出解决方案",
        m1: "/",
        m2: "/",
        m3: "/",
      },
      {
        domain: "技术创新",
        title: "技术创新 - 专利交底书编写",
        quarterGoal: "专利交底书编写",
        success: "输出一份专利交底书",
        m1: "/",
        m2: "/",
        m3: "输出一份专利交底书",
      },
    ],
  },
];

function buildDescription(item: MilestoneItem) {
  return [
    `目标域：${item.domain}`,
    `季度目标：\n${item.quarterGoal}`,
    `成功标准：\n${item.success}`,
    item.m1 ? `M1目标：\n${item.m1}` : "",
    item.m1Status ? `M1状态：\n${item.m1Status}` : "",
    item.m2 ? `M2目标：\n${item.m2}` : "",
    item.m2Status ? `M2状态：\n${item.m2Status}` : "",
    item.m3 ? `M3目标：\n${item.m3}` : "",
    item.m3Status ? `M3状态：\n${item.m3Status}` : "",
  ]
    .filter((part) => part && !part.endsWith("：\n/"))
    .join("\n\n");
}

async function ensureLeader(leaderName: string, username: string) {
  const existing = await prisma.user.findFirst({ where: { name: leaderName } });
  if (existing) return existing;

  const password = await bcrypt.hash("123456", 10);
  return prisma.user.create({
    data: {
      name: leaderName,
      username,
      email: null,
      password,
      department: "产品线",
    },
  });
}

async function importGroupPlan(group: GroupPlan) {
  const leader = await ensureLeader(group.leaderName, group.leaderUsername);
  const team = await prisma.productLineTeam.upsert({
    where: { name: group.teamName },
    update: {},
    create: { name: group.teamName },
  });

  await prisma.productLineMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: leader.id } },
    update: { role: ProductLineRole.LEADER },
    create: { teamId: team.id, userId: leader.id, role: ProductLineRole.LEADER },
  });

  const existing = await prisma.plan.findFirst({
    where: {
      title: group.title,
      productLineTeamId: team.id,
      type: PlanType.QUARTERLY,
      year: 2026,
      quarter: 3,
    },
    select: { id: true },
  });

  const planData = {
    description:
      "来源：A季度产品目标看板。原表头写 Q2(2026年7-9月)，按用户说明及月份范围录入为 2026 年三季度。",
    status: PlanStatus.IN_PROGRESS,
    year: 2026,
    quarter: 3,
    month: null,
    halfYear: null,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-09-30"),
    goals: group.goals,
    productLineTeamId: team.id,
  };

  const plan = existing
    ? await prisma.plan.update({ where: { id: existing.id }, data: planData })
    : await prisma.plan.create({
        data: {
          title: group.title,
          type: PlanType.QUARTERLY,
          createdById: leader.id,
          ...planData,
        },
      });

  await prisma.planItem.deleteMany({ where: { planId: plan.id } });
  await prisma.planItem.createMany({
    data: group.items.map((item, index) => ({
      planId: plan.id,
      title: item.title,
      description: buildDescription(item),
      assigneeId: leader.id,
      status: PlanItemStatus.TODO,
      progress: 0,
      sortOrder: index + 1,
    })),
  });

  return { team: group.teamName, leader: group.leaderName, planId: plan.id, itemCount: group.items.length };
}

async function main() {
  const results = [];
  for (const group of plans) {
    results.push(await importGroupPlan(group));
  }
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
