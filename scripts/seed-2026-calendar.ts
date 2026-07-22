import { PrismaClient, WorkCalendarStatus, WorkCalendarDayType } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const holidayList = [
  // 元旦
  { date: "2026-01-01", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "元旦" },
  { date: "2026-01-02", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "元旦" },
  { date: "2026-01-03", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "元旦" },
  { date: "2026-01-04", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "元旦调休上班" },
  
  // 春节
  { date: "2026-02-14", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "春节调休上班" },
  { date: "2026-02-15", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-16", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-17", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-18", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-19", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-20", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-21", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-22", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-23", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "春节" },
  { date: "2026-02-28", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "春节调休上班" },
  
  // 清明节
  { date: "2026-04-04", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "清明节" },
  { date: "2026-04-05", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "清明节" },
  { date: "2026-04-06", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "清明节" },
  
  // 劳动节
  { date: "2026-05-01", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "劳动节" },
  { date: "2026-05-02", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "劳动节" },
  { date: "2026-05-03", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "劳动节" },
  { date: "2026-05-04", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "劳动节" },
  { date: "2026-05-05", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "劳动节" },
  { date: "2026-05-09", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "劳动节调休上班" },
  
  // 端午节
  { date: "2026-06-19", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "端午节" },
  { date: "2026-06-20", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "端午节" },
  { date: "2026-06-21", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "端午节" },
  
  // 中秋节
  { date: "2026-09-25", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "中秋节" },
  { date: "2026-09-26", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "中秋节" },
  { date: "2026-09-27", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "中秋节" },
  
  // 国庆节
  { date: "2026-09-20", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "国庆节调休上班" },
  { date: "2026-10-01", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-02", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-03", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-04", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-05", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-06", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-07", type: WorkCalendarDayType.LEGAL_HOLIDAY, label: "国庆节" },
  { date: "2026-10-10", type: WorkCalendarDayType.ADJUSTED_WORKDAY, label: "国庆节调休上班" },
];

function defaultDayType(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? WorkCalendarDayType.REGULAR_WEEKEND : WorkCalendarDayType.REGULAR_WORKDAY;
}

async function main() {
  const year = 2026;
  console.log(`开始初始化 ${year} 年工作日历...`);
  
  // Check if calendar exists
  const existing = await prisma.workCalendarYear.findFirst({
    where: { year, productLineTeamId: null },
    select: { id: true },
  });
  
  await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.workCalendarYear.update({
          where: { id: existing.id },
          data: { status: WorkCalendarStatus.PUBLISHED, standardHours: 8, publishedAt: new Date() },
        })
      : await tx.workCalendarYear.create({
          data: { year, productLineTeamId: null, status: WorkCalendarStatus.PUBLISHED, standardHours: 8, publishedAt: new Date() },
        });
        
    await tx.workCalendarDay.deleteMany({ where: { calendarYearId: saved.id } });
    
    await tx.workCalendarDay.createMany({
      data: holidayList.map((item) => ({
        calendarYearId: saved.id,
        date: new Date(`${item.date}T00:00:00.000Z`),
        type: item.type,
        standardHours: item.type === WorkCalendarDayType.ADJUSTED_WORKDAY ? 8 : 0,
        label: item.label,
        notes: `2026年法定节假日及调休：${item.label}`,
      })),
    });
    
    console.log(`${year} 年工作日历保存成功，共生成例外天数: ${holidayList.length} 天`);
  });
}

main()
  .catch((e) => {
    console.error("日历初始化失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
