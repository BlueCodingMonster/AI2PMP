import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { versions: { select: { id: true } } },
  });
  if (new Set(products.map((product) => product.name)).size !== products.length) throw new Error("全局产品名称存在重复");
  console.log(JSON.stringify({ products: products.length, versions: products.reduce((sum, product) => sum + product.versions.length, 0) }));
}

main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
