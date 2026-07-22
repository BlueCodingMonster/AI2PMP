import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
const projects = await prisma.project.findMany({
  where: { OR: [{ customerName: "" }, { projectManagerId: null }] },
  select: { id: true, createdById: true, customerName: true, projectManagerId: true },
});

for (const project of projects) {
  await prisma.project.update({
    where: { id: project.id },
    data: {
      customerName: project.customerName || "待补充",
      projectManagerId: project.projectManagerId || project.createdById,
    },
  });
}

console.log(JSON.stringify({ updated: projects.length }));
}

main().finally(() => prisma.$disconnect());
