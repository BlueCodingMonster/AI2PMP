import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
const projects = await prisma.project.findMany({
  include: { versions: true, projectManager: { select: { id: true } } },
});

const invalid = projects.filter((project) => !project.customerName || !project.projectManager);
if (invalid.length) throw new Error(`项目资料不完整: ${invalid.map((item) => item.key).join(", ")}`);

console.log(JSON.stringify({ projects: projects.length, versions: projects.reduce((sum, project) => sum + project.versions.length, 0) }));
}

main().finally(() => prisma.$disconnect());
