import dotenv from "dotenv";
dotenv.config();

async function runTests() {
  console.log("=== 启动工时计算算法单元测试 ===");

  const { calculateWorkdays } = await import("../src/actions/managed-tasks");
  const { prisma } = await import("../src/lib/prisma");

  // 获取一个有效的团队 ID
  const team = await prisma.productLineTeam.findFirst({ select: { id: true, name: true } });
  if (!team) {
    console.error("未找到任何产品线团队，请先进行初始化。");
    process.exit(1);
  }
  const teamId = team.id;
  console.log(`测试运行使用团队: ${team.name} (ID: ${teamId})`);

  const tests = [
    {
      name: "冬令时单日完整工时：2026-03-10 08:00 至 2026-03-10 17:00",
      start: new Date("2026-03-10T08:00:00"),
      end: new Date("2026-03-10T17:00:00"),
      expected: 1.0,
    },
    {
      name: "夏令时单日完整工时：2026-07-23 08:00 至 2026-07-23 17:30",
      start: new Date("2026-07-23T08:00:00"),
      end: new Date("2026-07-23T17:30:00"),
      expected: 1.0,
    },
    {
      name: "冬令时半天工时：2026-03-10 08:00 至 2026-03-10 12:00",
      start: new Date("2026-03-10T08:00:00"),
      end: new Date("2026-03-10T12:00:00"),
      expected: 0.5,
    },
    {
      name: "夏令时午休时段重叠计算：2026-07-23 12:00 至 2026-07-23 13:30 (午休)",
      start: new Date("2026-07-23T12:00:00"),
      end: new Date("2026-07-23T13:30:00"),
      expected: 0.0,
    },
    {
      name: "夏令时下午半天工时：2026-07-23 13:30 至 2026-07-23 17:30",
      start: new Date("2026-07-23T13:30:00"),
      end: new Date("2026-07-23T17:30:00"),
      expected: 0.5,
    },
    {
      name: "跨越周末计算（普通工作日）：2026-07-23 (周四) 08:00 至 2026-07-27 (周一) 17:30",
      start: new Date("2026-07-23T08:00:00"),
      end: new Date("2026-07-27T17:30:00"),
      expected: 3.0, // 周四、周五、周一各 1 天，周末 0 天
    },
    {
      name: "跨越夏冬令时交替计算：2026-09-30 08:00 (夏) 至 2026-10-08 17:00 (冬)",
      start: new Date("2026-09-30T08:00:00"),
      end: new Date("2026-10-08T17:00:00"),
      expected: 2.0, // 9-30(工作日1天), 10-01~10-07(国庆假期0天), 10-08(工作日1天)
    },
  ];

  let passed = 0;
  for (const t of tests) {
    const result = await calculateWorkdays(t.start, t.end, teamId);
    if (result === t.expected) {
      console.log(`✅ [通过] ${t.name} -> 计算值: ${result}, 期望值: ${t.expected}`);
      passed++;
    } else {
      console.error(`❌ [失败] ${t.name} -> 计算值: ${result}, 期望值: ${t.expected}`);
    }
  }

  console.log(`\n测试统计: 共运行 ${tests.length} 个测试，通过 ${passed}/${tests.length}`);
  if (passed !== tests.length) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
