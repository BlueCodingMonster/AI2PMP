import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js 配置
 * 仅包含可以在 Edge 运行时（Middleware）执行的配置项。
 * 绝不能导入 Prisma 或任何数据库相关的包。
 */
export const authConfig = {
  providers: [], // 具体的提供商（如 Credentials）在 full auth.ts 中配置，以避免 Edge 不兼容问题
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 默认的授权判断：仅返回 true 放行，由自定义的 middleware 逻辑进行路由阻断
    authorized({ auth }) {
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
