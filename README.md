---
alwaysApply: true
---

# ResearchOS Project Rules

## 1. 架构概览 (Architecture)
本项目采用 Monorepo 架构，全栈容器化开发。

### 技术栈 (Tech Stack)
| 模块 | 技术选型 | 备注 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | Next.js 16 (App Router) | 强制使用 Webpack 模式 (`next dev --webpack`) 以支持 Windows 轮询 |
| **核心 (Core)** | React 19, TypeScript 5.x | |
| **UI 系统** | Tailwind CSS v4, Shadcn/UI | |
| **状态管理** | Zustand, React Query | |
| **可视化** | Excalidraw, Draw.io, Framer Motion | |
| **编辑器** | Monaco Editor | |
| **后端 (Backend)** | FastAPI (ASGI), Python 3.12+ | |
| **AI 编排** | LangGraph, LangChain | |
| **数据模型** | SQLModel (Pydantic v2) | |
| **任务队列** | Celery + Redis | |

### 数据与存储 (Data & Storage)
*   **Vector DB**: PostgreSQL + pgvector (RAG 核心)
*   **Graph DB**: Neo4j (知识图谱)
*   **Object Store**: MinIO (S3 Compatible, 存储 PDF/图片)
*   **Cache**: Redis (缓存 & 任务队列)

## 2. 目录结构 (Directory Structure)
```bash
research-os/
├── apps/
│   ├── web/                # [Frontend] Next.js 16 科研门户 (端口: 3000)
│   ├── api/                # [Backend] FastAPI 智能体编排服务 (端口: 8000)
│   └── third-party/        # [Sidecar] Overleaf, Code-Server
├── packages/               # 共享 TypeScript 库 (Monorepo)
│   └── types/              # 前后端共享类型定义 (DTOs)
├── docker/                 # 基础设施配置
│   ├── gateway/            # Nginx 网关配置 (端口: 80)
│   └── sandbox/            # Paper2Code 代码执行沙箱
├── turbo.json              # Turbo 构建缓存配置
├── pnpm-workspace.yaml     # Pnpm 工作区定义
└── docker-compose.yml      # 核心编排文件
```

## 3. 开发环境规则 (Development Environment)
**核心原则：纯 Docker 开发模式 (Pure Docker Development)**

1.  **代码位置**：源码保留在宿主机 (Windows)，通过 Volume 挂载进入容器。
2.  **运行环境**：本地环境仅用于开发辅助（代码提示、类型检查），**请勿**在本地启动服务（如 `npm run dev`），以免与 Docker 容器发生端口冲突或因环境差异导致错误。所有服务应通过 `docker-compose up` 启动。
3.  **依赖管理**：
    *   **本地 (Windows)**: 仅需安装 `pnpm install` 用于 VS Code 智能提示（IntelliSense），**不要**用它来运行。
    *   **容器内 (Runtime)**: 真实的运行时依赖由 Dockerfile 管理。
    *   **添加依赖**:
        *   前端: `docker compose exec web pnpm add [package]`
        *   后端: `docker compose exec api poetry add [package]`
4.  **热更新 (Hot Reload)**:
    *   前端强制开启 `WATCHPACK_POLLING=true` (或在 next.config.ts 中配置 poll)，以解决 Windows 文件系统通知失效问题。
    *   后端使用 `uvicorn --reload`。
5.  **类型共享**:
    *   修改 `packages/types` 后，前端会自动检测变化。

## 4. 常用命令 (Commands)
*   **启动全栈**: `docker-compose up -d`
*   **查看日志**: `docker-compose logs -f [web|api]`
*   **重启服务**: `docker-compose restart [service_name]`
*   **进入容器**: `docker compose exec [service_name] bash`
*   **清理缓存**: `docker-compose down -v` (慎用，会清空数据库)
