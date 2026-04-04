# st-card-builder

基于 Astro 5.x 的 SillyTavern V3 角色卡构建工具。纯静态 SPA，零后端依赖，所有数据持久化在浏览器 localStorage 中。

## 功能概览

- **多格式导入** — 自动识别 SillyTavern JSON、Vanilla JSON、独立世界书 JSON、快速回复 QR Bundle、嵌入卡片数据的 PNG 图片
- **世界书编辑** — 条目 CRUD、来源标签筛选（生成/手动/导入）、编辑/预览双模式、键盘导航与快速定位
- **V3 规范全覆盖** — 支持全部高阶参数：触发策略、挂载深度、插入顺序、深度角色、触发概率、互斥组、递归控制等
- **多格式导出** — SillyTavern V3 JSON、Vanilla JSON、嵌入 chara chunk 的 PNG、世界书 Markdown
- **备选开场白** — 多条开场白的增删改与排序
- **状态栏定义** — 对应 `statusBlockConfig` 和 `presetStatusBlock` 的可视化编辑
- **多草稿箱** — 自动静默保存，支持在多个角色卡之间切换
- **主题切换** — 深色/浅色主题，偏好持久化
- **视觉效果** — GSAP 入场动画、面板 Hover 追光、环境浮光球、Canvas 粒子背景

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Astro 5.x（纯静态 SPA 输出） |
| 脚本 | TypeScript（Vite 打包） |
| 状态管理 | nanostores |
| 动画 | GSAP |
| 构建 | Vite（Astro 内置） |

## 项目结构

```
src/
├── layouts/
│   └── Layout.astro          # HTML 骨架、主题检测、全局样式导入
├── pages/
│   └── index.astro           # 单页面入口，主应用逻辑
├── components/
│   ├── AppHeader.astro       # 页头（Logo + 标题 + 主题切换）
│   ├── WorkspaceNav.astro    # 工作区标签导航
│   ├── ImportExportCenter.astro  # 导入导出面板
│   ├── CharacterPanel.astro  # 角色设定 + 草稿箱 + 备选开场白
│   ├── WorldbookPanel.astro  # 世界书编辑器 UI
│   ├── StatusBarPanel.astro  # 状态栏定义面板
│   ├── ParticleCanvas.astro  # Canvas 粒子背景
│   └── GsapAnimations.astro  # GSAP 动画编排
├── scripts/
│   ├── utils/
│   │   ├── escape-html.ts    # HTML 转义
│   │   ├── safe-int.ts       # 安全整数解析
│   │   └── png-chunk.ts      # PNG tEXt chunk 读写
│   ├── worldbook/
│   │   ├── normalize.ts      # 世界书条目标准化
│   │   └── import.ts         # 世界书 JSON 解析与条目提取
│   ├── card-normalize.ts     # 角色卡 JSON 标准化
│   ├── worldbook-helpers.ts  # 世界书辅助函数（标签、标题清理、Markdown 导出）
│   ├── json-generate.ts      # SillyTavern / Vanilla JSON 导出生成
│   ├── field-dict.ts         # V3 字段注释字典与校验
│   ├── workspace-tabs.ts     # 工作区标签切换
│   ├── alt-greetings.ts      # 备选开场白管理
│   ├── status-bar.ts         # 状态栏面板逻辑
│   ├── particle-canvas.ts    # 粒子动画
│   └── gsap-animations.ts    # GSAP 编排中心
├── stores/
│   └── card-store.ts         # nanostores 共享状态（atoms + save handler）
├── styles/
│   ├── tokens.css            # CSS 设计令牌（颜色、间距、圆角）
│   ├── global.css            # 深色主题默认样式
│   └── theme-light.css       # 浅色主题覆盖
└── types/
    ├── worldbook.ts          # WorldbookEntry 等接口
    ├── character-card.ts     # SillyTavernCard、ImportedCardMeta 等
    ├── draft.ts              # DraftData、StatusBarData
    └── index.ts              # 类型统一导出
```

## 快速开始

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建（输出到 dist/）
npm run preview  # 预览生产构建
```

需要 Node.js 18+。

## 架构说明

### 脚本处理

组件使用 Astro 处理过的 `<script>` 标签（自动获得 TypeScript 编译、模块打包、去重）。仅 Layout.astro 保留 3 处 `<script is:inline>` 用于主题防闪烁和底层 DOM 增强。

### 状态管理

跨组件共享状态通过 `src/stores/card-store.ts` 中的 nanostores atoms 实现：

- `altGreetings` — 备选开场白列表
- `importedCardMeta` — 导入的角色卡元数据
- `importedWorldbookMeta` — 导入的世界书元数据
- `statusBarData` — 状态栏数据
- `worldbookEntries` / `regexScripts` / `tavernHelperScripts` — 世界书条目与脚本

各组件脚本直接 import atoms 进行读写，无需 `window` 全局变量中转。

### CSS 架构

- `tokens.css` 定义 CSS 自定义属性（颜色、间距、阴影等），通过 `html[data-theme]` 切换深/浅色
- `global.css` 包含深色主题下的所有组件默认样式
- `theme-light.css` 通过令牌覆盖实现浅色主题
- 组件级样式使用 `is:global` 以支持跨组件 DOM 操作场景

## 支持的导入格式

| 格式 | 识别方式 |
|------|---------|
| SillyTavern V3 角色卡 | `spec: "chara_card_v3"` 或含 `data.first_mes` 等字段 |
| Vanilla 角色卡 | 顶层 `first_mes` / `creator_notes` 等字段 |
| 独立世界书 JSON | 含 `entries` 但无角色卡特征字段 |
| 快速回复 QR Bundle | 含 `qrList` 数组 |
| PNG 角色卡 | 文件中嵌入 `tEXt` chunk（keyword: `chara`） |
| PNG 纯头像 | 无 chara chunk 的 PNG 图片 |

## 导出格式

| 格式 | 说明 |
|------|------|
| SillyTavern V3 JSON | `chara_card_v3` 规范完整输出 |
| Vanilla JSON | 去除 V3 包装层的扁平格式 |
| PNG 卡片 | 在头像 PNG 中嵌入 chara tEXt chunk |
| 世界书 Markdown | 纯文本词条列表，适用于分享和审阅 |

## License

MIT
