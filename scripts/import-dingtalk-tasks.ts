import { PrismaClient, ManagedTaskSdlcNode, ManagedTaskStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function calcDays(startStr: string | null, endStr: string | null): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

interface RawTaskItem {
  title: string;
  projectOrVersion: string;
  sdlcNode?: ManagedTaskSdlcNode | null;
  executorName: string;
  allExecutors?: string;
  description?: string;
  planStartStr?: string | null;
  planEndStr?: string | null;
  actualStartStr?: string | null;
  actualEndStr?: string | null;
  children?: RawTaskItem[];
}

interface GroupTaskData {
  teamName: string;
  tasks: RawTaskItem[];
}

function extractExecutorNames(raw: RawTaskItem): string[] {
  const sourceStr = raw.allExecutors || raw.executorName || "";
  const list = sourceStr.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  if (list.length === 0 && raw.executorName) {
    return [raw.executorName.trim()];
  }
  return Array.from(new Set(list)); // Deduplicate
}

const allGroupsData: GroupTaskData[] = [
  {
    teamName: "能源管理建设组",
    tasks: [
      {
        title: "碳排放核算模块建设",
        projectOrVersion: "能碳管理中心（碳排放核算）",
        sdlcNode: null,
        executorName: "亓新明",
        description: "功能开发上线",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-31",
        actualStartStr: "2026-07-01",
        actualEndStr: null,
        children: [
          {
            title: "需求宣讲",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "巩蕊",
            description: "需求文档",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-01",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-01",
          },
          {
            title: "根据评审意见进行需求文档完善",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "巩蕊",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-02",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-02",
          },
          {
            title: "概设详设编写",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "张涛（后端）",
            allExecutors: "张涛（后端）, 王亚, 石丰源, 王海川",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-06",
          },
          {
            title: "概设详设宣讲",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "张涛（后端）",
            allExecutors: "张涛（后端）, 王亚, 石丰源, 王海川",
            description: "详设、概设文档",
            planStartStr: "2026-07-07",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-07",
            actualEndStr: null,
          },
          {
            title: "测试用例编写",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "任昊宇",
            description: "测试用例编写",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-07",
          },
          {
            title: "后端接口编写",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "张涛（后端）",
            allExecutors: "张涛（后端）, 王亚, 王海川, 石丰源",
            planStartStr: "2026-07-07",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-07",
            actualEndStr: "2026-07-13",
          },
          {
            title: "前端页面编写",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "高朋",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-08",
          },
          {
            title: "yapi对接",
            projectOrVersion: "能碳管理中心",
            sdlcNode: null,
            executorName: "高朋",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-13",
          },
          {
            title: "前后端联调和内测",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "高朋",
            allExecutors: "高朋, 张涛（后端）, 王亚, 石丰源, 王海川",
            planStartStr: "2026-07-14",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-14",
            actualEndStr: "2026-07-17",
          },
          {
            title: "提测演示（系统测试）",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "任昊宇",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-23",
          },
          {
            title: "终测测试报告编写",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "任昊宇",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-10",
          },
        ],
      },
      {
        title: "增加分厂外网供电草临控数据大屏",
        projectOrVersion: "太阳纸业V1.4.6",
        sdlcNode: null,
        executorName: "亓新明",
        description: "系统上线",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-31",
        actualStartStr: "2026-07-01",
        actualEndStr: "2026-07-24",
        children: [
          {
            title: "需求文档编写、UI设计沟通",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "亓新明",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "需求宣讲",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "亓新明",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-17",
          },
          {
            title: "前后端开发",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "高朋",
            allExecutors: "高朋, 石丰源",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-20",
            actualEndStr: "2026-07-23",
          },
          {
            title: "前后端联调和内测",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "高朋",
            allExecutors: "高朋, 石丰源",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-23",
            actualEndStr: "2026-07-24",
          },
          {
            title: "提测演示",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: null,
            executorName: "任昊宇",
            planStartStr: "2026-07-24",
            planEndStr: "2026-07-24",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "北海、南宁大屏数据处理",
            projectOrVersion: "太阳纸业V1.4.6",
            sdlcNode: null,
            executorName: "石丰源",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-28",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "碳核查支撑模块建设",
        projectOrVersion: "能碳管理中心",
        sdlcNode: null,
        executorName: "亓新明",
        planStartStr: "2026-07-02",
        children: [
          {
            title: "碳核查支撑模块产品原型设计、碳排放核算支...",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "巩蕊",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-15",
          },
          {
            title: "铝冶炼行业数据整理",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "巩蕊",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-29",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "能碳管理中心正式环境发版准备",
        projectOrVersion: "能碳管理中心正式环境发版准备...",
        sdlcNode: null,
        executorName: "亓新明",
        children: [
          {
            title: "完成正式环境发版技术准备",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "王亚",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-20",
            actualEndStr: null,
          },
          {
            title: "化工行业能源数据收集整理，模拟化工行业真...",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "巩蕊",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-18",
            actualEndStr: "2026-07-21",
          },
          {
            title: "功能全量测试",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "任昊宇",
            planStartStr: "2026-07-24",
            planEndStr: "2026-07-28",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "需求文档编写",
            projectOrVersion: "能碳管理中心V1.0.0（专项服务）",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "亓新明",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-24",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "需求宣讲",
            projectOrVersion: "能碳管理中心V1.0.0（专项服务）",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "亓新明",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-27",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "环境构建流水线",
            projectOrVersion: "能碳管理中心V1.0.0（专项服务）",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "王亚",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-28",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "详设文档编写",
            projectOrVersion: "能碳管理中心V1.0.0（专项服务）",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "王亚",
            allExecutors: "王亚, 王海川, 张涛（后端）",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-29",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "功能优化（移动端优化账号登录持续长优化...）",
        projectOrVersion: "能源管控中心V1.8.7",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "亓新明",
        planStartStr: "2026-07-08",
        planEndStr: "2026-07-10",
        actualStartStr: "2026-07-08",
        actualEndStr: "2026-07-10",
        children: [
          {
            title: "原型设计以及需求文档编写",
            projectOrVersion: "能源管控中心V1.8.7",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "亓新明",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-10",
          },
        ],
      },
      {
        title: "配合市场完成售前工作",
        projectOrVersion: "威海北洋集团能源管控中心",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "亓新明",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-02",
        actualStartStr: "2026-07-01",
        actualEndStr: "2026-07-02",
        children: [
          {
            title: "报价单编写、沟通讨论",
            projectOrVersion: "威海北洋集团能源管控中心",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "亓新明",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-02",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-02",
          },
          {
            title: "AI测试用例研究",
            projectOrVersion: "AI赋能",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "任昊宇",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-17",
          },
        ],
      },
      {
        title: "组内运维工作培训",
        projectOrVersion: "组内运维工作培训",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "亓新明",
        planStartStr: "2026-07-13",
        planEndStr: "2026-07-17",
        actualStartStr: "2026-07-13",
        actualEndStr: "2026-07-17",
        children: [
          {
            title: "能管项目培训",
            projectOrVersion: "组内运维工作培训",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "石丰源",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-16",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-16",
          },
          {
            title: "flink培训",
            projectOrVersion: "组内运维工作培训",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "张涛（后端）",
            allExecutors: "张涛（后端）, 石丰源, 王亚, 王海川",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-16",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-16",
          },
        ],
      },
      {
        title: "东营数字化转型",
        projectOrVersion: "东营数字化转型",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "亓新明",
        planStartStr: "2026-07-16",
        planEndStr: "2026-07-17",
        children: [
          {
            title: "华智云数字化工厂管理系统功能清单能管+能碳...",
            projectOrVersion: "东营数字化转型",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "任昊宇",
            allExecutors: "任昊宇, 王亚",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-17",
          },
        ],
      },
      {
        title: "乌海数字化转型",
        projectOrVersion: "乌海数字化转型",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "亓新明",
        planStartStr: "2026-07-01",
        children: [
          {
            title: "鼎力高钙数字化转型方案根据现场反馈意见修改",
            projectOrVersion: "乌海数字化转型",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "亓新明",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-14",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-14",
          },
          {
            title: "国能零碳能源管控中心功能沟通与演示",
            projectOrVersion: "乌海数字化转型",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "亓新明",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-23",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "印证报告大纲编写",
        projectOrVersion: "山东省计量院技术支持",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "巩蕊",
        allExecutors: "巩蕊, 亓新明",
        planStartStr: "2026-07-21",
        planEndStr: "2026-07-22",
        actualStartStr: "2026-07-21",
        actualEndStr: "2026-07-22",
      },
    ],
  },
  {
    teamName: "AI与数据资产组",
    tasks: [
      {
        title: "方案编写",
        projectOrVersion: "大陆通知识中心产品数据收集标准方案",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "安鸿效",
        allExecutors: "安鸿效, 马树成",
        description: "完成方案编写",
        planStartStr: "2026-06-30",
        planEndStr: "2026-07-07",
        actualStartStr: "2026-06-30",
        actualEndStr: null,
      },
      {
        title: "数据自维技术预研",
        projectOrVersion: "数据自维技术预研",
        sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
        executorName: "安鸿效",
        allExecutors: "安鸿效, 马树成",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-31",
        actualStartStr: "2026-07-01",
        actualEndStr: null,
        children: [
          {
            title: "功能设计方案编写",
            projectOrVersion: "数据自维技术预研",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "安鸿效",
            allExecutors: "安鸿效, 马树成",
            description: "完成技术预研和设计文档编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-08",
          },
          {
            title: "项目demo搭建",
            projectOrVersion: "数据自维技术预研",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "安鸿效",
            allExecutors: "安鸿效, 马树成",
            description: "完成可展示的demo",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
        ],
      },
      {
        title: "数据产品登记服务中心",
        projectOrVersion: "数据产品登记服务中心",
        sdlcNode: null,
        executorName: "刘中志",
        children: [
          {
            title: "操作手册编写",
            projectOrVersion: "数据产品登记服务中心",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "刘中志",
            allExecutors: "刘中志, 张厚诚",
            description: "完成操作手册全部内容的编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
        ],
      },
      {
        title: "AI赋能业务场景",
        projectOrVersion: "AI赋能业务场景",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "刘中志",
        allExecutors: "刘中志, 张路路, 刘广鑫",
        children: [
          {
            title: "AI赋能业务场景 - 沟通场景",
            projectOrVersion: "AI赋能业务场景",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "刘中志",
            allExecutors: "刘中志, 张路路, 刘广鑫",
            description: "与各业务线沟通赋能业务场景",
            planStartStr: null,
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "AI赋能业务场景 - 平台组方案",
            projectOrVersion: "AI赋能业务场景",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "刘中志",
            allExecutors: "刘中志, 张路路, 刘广鑫",
            description: "编写平台组初版方案",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-13",
          },
          {
            title: "AI赋能业务场景 - 智能设备组方案",
            projectOrVersion: "AI赋能业务场景",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "刘中志",
            allExecutors: "刘中志, 张路路, 刘广鑫",
            description: "编写智能设备组初版方案",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-13",
          },
        ],
      },
      {
        title: "推进数据资产管理项目",
        projectOrVersion: "推进数据资产管理项目",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "马树成",
        allExecutors: "马树成, 安鸿效, 梁冬雪, 刘中志",
        children: [
          {
            title: "梳理数据管理数据集",
            projectOrVersion: "推进数据资产管理项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "马树成",
            allExecutors: "马树成, 安鸿效",
            description: "梳理数据管理数据集",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-17",
          },
          {
            title: "完成第二版方案汇报",
            projectOrVersion: "推进数据资产管理项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "马树成",
            allExecutors: "马树成, 安鸿效, 梁冬雪",
            description: "修改方案并完成汇报",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-31",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-14",
          },
          {
            title: "参加资产运营平台方案宣讲",
            projectOrVersion: "推进数据资产管理项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "马树成",
            allExecutors: "马树成, 安鸿效, 梁冬雪, 刘中志, 张路路",
            planStartStr: "2026-07-15",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-15",
          },
          {
            title: "参加资产运营平台方案评审",
            projectOrVersion: "推进数据资产管理项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "马树成",
            allExecutors: "马树成, 安鸿效, 梁冬雪, 刘中志",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-23",
            actualEndStr: "2026-07-25",
          },
        ],
      },
      {
        title: "日志管理1.4.0",
        projectOrVersion: "日志管理1.4.0",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "刘中志",
        allExecutors: "刘中志, 张厚诚, 刘广鑫, 张路路",
        children: [
          {
            title: "需求宣讲",
            projectOrVersion: "日志管理1.4.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "刘中志",
            allExecutors: "刘中志, 张厚诚, 刘广鑫, 张路路",
            description: "需求文档宣讲",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-13",
          },
          {
            title: "设计文档编写并宣讲",
            projectOrVersion: "日志管理1.4.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "刘中志",
            allExecutors: "刘中志, 张厚诚, 刘广鑫",
            description: "编写设计文档并宣讲",
            planStartStr: "2026-07-14",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-14",
            actualEndStr: "2026-07-15",
          },
          {
            title: "编写前后端代码",
            projectOrVersion: "日志管理1.4.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "刘中志",
            allExecutors: "刘中志, 张厚诚, 刘广鑫",
            description: "完成前后端代码开发",
            planStartStr: "2026-07-15",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-17",
          },
          {
            title: "提测",
            projectOrVersion: "日志管理1.4.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "刘中志",
            allExecutors: "刘中志, 张厚诚, 刘广鑫",
            description: "完成代码测试提测",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-27",
          },
        ],
      },
      {
        title: "对项目人员进行分享交接",
        projectOrVersion: "铺管交接Flink相关文档",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "安鸿效",
        description: "完成交接培训与文档共享",
        planStartStr: "2026-07-13",
        planEndStr: "2026-07-17",
        actualStartStr: "2026-07-13",
        actualEndStr: "2026-07-17",
      },
      {
        title: "黄河流域项目",
        projectOrVersion: "黄河流域项目",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "刘中志",
        allExecutors: "刘中志, 张路路",
        children: [
          {
            title: "与田成平初步沟通项目情况",
            projectOrVersion: "黄河流域项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "刘中志",
            allExecutors: "刘中志, 张路路",
            description: "了解项目情况",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-17",
          },
          {
            title: "与田成平明确工作计划",
            projectOrVersion: "黄河流域项目",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "刘中志",
            allExecutors: "刘中志, 张路路",
            description: "明确项目推进与需求编写",
            planStartStr: "2026-07-21",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-21",
            actualEndStr: "2026-07-22",
          },
        ],
      },
      {
        title: "梳理数据集",
        projectOrVersion: "梳理数据集",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "安鸿效",
        allExecutors: "安鸿效, 马树成",
        children: [
          {
            title: "完成能源管理的数据集梳理",
            projectOrVersion: "梳理数据集",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "安鸿效",
            allExecutors: "安鸿效, 马树成",
            description: "完成方案编写",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-20",
            actualEndStr: "2026-07-24",
          },
        ],
      },
      {
        title: "填写山东数据企业入库申请表",
        projectOrVersion: "填写山东数据企业入库申请表",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "马树成",
        description: "协助姚天俊填写相关表单",
        planStartStr: "2026-07-20",
        planEndStr: "2026-07-24",
        actualStartStr: "2026-07-20",
        actualEndStr: "2026-07-24",
      },
    ],
  },
  {
    teamName: "平台建设组",
    tasks: [
      {
        title: "平台资金账户",
        projectOrVersion: "大陆通平台V1.10.9",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "代码编写、前后端联调内测",
            projectOrVersion: "大陆通平台V1.10.9",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "马永辉",
            allExecutors: "马永辉, 韩冰",
            description: "完成代码编写与联调",
            planStartStr: "2026-06-30",
            planEndStr: "2026-07-14",
            actualStartStr: "2026-06-30",
            actualEndStr: "2026-07-14",
          },
          {
            title: "熟悉需求、设计测试用例",
            projectOrVersion: "大陆通平台V1.10.9",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "高先泽",
            description: "完成版本用例设计",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-07",
          },
          {
            title: "系统测试",
            projectOrVersion: "大陆通平台V1.10.9",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "高先泽",
            description: "完成系统功能测试",
            planStartStr: "2026-07-14",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-14",
            actualEndStr: "2026-07-20",
          },
          {
            title: "发布上线",
            projectOrVersion: "大陆通平台V1.10.9",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "马永辉",
            allExecutors: "马永辉, 韩冰, 高先泽",
            description: "发布上线",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-21",
            actualEndStr: "2026-07-21",
          },
        ],
      },
      {
        title: "化妆品编码",
        projectOrVersion: "大陆通平台V2.0.0",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "跟进客户需求评审、讨论、定稿",
            projectOrVersion: "大陆通平台V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "张传梅",
            description: "跟进客户需求",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-10",
          },
          {
            title: "产品需求讨论、产品文档编写",
            projectOrVersion: "大陆通平台V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "张传梅",
            description: "完成产品模型文档",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-17",
          },
          {
            title: "主要产品分类数据整理",
            projectOrVersion: "大陆通平台V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松",
            description: "交付分类数据整理",
            planStartStr: "2026-06-29",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-06-29",
            actualEndStr: "2026-07-06",
          },
          {
            title: "化妆品行业工业互联网标识解析体系产品运营",
            projectOrVersion: "大陆通平台V2.0.0",
            sdlcNode: null,
            executorName: "王云飞",
            allExecutors: "王云飞, 张传梅",
            description: "完成产品运营与体系建设",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-24",
          },
        ],
      },
      {
        title: "一码通-售后管理",
        projectOrVersion: "一码通-售后管理",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "产品原型和文档编写",
            projectOrVersion: "一码通-售后管理",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "张传梅",
            description: "完成产品原型及文档",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-02",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-02",
          },
          {
            title: "前端代码编写",
            projectOrVersion: "一码通-售后管理",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "周大鹏",
            description: "完成前端代码",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "前后端联调内测",
            projectOrVersion: "一码通-售后管理",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "周大鹏",
            description: "完成前后端联调内测",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-21",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-17",
          },
          {
            title: "系统测试",
            projectOrVersion: "一码通-售后管理",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "周大鹏",
            description: "完成系统功能测试",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-22",
            actualEndStr: null,
          },
          {
            title: "发布上线",
            projectOrVersion: "一码通-售后管理",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "周大鹏",
            description: "发布上线",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-27",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "AI赋能方案",
        projectOrVersion: "AI赋能方案",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "方案初步沟通讨论",
            projectOrVersion: "AI赋能方案",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松, 张传梅, 马永辉",
            description: "完成方案初步沟通讨论",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-01",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-01",
          },
          {
            title: "完成方案初稿",
            projectOrVersion: "AI赋能方案",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松, 张传梅, 马永辉",
            description: "提交初稿给AI组",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-07",
          },
          {
            title: "确定平台建设组AI赋能方案初稿",
            projectOrVersion: "AI赋能方案",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松, 马永辉, 张传梅",
            description: "确定平台建设组初稿",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-10",
          },
          {
            title: "平台建设组AI赋能方案修改",
            projectOrVersion: "AI赋能方案",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松, 马永辉, 张传梅",
            description: "最终版定稿",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-10",
            actualEndStr: "2026-07-13",
          },
        ],
      },
      {
        title: "应用模板路由配置",
        projectOrVersion: "大陆通平台V1.11.0",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "产品原型设计和需求文档编写",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "张传梅",
            description: "完成产品原型及需求文档",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-09",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-09",
          },
          {
            title: "熟悉需求、设计测试用例",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "高先泽",
            description: "熟悉需求，完成用例设计",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-13",
          },
          {
            title: "工作量整理、设计文档编写",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松",
            description: "完成设计文档编写",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-13",
          },
          {
            title: "功能代码开发，接口联调内测",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松, 周大鹏",
            description: "完成前后端代码联调",
            planStartStr: "2026-07-14",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-14",
            actualEndStr: "2026-07-17",
          },
          {
            title: "系统测试",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "高先泽",
            description: "完成系统功能测试",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-21",
            actualStartStr: "2026-07-20",
            actualEndStr: "2026-07-21",
          },
          {
            title: "发布上线",
            projectOrVersion: "大陆通平台V1.11.0",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "王云飞",
            description: "发布上线",
            planStartStr: "2026-07-21",
            planEndStr: "2026-07-21",
            actualStartStr: "2026-07-21",
            actualEndStr: "2026-07-21",
          },
        ],
      },
      {
        title: "烟台数字化转型",
        projectOrVersion: "烟台数字化转型",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "烟台数字化转型",
            projectOrVersion: "烟台数字化转型",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "王云飞",
            description: "烟台数字化转型售前支持",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-24",
          },
        ],
      },
      {
        title: "大陆通平台运维",
        projectOrVersion: "大陆通平台运维",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "企业知识库使用手册白皮书等文档更新",
            projectOrVersion: "大陆通平台运维",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松",
            description: "完成企业知识库白皮书更新",
            planStartStr: "2026-07-03",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-03",
            actualEndStr: "2026-07-08",
          },
          {
            title: "门户功能梳理",
            projectOrVersion: "大陆通平台运维",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "周大鹏",
            allExecutors: "周大鹏, 高先泽",
            description: "整理功能生成列表",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-07",
          },
          {
            title: "门户功能重构",
            projectOrVersion: "大陆通平台运维",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "周大鹏",
            description: "基于nuxt3和vite进行门户重构",
            planStartStr: "2026-07-07",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-07",
            actualEndStr: null,
          },
          {
            title: "应用编码（创建环节）结构修改，优化编码逻辑",
            projectOrVersion: "大陆通平台运维",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "王云飞",
            allExecutors: "王云飞, 宋庆松",
            description: "完成应用编码逻辑优化",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-24",
          },
          {
            title: "企业商城更新（完善平台的账户交易流水记录）",
            projectOrVersion: "大陆通平台运维",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "马永辉",
            allExecutors: "马永辉, 韩冰",
            description: "发布上线",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-20",
            actualEndStr: "2026-07-22",
          },
        ],
      },
      {
        title: "日志管理v1.4.0",
        projectOrVersion: "日志管理v1.4.0",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "日志管理v1.4.0功能测试",
            projectOrVersion: "日志管理v1.4.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "高先泽",
            description: "完成系统功能测试",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-23",
            actualEndStr: "2026-07-24",
          },
        ],
      },
      {
        title: "企业知识库",
        projectOrVersion: "企业知识库",
        sdlcNode: null,
        executorName: "王云飞",
        children: [
          {
            title: "企业知识库 AI问答功能测试",
            projectOrVersion: "企业知识库",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "高先泽",
            description: "完成系统功能测试",
            planStartStr: "2026-07-24",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-24",
            actualEndStr: "2026-07-24",
          },
        ],
      },
    ],
  },
  {
    teamName: "智能设备组",
    tasks: [
      {
        title: "设备监测控制中心v1.3.0",
        projectOrVersion: "设备监测控制中心v1.3.0",
        sdlcNode: null,
        executorName: "朱清凡",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-31",
        children: [
          {
            title: "业务库迁移及测试",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "霍玉星",
            allExecutors: "霍玉星, 刘金鑫, 公解宇",
            description: "实现业务库迁移及测试",
            planStartStr: "2026-06-29",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-06-29",
            actualEndStr: "2026-07-08",
          },
          {
            title: "功能及代码优化",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星, 公解宇, 刘金鑫",
            description: "完成软件网关开发",
            planStartStr: "2026-06-30",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-06-30",
            actualEndStr: "2026-07-17",
          },
          {
            title: "功能优化内容方案文档编写",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星, 刘金鑫, 公解宇",
            description: "完成功能优化方案文档编写",
            planStartStr: "2026-06-30",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-06-30",
            actualEndStr: "2026-07-21",
          },
          {
            title: "代码审查及优化",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星, 刘金鑫, 公解宇",
            description: "代码审查及优化",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-24",
          },
          {
            title: "帮助手册优化更新",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "公解宇",
            allExecutors: "公解宇, 刘金鑫",
            description: "基于现有帮助手册优化更新",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-31",
            actualStartStr: "2026-07-30",
            actualEndStr: null,
          },
          {
            title: "代码学习",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: null,
            executorName: "公解宇",
            allExecutors: "公解宇, 刘金鑫",
            description: "框架以及业务学习",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-31",
            actualStartStr: "2026-07-20",
            actualEndStr: null,
          },
          {
            title: "技术预研",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星",
            description: "完成数据告警预研",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-31",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "需求文档编写",
            projectOrVersion: "设备监测控制中心v1.3.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 张路路",
            description: "完成新版本需求文档编写",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-31",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "能碳管理中心",
        projectOrVersion: "能碳管理中心",
        sdlcNode: null,
        executorName: "朱清凡",
        children: [
          {
            title: "能碳管理中心产品上线",
            projectOrVersion: "能碳管理中心",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星",
            description: "配合完成能碳管理上线",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-31",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "AI赋能方案",
        projectOrVersion: "AI赋能方案",
        sdlcNode: null,
        executorName: "朱清凡",
        children: [
          {
            title: "完成方案初步讨论",
            projectOrVersion: "AI赋能方案",
            sdlcNode: null,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 霍玉星, 张路路",
            description: "确定基本方案讨论",
            planStartStr: "2026-06-29",
            planEndStr: "2026-06-30",
            actualStartStr: "2026-06-29",
            actualEndStr: "2026-06-30",
          },
          {
            title: "方案初稿内容讨论和建议",
            projectOrVersion: "AI赋能方案",
            sdlcNode: null,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 张路路",
            description: "完成初版方案建议",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-08",
          },
          {
            title: "方案定稿（设备监测控制中心+工云学堂）",
            projectOrVersion: "AI赋能方案",
            sdlcNode: null,
            executorName: "朱清凡",
            allExecutors: "朱清凡, 张路路",
            description: "方案定稿",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-10",
            actualEndStr: "2026-07-10",
          },
        ],
      },
    ],
  },
  {
    teamName: "制造业产品组",
    tasks: [
      {
        title: "售后管理V2.0.0",
        projectOrVersion: "售后管理V2.0.0",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "黄其萌",
        children: [
          {
            title: "完成详设文档编写",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 崔恩泉",
            description: "根据需求完成详设编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-07",
          },
          {
            title: "测试用例编写",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "李燕",
            description: "完成测试用例编写",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-10",
          },
          {
            title: "前端开发",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "沈利",
            description: "页面功能开发",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-08",
          },
          {
            title: "前后端联调",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "沈利",
            description: "前后端接口联调",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-13",
          },
          {
            title: "功能研发、内测、提测",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 崔恩泉, 沈利, 李燕",
            description: "功能研发、内测与提测",
            planStartStr: "2026-07-07",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-07",
            actualEndStr: "2026-07-22",
          },
          {
            title: "功能测试",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "邢子璠",
            description: "功能测试",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-22",
            actualEndStr: null,
          },
          {
            title: "问题单修改",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 崔恩泉, 沈利",
            description: "协助测试完成问题单修改",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-22",
            actualEndStr: null,
          },
          {
            title: "模块发版",
            projectOrVersion: "售后管理V2.0.0",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 崔恩泉, 沈利, 李燕",
            description: "完成发版资料准备及上线",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-27",
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "制芯2.0模块对标及建设方案编写",
        projectOrVersion: "制芯2.0模块对标及建设方案编写",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "黄其萌",
        children: [
          {
            title: "模块对标内容编写及讨论",
            projectOrVersion: "制芯2.0模块对标及建设方案编写",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "黄其萌",
            description: "方案编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "完成后续建设方向内容编写",
            projectOrVersion: "制芯2.0模块对标及建设方案编写",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "黄其萌",
            description: "方案编写",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-10",
          },
        ],
      },
      {
        title: "支撑纯代码应用——权限配置模块",
        projectOrVersion: "支撑纯代码应用——权限配置模块",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "黄其萌",
        children: [
          {
            title: "需求设计",
            projectOrVersion: "支撑纯代码应用——权限配置模块",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "黄其萌",
            description: "完成需求文档",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-13",
          },
          {
            title: "需求宣讲",
            projectOrVersion: "支撑纯代码应用——权限配置模块",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "黄其萌",
            description: "需求宣讲",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-27",
            actualEndStr: null,
          },
          {
            title: "详设编写",
            projectOrVersion: "支撑纯代码应用——权限配置模块",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 崔恩泉",
            description: "详设编写",
            planStartStr: "2026-07-28",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "前端页面开发",
            projectOrVersion: "支撑纯代码应用——权限配置模块",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "沈利",
            description: "前端页面开发",
            planStartStr: "2026-07-29",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "测试用例编写",
            projectOrVersion: "支撑纯代码应用——权限配置模块",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "李燕",
            description: "测试用例编写",
            planStartStr: "2026-07-28",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "产品注册模块扫码对接一码通",
        projectOrVersion: "产品注册模块扫码对接一码通",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "黄其萌",
        children: [
          {
            title: "前端功能修改",
            projectOrVersion: "产品注册模块扫码对接一码通",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "沈利",
            description: "完成产品注册前端功能修改",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-01",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-01",
          },
          {
            title: "功能测试",
            projectOrVersion: "产品注册模块扫码对接一码通",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "李燕",
            description: "完成功能测试",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-02",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-02",
          },
        ],
      },
      {
        title: "烟台数转项目支持",
        projectOrVersion: "烟台数转项目支持",
        sdlcNode: ManagedTaskSdlcNode.OTHER,
        executorName: "黄其萌",
        children: [
          {
            title: "山东华全企业系统部署、数据录入",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 崔恩泉, 裴浩然",
            description: "数据录入、系统部署",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-07",
          },
          {
            title: "烟台鸿华机械配件有限公司、烟台鸿达机械...",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "李燕",
            allExecutors: "李燕, 黄其萌",
            description: "数据录入",
            planStartStr: "2026-07-07",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-07",
            actualEndStr: "2026-07-16",
          },
          {
            title: "功能点优化（仪表制造1.0、2.0）",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 裴浩然, 崔恩泉, 沈利",
            description: "仪表制造V1/V2功能点优化",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-17",
          },
          {
            title: "仪表制造1.0介绍资料",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "裴浩然",
            description: "仪表制造1.0介绍资料编写",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-06",
          },
          {
            title: "烟台鸿达机械有限公司数据录入",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "李燕",
            description: "数据录入",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-10",
            actualEndStr: "2026-07-15",
          },
          {
            title: "烟台鸿达机械有限公司数据大屏",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 裴浩然",
            description: "大屏配置",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-14",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-14",
          },
          {
            title: "招远安斯捷新材料有限公司",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "李燕",
            description: "数据录入",
            planStartStr: "2026-07-17",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-24",
          },
          {
            title: "鸿华、鸿达系统问题优化",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "沈利",
            allExecutors: "沈利, 李燕",
            description: "系统问题优化",
            planStartStr: "2026-07-17",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-22",
          },
          {
            title: "广思达包装材料有限公司",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            description: "数据录入",
            planStartStr: "2026-07-17",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-24",
          },
          {
            title: "烟台瑞智智能科技有限公司",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 李燕",
            description: "数据录入",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-24",
          },
          {
            title: "招远安斯捷新材料、广思达、瑞智智能科技...",
            projectOrVersion: "烟台数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "裴浩然",
            allExecutors: "裴浩然, 沈利",
            description: "问题优化，研...",
            planStartStr: "2026-07-17",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-24",
          },
        ],
      },
      {
        title: "仪表制造1.0销售管理功能优化",
        projectOrVersion: "仪表制造1.0销售管理功能优化",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "黄其萌",
        children: [
          {
            title: "销售回款计划增加搜索条件及导出功能",
            projectOrVersion: "仪表制造1.0销售管理功能优化",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 裴浩然, 沈利, 李燕",
            description: "完成功能优化",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-06",
          },
        ],
      },
      {
        title: "质量管理IQC模块",
        projectOrVersion: "质量管理IQC模块",
        sdlcNode: null,
        executorName: "黄其萌",
        children: [
          {
            title: "产品调研、方案编写",
            projectOrVersion: "质量管理IQC模块",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "黄其萌",
            description: "方案编写",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-10",
            actualEndStr: null,
          },
          {
            title: "方案讨论",
            projectOrVersion: "质量管理IQC模块",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "黄其萌",
            description: "方案讨论",
            planStartStr: "2026-07-28",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "需求编写",
            projectOrVersion: "质量管理IQC模块",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "黄其萌",
            description: "需求文档编写",
            planStartStr: "2026-07-30",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
      {
        title: "东营数转项目支持",
        projectOrVersion: "东营数转项目支持",
        sdlcNode: null,
        executorName: "黄其萌",
        children: [
          {
            title: "产品材料整理编写",
            projectOrVersion: "东营数转项目支持",
            sdlcNode: ManagedTaskSdlcNode.OTHER,
            executorName: "黄其萌",
            allExecutors: "黄其萌, 裴浩然, 李燕, 崔恩泉, 沈利",
            description: "产品材料整理编写",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-17",
          },
        ],
      },
    ],
  },
  {
    teamName: "数字化建设组",
    tasks: [
      {
        title: "1.工作台整体样式优化；2.已知问题修复",
        projectOrVersion: "数字化管理系统v1.6.8",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "前端代码研发",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "张涛（前端）",
            allExecutors: "张涛（前端）, 王高山",
            description: "前端代码编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "后端代码研发",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "后端代码编写",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "大陆通APP离线推送增加clientId",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）",
            description: "前后端代码编写",
            planStartStr: "2026-07-03",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-03",
          },
          {
            title: "大陆通APP离线推送联调、内测",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）",
            description: "联调+内测",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-07",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-06",
          },
          {
            title: "大陆通APP离线推送提测",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 杨含笑",
            description: "大陆通APP提测",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-07",
            actualEndStr: "2026-07-10",
          },
          {
            title: "提测",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "联调提测",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-10",
            actualEndStr: "2026-07-10",
          },
          {
            title: "修改提测bug",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "修改提测bug",
            planStartStr: "2026-07-10",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-10",
            actualEndStr: "2026-07-15",
          },
          {
            title: "发版上线",
            projectOrVersion: "数字化管理系统v1.6.8",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "完成发版上线",
            planStartStr: "2026-07-15",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-15",
          },
        ],
      },
      {
        title: "针对OPPO、荣耀等手机品牌提交大陆通APP角标推送申请",
        projectOrVersion: "大陆通APP各大手机厂商角标推送...",
        sdlcNode: null,
        executorName: "陈鹏飞",
        allExecutors: "陈鹏飞, 张涛（前端）",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-08",
        actualStartStr: "2026-07-01",
        actualEndStr: "2026-07-02",
      },
      {
        title: "给AI组做支撑",
        projectOrVersion: "数字化管理系统-应用建设：日志管理",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "需求宣讲",
            projectOrVersion: "数字化管理系统-应用建设：日志管理",
            sdlcNode: null,
            executorName: "张路路",
            allExecutors: "张路路, 杨含笑, 张涛（前端）",
            description: "需求宣讲",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-13",
          },
          {
            title: "详设宣讲",
            projectOrVersion: "数字化管理系统-应用建设：日志管理",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 杨含笑, 张涛（前端）",
            description: "详设宣讲",
            planStartStr: "2026-07-15",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-15",
          },
          {
            title: "熟悉数字化管理系统AI日志需求、详设",
            projectOrVersion: "数字化管理系统-应用建设：日志管理",
            sdlcNode: null,
            executorName: "杨含笑",
            description: "熟悉数字化管理系统需求详设",
            planStartStr: "2026-07-20",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-20",
            actualEndStr: "2026-07-22",
          },
          {
            title: "提测",
            projectOrVersion: "数字化管理系统-应用建设：日志管理",
            sdlcNode: null,
            executorName: "杨含笑",
            description: "AI日志管理测试",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-22",
            actualEndStr: null,
          },
          {
            title: "数据资产服务平台建设方案修改、讨论",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "数据中台建设方案修改",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-02",
            actualStartStr: "2026-07-01",
            actualEndStr: "2026-07-02",
          },
          {
            title: "向荆总汇报建设方案",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "方案已发给荆总汇报",
            planStartStr: "2026-07-02",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-02",
            actualEndStr: "2026-07-03",
          },
          {
            title: "根据汇报结果进行方案修改、讨论",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "根据汇报的结果修改方案",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-15",
          },
          {
            title: "建设方案宣讲（跨部门讨论）",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "组内宣讲讨论",
            planStartStr: "2026-07-15",
            planEndStr: "2026-07-15",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-15",
          },
          {
            title: "根据各部门意见进行方案修改、汇报",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "根据发展中心意见修改",
            planStartStr: "2026-07-17",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-17",
            actualEndStr: "2026-07-22",
          },
          {
            title: "数据资产服务平台建设方案评审",
            projectOrVersion: "数据资产服务平台建设",
            sdlcNode: null,
            executorName: "梁冬雪",
            description: "述职会议评审",
            planStartStr: "2026-07-23",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-23",
            actualEndStr: "2026-07-23",
          },
        ],
      },
      {
        title: "消息增加业务助手需求",
        projectOrVersion: "数字化管理系统v1.6.10",
        sdlcNode: null,
        executorName: "梁冬雪",
        description: "消息业务助手需求",
        planStartStr: "2026-07-24",
        planEndStr: "2026-08-14",
        actualStartStr: null,
        actualEndStr: null,
      },
      {
        title: "考勤管理应用优化功能产品设计",
        projectOrVersion: "考勤管理应用优化功能产品设计",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "李婷婷",
        children: [
          {
            title: "优化功能点包括：1.之前版本中测试出的延期...",
            projectOrVersion: "考勤管理应用优化功能产品设计",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "李婷婷",
            description: "优化功能点包...",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-01",
            actualEndStr: null,
          },
          {
            title: "整理待优化的考勤管理问题",
            projectOrVersion: "考勤管理应用优化功能产品设计",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "李婷婷",
            description: "包括之前用户...",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-14",
            actualEndStr: "2026-07-20",
          },
          {
            title: "考勤管理优化原型设计",
            projectOrVersion: "考勤管理应用优化功能产品设计",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "李婷婷",
            description: "对待优化的功...",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-20",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-24",
          },
          {
            title: "考勤管理V1.0.0原型设计和需求文档修改",
            projectOrVersion: "考勤管理应用优化功能产品设计",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "李婷婷",
            description: "将线上的功能...",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-15",
            actualEndStr: "2026-07-21",
          },
        ],
      },
      {
        title: "功能点包括：1. 离线推送通知；2. 日志的评...",
        projectOrVersion: "大陆通App优化功能产品设计",
        sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
        executorName: "李婷婷",
        description: "功能点包括：...",
        planStartStr: "2026-07-20",
        planEndStr: "2026-07-31",
        actualStartStr: null,
        actualEndStr: null,
      },
      {
        title: "排班、员工花名册、工云学堂清分等客户需求...",
        projectOrVersion: "需求跟进",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "李婷婷",
        description: "排班、员工花...",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-31",
        actualStartStr: "2026-07-01",
        actualEndStr: null,
      },
      {
        title: "根据竞品和初步确定的市场需求进行绘制，后...",
        projectOrVersion: "排班绘制的需求文档",
        sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
        executorName: "李婷婷",
        description: "根据竞品和初...",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-03",
        actualStartStr: "2026-07-01",
        actualEndStr: null,
      },
      {
        title: "考勤管理长夜班（跨天）",
        projectOrVersion: "考勤管理长夜班（跨天）",
        sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
        executorName: "陈鹏飞",
        allExecutors: "陈鹏飞, 吴伟, 王高山",
        description: "考勤管理打卡...",
        planStartStr: "2026-07-01",
        planEndStr: "2026-07-02",
        actualStartStr: "2026-07-01",
        actualEndStr: "2026-07-02",
      },
      {
        title: "权限控制公共能力",
        projectOrVersion: "数字化管理系统-权限控制公共服务...",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "会议讨论",
            projectOrVersion: "数字化管理系统-权限控制公共服务...",
            sdlcNode: null,
            executorName: "陈鹏飞",
            description: "方案可行性",
            planStartStr: "2026-07-03",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-03",
            actualEndStr: "2026-07-03",
          },
          {
            title: "数字化管理系统端工作量评估",
            projectOrVersion: "数字化管理系统-权限控制公共服务...",
            sdlcNode: null,
            executorName: "陈鹏飞",
            description: "数字化管理系统...",
            planStartStr: "2026-07-03",
            planEndStr: "2026-07-03",
            actualStartStr: "2026-07-03",
            actualEndStr: "2026-07-03",
          },
        ],
      },
      {
        title: "烟台数字化转型",
        projectOrVersion: "烟台数字化转型",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "烟台数字化转型",
            projectOrVersion: "烟台数字化转型",
            sdlcNode: null,
            executorName: "陈鹏飞",
            description: "烟台数字化转...",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-09",
          },
          {
            title: "烟台数字化管理系统维护",
            projectOrVersion: "烟台数字化转型",
            sdlcNode: null,
            executorName: "陈鹏飞",
            description: "烟台数字化管...",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-13",
          },
        ],
      },
      {
        title: "考勤管理需求",
        projectOrVersion: "考勤管理v1.1.1",
        sdlcNode: null,
        executorName: "李婷婷",
        children: [
          {
            title: "前后端代码编写",
            projectOrVersion: "考勤管理v1.1.1",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "吴伟",
            allExecutors: "吴伟, 王高山, 陈鹏飞",
            description: "1.加班支持结...",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-06",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-06",
          },
          {
            title: "提测、修改提测bug",
            projectOrVersion: "考勤管理v1.1.1",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "吴伟",
            allExecutors: "吴伟, 王高山, 陈鹏飞, 杨含笑",
            description: "提测+修改bug...",
            planStartStr: "2026-07-06",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-07",
            actualEndStr: "2026-07-09",
          },
          {
            title: "发版上线",
            projectOrVersion: "考勤管理v1.1.1",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "吴伟",
            allExecutors: "吴伟, 王高山, 陈鹏飞, 杨含笑",
            description: "发版上线",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-09",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-09",
          },
        ],
      },
      {
        title: "考勤管理跨天需求",
        projectOrVersion: "考勤管理v1.2.0",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "考勤跨天班次原型设计和需求文档",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "李婷婷",
            description: "设计跨天班次...",
            planStartStr: "2026-07-01",
            planEndStr: "2026-07-10",
            actualStartStr: "2026-07-06",
            actualEndStr: "2026-07-10",
          },
          {
            title: "考勤管理跨天需求内部讨论会",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 李婷婷, 张涛（前端）, 张国栋, 吴伟, 杨含笑",
            description: "讨论跨天需求...",
            planStartStr: "2026-07-08",
            planEndStr: "2026-07-08",
            actualStartStr: "2026-07-08",
            actualEndStr: "2026-07-08",
          },
          {
            title: "考勤管理跨天需求宣讲",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "李婷婷",
            description: "考勤管理跨天...",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-09",
            actualStartStr: "2026-07-09",
            actualEndStr: "2026-07-09",
          },
          {
            title: "需求设计、详设编写",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "根据需求进行...",
            planStartStr: "2026-07-09",
            planEndStr: "2026-07-17",
            actualStartStr: "2026-07-09",
            actualEndStr: null,
          },
          {
            title: "后端接口开发",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "编写考勤管理...",
            planStartStr: "2026-07-27",
            planEndStr: "2026-08-07",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "前后端联调",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "前后端联调",
            planStartStr: "2026-08-10",
            planEndStr: "2026-08-12",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "内测",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "内测",
            planStartStr: "2026-08-12",
            planEndStr: "2026-08-14",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "提测+修改提测bug",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "提测+修改提...",
            planStartStr: "2026-08-14",
            planEndStr: "2026-08-14",
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "发版上线",
            projectOrVersion: "考勤管理v1.2.0",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "新版本发版上线",
            planStartStr: "2026-08-31",
            planEndStr: "2026-08-31",
            actualStartStr: "2026-08-31",
            actualEndStr: "2026-08-31",
          },
        ],
      },
      {
        title: "维护",
        projectOrVersion: "大陆通表单",
        sdlcNode: null,
        executorName: "陈鹏飞",
        description: "张辉张总反馈...",
        planStartStr: "2026-07-08",
        planEndStr: "2026-07-08",
        actualStartStr: "2026-07-08",
        actualEndStr: "2026-07-08",
      },
      {
        title: "日志管理AI赋能",
        projectOrVersion: "AI日志管理",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "需求宣讲、相关问题讨论以及对接",
            projectOrVersion: "AI日志管理",
            sdlcNode: null,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 杨含笑, 梁冬雪",
            description: "参加需求宣讲...",
            planStartStr: "2026-07-13",
            planEndStr: "2026-07-13",
            actualStartStr: "2026-07-13",
            actualEndStr: "2026-07-13",
          },
        ],
      },
      {
        title: "1.数字化管理系统（企业端）增加邀请成员 2.日...",
        projectOrVersion: "数字化管理系统v1.6.9",
        sdlcNode: null,
        executorName: "梁冬雪",
        children: [
          {
            title: "原型设计、需求编写",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "梁冬雪",
            description: "原型设计、需...",
            planStartStr: "2026-07-16",
            planEndStr: "2026-07-21",
            actualStartStr: "2026-07-16",
            actualEndStr: "2026-07-21",
          },
          {
            title: "需求宣讲",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "梁冬雪",
            description: "需求宣讲",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-22",
          },
          {
            title: "详设编写",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "需求设计、详...",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-22",
          },
          {
            title: "详设宣讲",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "陈鹏飞",
            description: "详设宣讲",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-22",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-22",
          },
          {
            title: "前端代码编写",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "张涛（前端）",
            allExecutors: "张涛（前端）, 王高山",
            description: "前端代码编写",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-23",
          },
          {
            title: "后端代码编写",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "后端代码编写",
            planStartStr: "2026-07-22",
            planEndStr: "2026-07-23",
            actualStartStr: "2026-07-22",
            actualEndStr: "2026-07-23",
          },
          {
            title: "前后端联调、内测",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山",
            description: "前后端联调+...",
            planStartStr: "2026-07-24",
            planEndStr: "2026-07-24",
            actualStartStr: "2026-07-24",
            actualEndStr: "2026-07-24",
          },
          {
            title: "提测、修改提测bug",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.TESTING,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "提测+修改bug...",
            planStartStr: "2026-07-24",
            planEndStr: "2026-07-25",
            actualStartStr: "2026-07-24",
            actualEndStr: "2026-07-25",
          },
          {
            title: "发版上线",
            projectOrVersion: "数字化管理系统v1.6.9",
            sdlcNode: ManagedTaskSdlcNode.RELEASE,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张涛（前端）, 张国栋, 吴伟, 王高山, 杨含笑",
            description: "发版上线",
            planStartStr: "2026-07-25",
            planEndStr: "2026-07-25",
            actualStartStr: "2026-07-25",
            actualEndStr: "2026-07-25",
          },
        ],
      },
      {
        title: "自然人数字化系统APP建设",
        projectOrVersion: "自然人数字化系统APP建设",
        sdlcNode: null,
        executorName: "陈鹏飞",
        children: [
          {
            title: "原型设计和需求文档修改",
            projectOrVersion: "自然人数字化系统APP建设",
            sdlcNode: ManagedTaskSdlcNode.SOLUTION_DESIGN,
            executorName: "李婷婷",
            description: "根据本期上线...",
            planStartStr: "2026-07-27",
            planEndStr: "2026-07-27",
            actualStartStr: "2026-07-23",
            actualEndStr: "2026-07-24",
          },
          {
            title: "需求宣讲",
            projectOrVersion: "自然人数字化系统APP建设",
            sdlcNode: ManagedTaskSdlcNode.REQUIREMENT_ANALYSIS,
            executorName: "李婷婷",
            description: "需求宣讲，确...",
            planStartStr: null,
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "前端研发",
            projectOrVersion: "自然人数字化系统APP建设",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "张涛（前端）",
            allExecutors: "张涛（前端）, 王高山",
            description: "前端研发",
            planStartStr: "2026-07-27",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
          {
            title: "后端接口研发",
            projectOrVersion: "自然人数字化系统APP建设",
            sdlcNode: ManagedTaskSdlcNode.DEVELOPMENT,
            executorName: "陈鹏飞",
            allExecutors: "陈鹏飞, 张国栋, 吴伟",
            description: "根据前端提供...",
            planStartStr: "2026-07-27",
            planEndStr: null,
            actualStartStr: null,
            actualEndStr: null,
          },
        ],
      },
    ],
  },
];

