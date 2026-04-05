# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

st-card-builder 是一个基于 Astro 5.x 的 SillyTavern V3 角色卡构建工具。纯静态 SPA，零后端，所有数据持久化在浏览器 localStorage 中。面向中文用户。

## Commands

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器 (默认 http://localhost:4321)
npm run build     # 生产构建 → dist/
npm run preview   # 预览生产构建
```

需要 Node.js 18+。无测试框架、无 lint 配置。

## Tech Stack

- **Astro 5.x** — 静态 SPA 框架（非 SSR）
- **TypeScript** — 通过 Vite 编译，Astro 自动处理组件内 `<script>` 的 TS 编译和模块打包
- **nanostores** — 轻量响应式状态管理
- **GSAP** — 动画（通过 CDN 全局加载，非 npm 依赖）
- **自定义 CSS** — 基于 CSS 自定义属性的令牌系统，无 UI 框架

## Architecture

### 单页面结构

整个应用只有一个页面 `src/pages/index.astro`，通过 `data-workspace-section` 属性切换"核心设置"和"世界书"两个工作区标签页。

### 关键架构决策

**index.astro 中的巨型内联脚本**：`src/pages/index.astro` 包含约 1600 行的内联 `<script>` 代码，承担了绝大部分应用逻辑（草稿管理、导入导出、世界书 CRUD、PNG 处理、预览系统）。这是有意为之的设计——所有逻辑在单个作用域内共享 DOM 引用和状态变量，避免跨组件通信复杂度。

**window 全局桥接**：由于 Astro 组件的 `<script>` 标签被独立打包，组件间通信通过 `window` 全局函数实现。关键接口：
- `window.applyJSONFromEditor(json)` — 导入角色卡
- `window.__setImportedAvatar__(src, skipCommit, base64)` — 设置头像
- `window.__getWorldbookEntries__()` — 获取世界书条目
- `window.__injectMvuEntries__(entries, regexScripts)` — 批量注入世界书条目
- `window.exportCardByFormat(format)` — 按格式导出
- `window.triggerGlobalUpdate()` — 触发全局保存

**nanostores + 局部变量并存**：`src/stores/card-store.ts` 导出 atoms 供 Astro 组件脚本 import 使用，但 index.astro 中的主逻辑同时维护局部变量（如 `worldbookEntries` 数组）和 store atoms，通过手动同步。

### 脚本处理

Astro 组件中的 `<script>` 默认被 Astro 处理（TS 编译、模块打包、去重）。仅 `Layout.astro` 中有 3 处 `<script is:inline>` 用于主题防闪烁和底层 DOM 增强，这些不会被 Astro 处理。

### 数据流

```
用户输入 → DOM 表单字段 → 局部变量 + nanostores atoms → debounced 500ms → localStorage
                                              ↓
                                    PNG/JSON 导出时从 DOM + 局部变量构建 ExportContext
```

### Import/Export 系统

**导入**支持：SillyTavern JSON（V3）、Vanilla JSON、独立世界书 JSON、QR Bundle、嵌入 chara chunk 的 PNG。自动识别格式。

**导出**支持：SillyTavern V3 JSON、Vanilla JSON、嵌入 chara tEXt chunk 的 PNG、世界书 Markdown。

核心逻辑分布在：
- `src/scripts/card-normalize.ts` — 角色卡 JSON 标准化
- `src/scripts/json-generate.ts` — JSON 导出生成
- `src/scripts/worldbook/import.ts` — 世界书 JSON 解析
- `src/scripts/worldbook/normalize.ts` — 世界书条目标准化
- `src/scripts/utils/png-chunk.ts` — PNG tEXt chunk 读写

### CSS 架构

三层令牌系统：
- `src/styles/tokens.css` — 设计令牌（颜色、间距、阴影），通过 `html[data-theme]` 切换
- `src/styles/global.css` — 深色主题默认样式
- `src/styles/theme-light.css` — 浅色主题覆盖

组件级样式使用 `is:global` 以支持跨组件 DOM 操作。

### 草稿系统

localStorage 中维护 `st_v3_builder_drafts`（所有草稿）和 `st_v3_builder_current_id`（当前草稿 ID）。每个草稿包含完整的角色卡数据、世界书条目、头像、元数据等。支持多草稿切换、自动保存、删除。

## Key Types

- `WorldbookEntry` (`src/types/worldbook.ts`) — 世界书条目完整字段（~45 个字段）
- `SillyTavernCard` / `CharacterData` (`src/types/character-card.ts`) — V3 角色卡结构
- `ExportedWorldbookEntry` — 导出时的简化世界书条目（字段名用 snake_case）
- `ImportedCardMeta` / `ImportedWorldbookMeta` — 导入时提取的元数据

注意：内部使用 camelCase（`charName`, `scanDepth`），导出到 SillyTavern 格式时转为 snake_case（`name`, `scan_depth`）。
