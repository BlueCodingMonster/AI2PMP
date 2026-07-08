/* eslint-disable @typescript-eslint/no-unused-vars */
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

/**
 * next-auth 模块类型扩展
 * 扩展默认的 Session / User / JWT 类型，添加自定义字段
 * 这样在使用 auth() / useSession() 时能获得完整的类型提示
 */
declare module "next-auth" {
  interface Session {
    user: {
      /** 用户数据库 ID */
      id: string;
      /** 登录名 */
      username: string;
      /** 是否为管理员 */
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    /** 登录名 */
    username: string;
    /** 是否为管理员 */
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    /** 用户数据库 ID */
    id: string;
    /** 登录名 */
    username: string;
    /** 是否为管理员 */
    isAdmin: boolean;
  }
}