async function performRollup(parent: any) {
  if (!parent.children || parent.children.length === 0) return;

  const childStartDates = parent.children
    .map((c: any) => c.planStartDate?.getTime())
    .filter((t: any): t is number => typeof t === "number");
  const childEndDates = parent.children
    .map((c: any) => c.planEndDate?.getTime())
    .filter((t: any): t is number => typeof t === "number");

  const childActualStarts = parent.children
    .map((c: any) => c.actualStartAt?.getTime())
    .filter((t: any): t is number => typeof t === "number");
  const childActualFinishes = parent.children
    .map((c: any) => c.actualFinishAt?.getTime())
    .filter((t: any): t is number => typeof t === "number");

  let newPlanStart: Date | null = parent.planStartDate;
  if (childStartDates.length > 0) {
    const minStart = new Date(Math.min(...childStartDates));
    newPlanStart = !newPlanStart || minStart < newPlanStart ? minStart : newPlanStart;
  }

  let newPlanEnd: Date | null = parent.planEndDate;
  if (childEndDates.length > 0) {
    const maxEnd = new Date(Math.max(...childEndDates));
    newPlanEnd = !newPlanEnd || maxEnd > newPlanEnd ? maxEnd : newPlanEnd;
  }

  let newActualStart: Date | null = parent.actualStartAt;
  if (childActualStarts.length > 0) {
    const minActualStart = new Date(Math.min(...childActualStarts));
    newActualStart = !newActualStart || minActualStart < newActualStart ? minActualStart : newActualStart;
  }

  let newActualFinish: Date | null = parent.actualFinishAt;
  const allChildrenFinished = parent.children.every((c: any) => c.actualFinishAt !== null);
  if (allChildrenFinished && childActualFinishes.length > 0) {
    newActualFinish = new Date(Math.max(...childActualFinishes));
  }

  const plannedWorkdays = calcDays(
    newPlanStart ? newPlanStart.toISOString().slice(0, 10) : null,
    newPlanEnd ? newPlanEnd.toISOString().slice(0, 10) : null
  );
  const actualWorkdays = calcDays(
    newActualStart ? newActualStart.toISOString().slice(0, 10) : null,
    newActualFinish ? newActualFinish.toISOString().slice(0, 10) : null
  );

  const totalProgress = parent.children.reduce((acc: number, c: any) => acc + c.progressPercent, 0);
  const progressPercent = Math.round(totalProgress / parent.children.length);

  let status: ManagedTaskStatus = ManagedTaskStatus.TODO;
  if (progressPercent === 100) {
    status = ManagedTaskStatus.DONE;
  } else if (progressPercent > 0 || newActualStart !== null) {
    status = ManagedTaskStatus.IN_PROGRESS;
  }

  await prisma.managedTask.update({
    where: { id: parent.id },
    data: {
      planStartDate: newPlanStart,
      planEndDate: newPlanEnd,
      plannedWorkdays,
      actualStartAt: newActualStart,
      actualFinishAt: newActualFinish,
      actualWorkdays,
      progressPercent,
      status,
    },
  });
}

