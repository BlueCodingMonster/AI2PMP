import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 合并 CSS 类名工具
 * 使用 clsx 处理条件类名 + tailwind-merge 解决 Tailwind 类冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期为中文可读格式
 * @param date - 日期对象或字符串
 * @param formatStr - date-fns 格式字符串，默认 "yyyy年MM月dd日"
 */
export function formatDate(
  date: Date | string,
  formatStr: string = "yyyy年MM月dd日"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr, { locale: zhCN });
}

/**
 * 格式化相对时间（如 "3分钟前"、"2天前"）
 * @param date - 日期对象或字符串
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

/**
 * 生成唯一 ID
 * 使用 crypto.randomUUID()，兼容 Node.js 和现代浏览器
 */
export function generateId(): string {
  return crypto.randomUUID();
}
