---
name: SDLC 品牌重塑设计
description: 将系统从 AI2PmP 更名为 SDLC，更新品牌标识与系统图标
---

# SDLC · 研发效能平台 — 品牌设计

## 背景

原系统名称为 `AI2PmP`（AI2 Project management Platform），含义不够直观，记忆成本高。决定更名为 **SDLC**（Software Development Life Cycle），中文全称 **"研发效能平台"**，准确传达系统定位——覆盖软件开发全生命周期的效能管理工具。

## 命名

| 项目 | 内容 |
|------|------|
| 主标 | **SDLC** |
| 副标 | **研发效能平台** |
| 完整标题 | **SDLC · 研发效能平台** |
| 旧名 | AI2PmP |

## 图标设计

### 设计思路

采用 **抽象几何** 风格，以 **莫比乌斯环（Möbius Strip）** 为核心意象。莫比乌斯环只有一个面、一条边界，在360度环绕中产生一次"扭转"——完美象征 SDLC 所代表的软件开发全生命周期中，**需求→开发→测试→交付→运维**各阶段之间没有明确的起点和终点，连续流转、持续演进、质变跃迁的核心理念。

### 图标构成

```
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │  ┌──扭转段──┐    │ │  ← 后端不可见路径（透明度0.2，模拟纵深）
│ │  └──主视面──┘    │ │  ← 前端可见路径（含渐变，从左到右下贯穿）
│ │    高光亮边       │ │  ← 平移偏移的细线，增强立体感
│ └─────────────────┘ │
└─────────────────────┘
        底板圆角方框
```

| 元素 | 含义 |
|------|------|
| 圆角方框底板（透明度0.1） | 系统框架与边界 |
| 后端路径（透明度0.2） | 莫比乌斯环绕到后方的不可见部分，模拟纵深立体感 |
| 前端主路径（4px 渐变描边） | 莫比乌斯环的主视面，从左上到右下贯穿，包含一次完整的空间扭转 |
| 高光偏移路径（1.2px） | 平移 -1.5px 的半透明细线，模拟材质光泽，增强 3D 质感 |
| 配色 | indigo 渐变（#c7d2fe → #a5b4fc → #818cf8 → #6366f1） |

### 配色

- 图标主色：`#818cf8`（indigo-400）
- 中心节点：`#a5b4fc`（indigo-300）
- 背景渐变：from-indigo-500 to-purple-600（与侧边栏品牌容器一致）

## Favicon

使用 SVG favicon 而非 .ico 文件，以支持深色主题和高分辨率显示。`public/favicon.svg` 包含完整图标。

## 变更清单

已完成以下文件的品牌替换：

### 页面标题与描述

- `src/app/layout.tsx` — 根布局 metadata
- `src/app/(dashboard)/layout.tsx` — 仪表盘布局
- `src/app/(dashboard)/page.tsx` — 仪表盘欢迎文字
- `src/app/(dashboard)/team/page.tsx`
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/(dashboard)/work-calendar/page.tsx`
- `src/app/(dashboard)/product-catalog/page.tsx`
- `src/app/(dashboard)/product-lines/page.tsx`

### 前端组件

- `src/components/layout/dashboard-layout-client.tsx` — 侧边栏品牌区域（图标 + SDLC + 副标题）
- `src/app/(auth)/login/page.tsx` — 登录页品牌区
- `src/app/(auth)/register/page.tsx` — 注册页品牌区

### 新文件

- `src/components/ui/sdlc-icon.tsx` — 可复用无限环 SVG 图标组件
- `public/favicon.svg` — SVG favicon
