import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// 公开路由列表 —— 无需登录即可访问
const publicRoutes = ["/login", "/register"];

// 认证路由 —— 已登录用户不应再访问这些页面
const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const pathname = nextUrl.pathname;

  // 判断当前路径是否为公开路由
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 判断当前路径是否为认证相关路由
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // API 认证路由始终放行（Auth.js 内部处理）
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 已登录用户访问登录/注册页 → 重定向到首页
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // 未登录用户访问受保护路由 → 重定向到登录页
  if (!isAuthenticated && !isPublicRoute) {
    // 将原始路径作为 callbackUrl，登录后可跳回
    const callbackUrl = encodeURIComponent(pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  return NextResponse.next();
});

/**
 * 中间件匹配规则
 * 排除静态资源、图片、favicon 等不需要认证检查的路径
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，排除以下开头的路径：
     * - _next/static（静态资源）
     * - _next/image（图片优化）
     * - favicon.ico（网站图标）
     * - 常见静态文件扩展名
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