async function rollupAllTasks() {
  console.log("\n==================================================");
  console.log("=== 正在自底向上上卷计算所有层级任务 (Level 2 & Level 1) 的时间与状态 ===");

  // Pass 1: Rollup Level 2 tasks (from Level 3 children)
  const level2Tasks = await prisma.managedTask.findMany({
    where: { level: 2 },
    include: { children: true },
  });

  for (const parent of level2Tasks) {
    await performRollup(parent);
  }

  // Pass 2: Rollup Level 1 tasks (from Level 2 children)
  const level1Tasks = await prisma.managedTask.findMany({
    where: { level: 1 },
    include: { children: true },
  });

  for (const parent of level1Tasks) {
    await performRollup(parent);
  }

  console.log("🎉 成功上卷更新所有父级容器任务的时间与状态！");
}

async function main() {
  console.log("=== 正在准备按人“父子层级化”全量覆盖同步钉钉任务数据 ===");

  const createdUser = await prisma.user.findFirst({ where: { username: "liujie" } })
    || await prisma.user.findFirst({ where: { isAdmin: true } });
  if (!createdUser) {
    throw new Error("未找到系统的创建人/管理员账号。");
  }

  const users = await prisma.user.findMany();
  const userMap = new Map<string, string>();
  users.forEach((u) => {
    userMap.set(u.name, u.id);
  });

  const getExecutorId = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.includes("巩淼") || trimmed.includes("巩蕊")) return userMap.get("巩蕊") || createdUser.id;
    if (userMap.has(trimmed)) return userMap.get(trimmed)!;
    if (trimmed.includes("李婷婷") && userMap.has("李婷婷")) return userMap.get("李婷婷")!;
    if (trimmed.includes("张涛")) return userMap.get("张涛（后端）") || createdUser.id;
    if (trimmed.includes("分解宇") || trimmed.includes("公解宇")) return userMap.get("公佩宇") || createdUser.id;
    if (trimmed.includes("裴浩然")) return userMap.get("蔡浩然") || createdUser.id;
    return createdUser.id;
  };

  let totalImported = 0;

  for (const group of allGroupsData) {
    const team = await prisma.productLineTeam.findFirst({
      where: { name: { contains: group.teamName } },
    });
    if (!team) {
      console.warn(`⚠️ 未找到团队【${group.teamName}】，跳过此组。`);
      continue;
    }
    console.log(`\n--------------------------------------------------`);
    console.log(`正在处理团队: ${team.name} (ID: ${team.id})`);

    // 1. 清除当前团队下的 ManagedTaskStatusLog 与 ManagedTask
    const existingTasks = await prisma.managedTask.findMany({
      where: { productLineTeamId: team.id },
      select: { id: true },
    });
    const taskIds = existingTasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await prisma.managedTaskStatusLog.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      const { count } = await prisma.managedTask.deleteMany({
        where: { id: { in: taskIds } },
      });
      console.log(`已成功清空【${team.name}】旧任务数据: ${count} 条记录。`);
    } else {
      console.log(`【${team.name}】未发现旧数据，直接写入。`);
    }

    // 2. 写入新数据（父子层级化结构）
    for (const parentRaw of group.tasks) {
      const parentExecutors = extractExecutorNames(parentRaw);
      
      // 单负责人时填入 executorId，多负责人时为 null (原任务去掉负责人)
      let parentExecutorId: string | null = null;
      if (parentExecutors.length === 1) {
        parentExecutorId = getExecutorId(parentExecutors[0]);
      }

      const plannedWorkdays = calcDays(parentRaw.planStartStr || null, parentRaw.planEndStr || null);
      const actualWorkdays = calcDays(parentRaw.actualStartStr || null, parentRaw.actualEndStr || null);

      let status: ManagedTaskStatus = ManagedTaskStatus.TODO;
      let progressPercent = 0;
      if (parentRaw.actualEndStr) {
        status = ManagedTaskStatus.DONE;
        progressPercent = 100;
      } else if (parentRaw.actualStartStr) {
        status = ManagedTaskStatus.IN_PROGRESS;
        progressPercent = 50;
      }

      const notesContent = [
        parentExecutors.length > 1 ? `全员联合负责人: ${parentExecutors.join(", ")}` : null,
        `关联项目: ${parentRaw.projectOrVersion}`,
      ]
        .filter(Boolean)
        .join(" | ");

      // 创建唯一的 Level 1 容器任务
      const parentTask = await prisma.managedTask.create({
        data: {
          title: parentRaw.title,
          level: 1,
          description: parentRaw.description || null,
          productLineTeamId: team.id,
          createdById: createdUser.id,
          executorId: parentExecutorId,
          sdlcNode: parentRaw.sdlcNode,
          status,
          progressPercent,
          planStartDate: parseDate(parentRaw.planStartStr || null),
          planEndDate: parseDate(parentRaw.planEndStr || null),
          plannedWorkdays,
          actualStartAt: parseDate(parentRaw.actualStartStr || null),
          actualFinishAt: parseDate(parentRaw.actualEndStr || null),
          actualWorkdays,
          notes: notesContent,
        },
      });

      totalImported++;
      console.log(`[一级任务容器] ${parentTask.title} (主负责人: ${parentExecutorId ? parentExecutors[0] : "联合团队"})`);

      // 若一级任务存在多负责人，为每位成员在旗下创建二级子任务
      if (parentExecutors.length > 1) {
        for (const pExecName of parentExecutors) {
          const pExecId = getExecutorId(pExecName);
          const subNotes = `全员联合负责人: ${parentExecutors.join(", ")} | 关联项目: ${parentRaw.projectOrVersion}`;
          await prisma.managedTask.create({
            data: {
              title: parentRaw.title,
              level: 2,
              parentId: parentTask.id,
              description: parentRaw.description || null,
              productLineTeamId: team.id,
              createdById: createdUser.id,
              executorId: pExecId,
              sdlcNode: parentRaw.sdlcNode,
              status,
              progressPercent,
              planStartDate: parseDate(parentRaw.planStartStr || null),
              planEndDate: parseDate(parentRaw.planEndStr || null),
              plannedWorkdays,
              actualStartAt: parseDate(parentRaw.actualStartStr || null),
              actualFinishAt: parseDate(parentRaw.actualEndStr || null),
              actualWorkdays,
              notes: subNotes,
            },
          });
          totalImported++;
          console.log(`  └─ [拆分二级任务] ${parentRaw.title} (${pExecName})`);
        }
      }

      // 处理原始二级任务
      if (parentRaw.children && parentRaw.children.length > 0) {
        for (const childRaw of parentRaw.children) {
          const childExecutors = extractExecutorNames(childRaw);

          let childExecutorId: string | null = null;
          if (childExecutors.length === 1) {
            childExecutorId = getExecutorId(childExecutors[0]);
          }

          const childPlannedDays = calcDays(childRaw.planStartStr || null, childRaw.planEndStr || null);
          const childActualDays = calcDays(childRaw.actualStartStr || null, childRaw.actualEndStr || null);

          let childStatus: ManagedTaskStatus = ManagedTaskStatus.TODO;
          let childProgress = 0;
          if (childRaw.actualEndStr) {
            childStatus = ManagedTaskStatus.DONE;
            childProgress = 100;
          } else if (childRaw.actualStartStr) {
            childStatus = ManagedTaskStatus.IN_PROGRESS;
            childProgress = 50;
          }

          const childNotes = [
            childExecutors.length > 1 ? `全员联合负责人: ${childExecutors.join(", ")}` : null,
            `所属项目: ${childRaw.projectOrVersion}`,
          ]
            .filter(Boolean)
            .join(" | ");

          // 创建二级任务容器
          const level2Task = await prisma.managedTask.create({
            data: {
              title: childRaw.title,
              level: 2,
              parentId: parentTask.id,
              description: childRaw.description || null,
              productLineTeamId: team.id,
              createdById: createdUser.id,
              executorId: childExecutorId,
              sdlcNode: childRaw.sdlcNode,
              status: childStatus,
              progressPercent: childProgress,
              planStartDate: parseDate(childRaw.planStartStr || null),
              planEndDate: parseDate(childRaw.planEndStr || null),
              plannedWorkdays: childPlannedDays,
              actualStartAt: parseDate(childRaw.actualStartStr || null),
              actualFinishAt: parseDate(childRaw.actualEndStr || null),
              actualWorkdays: childActualDays,
              notes: childNotes,
            },
          });

          totalImported++;
          console.log(`  └─ [二级任务容器] ${level2Task.title} (主负责人: ${childExecutorId ? childExecutors[0] : "联合团队"})`);

          // 若二级任务存在多负责人，为其在旗下创建三级子任务
          if (childExecutors.length > 1) {
            for (const cExecName of childExecutors) {
              const cExecId = getExecutorId(cExecName);
              const subNotes = `全员联合负责人: ${childExecutors.join(", ")} | 所属项目: ${childRaw.projectOrVersion}`;
              await prisma.managedTask.create({
                data: {
                  title: childRaw.title,
                  level: 3,
                  parentId: level2Task.id,
                  description: childRaw.description || null,
                  productLineTeamId: team.id,
                  createdById: createdUser.id,
                  executorId: cExecId,
                  sdlcNode: childRaw.sdlcNode,
                  status: childStatus,
                  progressPercent: childProgress,
                  planStartDate: parseDate(childRaw.planStartStr || null),
                  planEndDate: parseDate(childRaw.planEndStr || null),
                  plannedWorkdays: childPlannedDays,
                  actualStartAt: parseDate(childRaw.actualStartStr || null),
                  actualFinishAt: parseDate(childRaw.actualEndStr || null),
                  actualWorkdays: childActualDays,
                  notes: subNotes,
                },
              });
              totalImported++;
              console.log(`       └─ [拆分三级任务] ${childRaw.title} (${cExecName})`);
            }
          }
        }
      }
    }
  }

  console.log(`\n🎉 基础层级架构构建完成！累计生成 ${totalImported} 条任务记录。`);

  // 执行自底向上的 Rollup 时间与状态上卷计算
  await rollupAllTasks();
}

main()
  .catch((err) => {
    console.error("导入出错:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
