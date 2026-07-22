/**
 * 全局类型定义和模块扩展
 * 本文件集中管理项目级别的类型声明
 */

// ===== 用户角色相关类型 =====

/** 项目成员角色 */
export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

/** 优先级 */
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** 项目状态 */
export type ProjectStatus = "CONTRACT_SIGNED" | "IMPLEMENTING" | "ACCEPTANCE" | "ARCHIVED";

// ===== 通用响应类型 =====

/** Server Action 成功响应 */
export type ActionSuccess<T = void> = T extends void
  ? { success: true }
  : { success: true; data: T };

/** Server Action 失败响应 */
export type ActionError = { success: false; error: string };

/** Server Action 统一响应类型 */
export type ActionResult<T = void> = ActionSuccess<T> | ActionError;
