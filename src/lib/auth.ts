import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

/**
 * 完整的 Auth.js v5 配置
 * - 继承自 edge-compatible 的 authConfig
 * - 添加本地数据库验证（Credentials 提供商）
 * - 自定义回调注入 id / isAdmin 到 token 和 session
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "登录名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = String(credentials.username).trim().toLowerCase();
        const password = credentials.password as string;

        // 根据登录名查找用户
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.password || !user.isActive) {
          return null;
        }

        // 使用 bcrypt 比较密码
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // 返回用户信息（会传入 jwt 回调）
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    
    /**
     * JWT 回调：将用户的 id 和 isAdmin 写入 JWT token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.username = (user as { username?: string }).username ?? "";
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },

    /**
     * Session 回调：将 token 中的 id 和 isAdmin 同步到 session.user
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
