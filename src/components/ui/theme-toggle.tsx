"use client";

import { useTheme } from "@/providers/theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? "切换为浅色主题" : "切换为深色主题"}
      aria-label={isDark ? "切换为浅色主题" : "切换为深色主题"}
      className={`
        relative inline-flex h-9 w-9 items-center justify-center rounded-xl
        border border-border bg-card text-foreground
        shadow-sm hover:border-primary/50 hover:bg-muted/50
        transition-all duration-300 active:scale-95 focus:outline-none
        ${className}
      `}
    >
      <Sun
        className={`h-4.5 w-4.5 text-amber-500 transition-all duration-300 transform ${
          isDark ? "rotate-90 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`h-4.5 w-4.5 text-indigo-400 transition-all duration-300 transform ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
    </button>
  );
}
