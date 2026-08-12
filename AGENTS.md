# 鸿信ERP - 项目上下文

## 项目概览

- **项目名称**：鸿信ERP
- **定位**：公司内部员工客户管理系统
- **核心功能**：员工添加客户、录入客户资料、上传微信聊天截图、图片查重、管理员管理员工和团队
- **用户角色**：管理员（admin）、员工（employee）

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                     # 静态资源
├── scripts/                    # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── (auth)/             # 认证页面路由组（无侧边栏）
│   │   │   ├── login/          # 登录页 /login
│   │   │   └── register/       # 注册页 /register
│   │   ├── (admin)/            # 管理员路由组（含侧边栏）
│   │   │   └── admin/
│   │   │       ├── page.tsx            # 管理员工作台 /admin
│   │   │       ├── teams/page.tsx      # 团队管理 /admin/teams
│   │   │       ├── employees/page.tsx  # 员工管理 /admin/employees
│   │   │       └── customers/page.tsx  # 客户管理 /admin/customers
│   │   ├── (employee)/         # 员工路由组（含侧边栏）
│   │   │   └── employee/
│   │   │       ├── page.tsx            # 员工工作台 /employee
│   │   │       ├── customers/page.tsx  # 我的客户 /employee/customers
│   │   │       └── profile/page.tsx    # 个人中心 /employee/profile
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页（重定向到 /login）
│   │   └── globals.css         # 全局样式（Shadcn 主题变量）
│   ├── components/
│   │   ├── ui/                 # Shadcn UI 组件库
│   │   └── layout/             # 布局组件
│   │       ├── app-sidebar.tsx       # 侧边栏导航
│   │       ├── app-header.tsx        # 顶部栏
│   │       ├── stat-card.tsx         # 统计卡片
│   │       └── page-placeholder.tsx  # 页面占位符
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具库
│   │   └── utils.ts            # 通用工具函数 (cn)
│   └── server.ts               # 自定义服务端入口
├── DESIGN.md                   # 设计规范文件
├── next.config.ts              # Next.js 配置
├── package.json                # 项目依赖管理
└── tsconfig.json               # TypeScript 配置
```

## 页面路由

| 路由 | 角色 | 说明 |
|------|------|------|
| `/login` | 通用 | 登录页 |
| `/register` | 通用 | 注册页 |
| `/admin` | 管理员 | 管理员工作台 |
| `/admin/teams` | 管理员 | 团队管理 |
| `/admin/employees` | 管理员 | 员工管理 |
| `/admin/customers` | 管理员 | 客户管理（全部） |
| `/employee` | 员工 | 员工工作台 |
| `/employee/customers` | 员工 | 我的客户 |
| `/employee/profile` | 员工 | 个人中心 |

## 布局结构

- **(auth) 路由组**：居中卡片布局，无侧边栏
- **(admin) 路由组**：左侧侧边栏 + 顶部栏 + 内容区
- **(employee) 路由组**：左侧侧边栏 + 顶部栏 + 内容区
- 侧边栏支持折叠/展开，桌面端默认展开

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 函数参数必须有类型标注

### Hydration 问题防范

1. 严禁在 JSX 中直接使用 `typeof window`、`Date.now()`、`Math.random()` 等动态数据
2. **必须使用 `'use client'` 并配合 `useEffect + useState`**
3. **禁止使用 head 标签**，优先使用 metadata

### UI 规范

- 使用 shadcn/ui 组件库
- 颜色必须使用 CSS 变量（`bg-background`、`text-foreground` 等）
- 禁止硬编码颜色值
- 禁止蓝紫色 AI 风格渐变
- 详见 `DESIGN.md`

## 构建命令

- 开发：`pnpm dev`
- 构建：`pnpm build`
- 启动：`pnpm start`
- 类型检查：`pnpm ts-check`
- 代码检查：`pnpm lint`
