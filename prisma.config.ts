// Prisma v7 配置文件
// 数据库连接 URL 从 schema.prisma 移至此处
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // schema 文件路径
  schema: "prisma/schema.prisma",

  // 迁移文件目录
  migrations: {
    path: "prisma/migrations",
  },

  // 数据源配置
  datasource: {
    url: env("DATABASE_URL"),
  },
});
