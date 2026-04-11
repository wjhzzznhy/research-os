# ResearchOS (ICP - 智协平台)

> AI 驱动的科研协作平台 — 集文献管理、智能阅读、知识图谱、AI 绘图、代码生成、论文写作于一体的全栈科研工作环境。

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [服务架构](#服务架构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [API 概览](#api-概览)
- [AI 工作流](#ai-工作流)
- [数据模型](#数据模型)
- [环境变量](#环境变量)
- [常用命令](#常用命令)

---

## 项目简介

ResearchOS 是一个面向科研人员的 AI 人机协作平台，旨在通过大语言模型与多智能体编排技术，将科研工作流中的核心环节——文献检索、论文阅读、知识管理、创新推演、图表绘制、代码编写、论文写作——整合到统一的交互界面中。

平台采用 **Monorepo + 全容器化** 架构，前端基于 Next.js 16 App Router，后端基于 FastAPI + LangGraph 智能体编排，通过 Nginx 网关统一路由，实现开发与生产环境的一致性。

---

## 核心功能

| 功能模块 | 说明 |
| :--- | :--- |
| **智能阅读** | 上传 PDF 论文，AI 自动解析、分段摘要、支持基于文档的问答 |
| **知识库** | 文档入库 + 向量检索 (pgvector)，支持 RAG 增强问答 |
| **学术检索** | 集成学术搜索工具，支持跨文献知识检索 |
| **文献综述** | 基于多文档的自动综述生成与分析 |
| **创新推演** | Generator-Critic 双智能体架构，推演科研创新点 |
| **AI 绘图** | 集成 Excalidraw + Draw.io，支持自然语言生成图表、图标库管理 |
| **代码生成** | Monaco Editor 在线编辑 + AI 代码生成与审查 |
| **论文写作** | LaTeX 在线编辑 + PDF 预览 + AI 写作辅助 |
| **知识图谱** | ReactFlow 可视化知识关系网络 |
| **项目管理** | 多项目隔离，每个项目独立的知识库与工作空间 |
| **智能记忆** | 多层记忆系统（会话 / 项目 / 用户 / 外部知识），持久化 AI 上下文 |
| **技能系统** | 可插拔的 Skill 执行器，支持自定义工具扩展 |

---

## 技术架构

### 技术栈总览

| 层级 | 技术选型 | 版本 |
| :--- | :--- | :--- |
| **前端框架** | Next.js (App Router, Webpack 模式) | 16.1.0 |
| **核心库** | React, TypeScript | 19.2.3 / 5.x |
| **UI 系统** | Tailwind CSS, Shadcn/UI (Radix), Ant Design | v4 / 最新 |
| **状态管理** | Zustand | 5.x |
| **可视化** | Excalidraw (Vendor), ReactFlow, Framer Motion | — |
| **编辑器** | Monaco Editor | 4.7+ |
| **后端框架** | FastAPI (ASGI) | 0.116+ |
| **运行时** | Python | 3.11 - 3.12 |
| **AI 编排** | LangGraph, LangChain, LangChain-OpenAI/Google | 0.2+ |
| **数据模型** | SQLModel (Pydantic v2) | 0.0.27+ |
| **任务队列** | Celery + Redis | 5.x / 7.2 |
| **PDF 解析** | MinerU (GPU 加速) | — |
| **本地嵌入** | Qwen3 VL Embedding (GPU 加速) | — |
| **包管理** | pnpm (前端), Poetry (后端) | 10.26+ / 2.x |
| **构建工具** | Turbo (Monorepo 缓存) | 2.7+ |

### 数据与存储

| 存储类型 | 技术 | 用途 |
| :--- | :--- | :--- |
| **关系数据库** | PostgreSQL 16 + pgvector | 业务数据 + 向量检索 (RAG) |
| **对象存储** | RustFS (S3 兼容) | PDF / 图片 / 图标 / 资产文件 |
| **缓存 & 队列** | Redis 7.2 | 会话缓存 + Celery Broker |
| **文件解析** | MinerU | PDF 结构化解析 (GPU 加速) |

---

## 目录结构

```
research-os/
├── apps/
│   ├── web/                          # 前端 — Next.js 16 科研门户
│   │   ├── src/
│   │   │   ├── app/                  # App Router 页面
│   │   │   │   ├── (large)/          # 落地页
│   │   │   │   ├── (main)/           # 主功能区
│   │   │   │   │   ├── (pages)/
│   │   │   │   │   │   ├── code/     # 代码生成
│   │   │   │   │   │   ├── drawing/  # AI 绘图
│   │   │   │   │   │   ├── graph/    # 知识图谱
│   │   │   │   │   │   ├── idea/     # 创新推演
│   │   │   │   │   │   ├── knowledge/# 知识库
│   │   │   │   │   │   ├── library/  # 文献综述
│   │   │   │   │   │   ├── reading/  # 智能阅读
│   │   │   │   │   │   ├── resources/# 资源管理
│   │   │   │   │   │   ├── thinking/ # 思维推演
│   │   │   │   │   │   └── writing/  # 论文写作
│   │   │   │   │   └── private/      # 私有页面
│   │   │   │   └── (projects)/       # 项目管理
│   │   │   ├── components/           # UI 组件
│   │   │   │   ├── pages/            # 页面级组件
│   │   │   │   ├── smart-draw/       # 智能绘图组件
│   │   │   │   ├── User/             # 用户组件
│   │   │   │   ├── large/            # 落地页组件
│   │   │   │   └── ui/               # 基础 UI 组件
│   │   │   ├── context/              # React Context
│   │   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── lib/                  # 工具库 & API 客户端
│   │   │   ├── stores/               # Zustand Store
│   │   │   └── types/                # 前端类型定义
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── api/                          # 后端 — FastAPI 智能体编排服务
│   │   ├── app/
│   │   │   ├── application/          # 应用层
│   │   │   │   ├── agent_framework/  # 智能体框架 (BaseGraph, BaseAgent, Compiler)
│   │   │   │   ├── memory/           # 记忆系统
│   │   │   │   │   ├── operations/   # 记忆读写操作
│   │   │   │   │   └── sources/      # 记忆源 (Session/Project/User/External)
│   │   │   │   ├── services/         # 业务服务层
│   │   │   │   │   └── icon/         # 图标嵌入与检索服务
│   │   │   │   └── workflows/        # 预置工作流 (8 种)
│   │   │   ├── core/                 # 核心配置 (DB, Celery, Config, Logger)
│   │   │   ├── domain/               # 领域层
│   │   │   │   ├── models/           # SQLModel 数据模型
│   │   │   │   └── schemas/          # Pydantic 请求/响应模式
│   │   │   ├── prompts/              # Prompt 模板 (中/英)
│   │   │   ├── qa/                   # QA 图 (LangGraph RAG)
│   │   │   ├── repositories/         # 数据访问层
│   │   │   ├── server/               # API 路由 & 中间件
│   │   │   │   ├── api/v1/           # RESTful API v1 (17 个模块)
│   │   │   │   └── middleware/       # 请求追踪中间件
│   │   │   ├── skills/               # 技能执行器 (BaseSkillExecutor)
│   │   │   ├── smart_draw/           # 智能绘图图 (LangGraph)
│   │   │   ├── utils/                # 工具函数
│   │   │   └── workers/              # Celery 异步任务
│   │   ├── scripts/                  # 运维脚本 (init_db, seed_*, cleanup)
│   │   ├── embedding/                # 嵌入模型推理脚本
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   └── drawio/                       # Draw.io 配置
│       └── fonts/                    # 自定义字体目录
│
├── packages/                         # 共享包 (Monorepo)
│   ├── types/                        # @research-os/types — 前后端共享类型
│   ├── sdk/                          # @research-os/sdk — 前端集成 SDK
│   │   ├── src/
│   │   │   ├── api/                  # API 客户端 (knowledge, qa, search, storage...)
│   │   │   ├── components/           # 可复用 UI 组件 (FileUpload, IconPicker...)
│   │   │   ├── hooks/                # React Hooks (useKnowledge, useQA, useSearch...)
│   │   │   └── utils/                # 工具函数 (async, errors, validators)
│   │   └── tsup.config.ts
│   └── vendor/
│       └── excalidraw/               # Excalidraw Vendor (深度定制)
│           └── packages/
│               ├── common/           # 公共工具库
│               ├── element/          # 元素操作库
│               ├── excalidraw/       # 核心画布
│               ├── math/             # 数学工具
│               └── utils/            # 工具函数
│
├── docker/                           # 基础设施配置
│   ├── gateway/
│   │   └── nginx.conf                # Nginx 反向代理配置
│   └── mineru/                       # MinerU PDF 解析服务
│       ├── app/                      # FastAPI 解析服务
│       ├── Dockerfile
│       └── requirements.txt
│
├── models/                           # 本地 AI 模型
│   ├── embedding/                    # Qwen3 VL Embedding 模型
│   └── reranker/                     # Qwen3 VL Reranker 模型
│
├── docs/                             # 开发文档
│   └── dev-docs/                     # Excalidraw 集成文档
│
├── docker-compose.yml                # 开发环境编排
├── docker-compose.prod.yml           # 生产环境编排
├── package.json                      # Monorepo 根配置
└── pnpm-workspace.yaml               # pnpm 工作区定义
```

---

## 服务架构

```
                       ┌─────────────┐
                       │   Browser   │
                       └──────┬──────┘
                              │ :80
                       ┌──────▼──────┐
                       │    Nginx    │  反向代理 & 静态资源缓存
                       │  Gateway    │
                       └──┬───┬───┬─┘
                          │   │   │
               ┌──────────┘   │   └──────────┐
               │              │              │
        ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
        │   Next.js   │ │  FastAPI  │ │   Draw.io   │
        │  Web :3000  │ │ API :8000 │ │  :8080      │
        └─────────────┘ └────┬─────┘ └──────┬──────┘
                              │              │
              ┌───────────────┤              │
              │       │       │              │
       ┌──────▼──┐ ┌─▼────┐ ┌▼──────┐ ┌────▼──────────┐
       │PostgreSQL│ │Redis │ │RustFS │ │Draw.io Export│
       │+pgvector │ │:6379 │ │:9000  │ │   Server     │
       │ :5432   │ │      │ │S3兼容  │ └──────────────┘
       └─────────┘ └──┬───┘ └───────┘
                       │
                ┌──────▼──────┐      ┌──────────────┐
                │   Celery    │      │   MinerU     │
                │   Worker    │      │   :8001      │
                └─────────────┘      │  PDF解析(GPU)│
                                     └──────────────┘
```

### 端口映射

| 服务 | 容器端口 | 宿主机端口 | 说明 |
| :--- | :--- | :--- | :--- |
| Nginx Gateway | 80 | 80 | 统一入口 |
| Next.js Web | 3000 | — (通过 Nginx) | 前端应用 |
| FastAPI API | 8000 | — (通过 Nginx) | 后端 API |
| Draw.io | 8080 / 8443 | — (通过 Nginx) | 在线绘图 (HTTP/HTTPS) |
| Draw.io Export | 8000 | — (内部) | Draw.io 图片导出服务 |
| PostgreSQL | 5432 | 5432 | 数据库 |
| Redis | 6379 | 6379 | 缓存 & 队列 |
| RustFS API | 9000 | 9000 | 对象存储 S3 |
| RustFS Console | 9001 | 9001 | 对象存储管理界面 |
| MinerU | 8001 | — (内部) | PDF 解析 |

### 服务依赖关系

```
web ──────► api ──────► postgres (健康检查)
  │          │──────► redis (健康检查)
  │          │──────► rustfs (健康检查)
  │          │──────► mineru (健康检查)
  │
  └── drawio ──► drawio-image-export

worker ────► api
  │──────► redis
  │──────► postgres
  │──────► rustfs
```

---

## 快速开始

### 前置条件

- [Docker](https://www.docker.com/) & Docker Compose
- [NVIDIA GPU](https://www.nvidia.com/) + [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/) (用于本地 Embedding 和 MinerU)
- [pnpm](https://pnpm.io/) (仅用于本地代码提示，非必须)

### 1. 克隆项目

```bash
git clone <repository-url>
cd research-os
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
DB_USER=research
DB_PASSWORD=your_secure_password
DB_NAME=research_os

RUSTFS_USER=rustfsadmin
RUSTFS_PASSWORD=your_rustfs_password
```

> `docker-compose.yml` 中的 `${DB_USER}`、`${DB_PASSWORD}` 等变量会从此文件读取。

### 3. 启动全栈服务

```bash
docker-compose up -d --build
```

### 4. 访问应用

- **科研门户**: http://localhost
- **API 文档**: http://localhost/api/v1/docs
- **RustFS 控制台**: http://localhost/console
- **Draw.io**: http://localhost/drawio

---

## 开发指南

### 核心原则：纯 Docker 开发模式

源码保留在宿主机，通过 Volume 挂载进入容器。**请勿在本地启动服务**，所有服务应通过 Docker Compose 运行。

### 依赖管理

| 操作 | 命令 |
| :--- | :--- |
| 本地安装 (仅代码提示) | `pnpm install` |
| 前端添加依赖 | `docker compose exec web pnpm add <package>` |
| 后端添加依赖 | `docker compose exec api poetry add <package>` |
| 构建 SDK | `pnpm build:sdk` |

### 热更新

- **前端**: Volume 挂载 + Webpack HMR，自动检测文件变更
- **后端**: `uvicorn --reload`，代码变更自动重启

### 类型共享

修改 `packages/types` 后，前端会通过 Workspace 引用自动检测变化，无需手动构建。

---

## API 概览

所有 API 路径前缀为 `/api/v1`，完整文档见 `/api/v1/docs`。

| 模块 | 路径 | 说明 |
| :--- | :--- | :--- |
| System | `/system` | 系统状态与健康检查 |
| Projects | `/projects` | 项目 CRUD |
| Tasks | `/tasks` | 异步任务管理 |
| Files | `/files` | 文件上传与管理 |
| Skills | `/skills` | 技能注册与执行 |
| Agents | `/agents` | 智能体会话管理 |
| Memory | `/memory` | 多层记忆读写 |
| Workflows | `/workflows` | 工作流配置与执行 |
| Prompts | `/prompts` | Prompt 模板管理 |
| Papers | `/papers` | 论文解析与检索 |
| Smart Draw | `/smart-draw` | AI 绘图 (Excalidraw/Draw.io) |
| Excalidraw Icons | `/excalidraw-icons` | 图标库管理 |
| Storage | `/storage` | 对象存储操作 |
| QA | `/qa` | RAG 增强问答 |
| Progress | `/progress` | 任务进度追踪 |
| Icons | `/icons` | 图标嵌入检索 |
| Materials | `/materials` | 素材管理 |

---

## AI 工作流

平台内置 8 种 AI 工作流，均基于 LangGraph 图编排框架实现，支持自定义节点与边：

| 工作流 | ID | 说明 |
| :--- | :--- | :--- |
| **日常对话** | `sys_chat_001` | 通用对话助手 |
| **文档阅读** | `sys_reading_001` | 文档解读与摘要生成 |
| **学术检索** | `sys_search_001` | 跨文献知识检索 |
| **长文写作** | `sys_writing_001` | 论文写作辅助 |
| **代码生成** | `sys_coding_001` | 代码生成与审查 |
| **图像生成** | `sys_drawing_001` | 图像描述生成 |
| **创新推演** | `sys_innovation_001` | Generator-Critic 双智能体创新推演 |
| **文献综述** | `sys_review_001` | 多文档综述分析 |

### 智能体框架

```
agent_framework/
  ├── BaseGraph        # LangGraph 图编排基类
  ├── BaseAgent        # 智能体基类 (模型/Prompt/工具绑定)
  ├── StateManager     # 工作流状态管理
  ├── ToolFactory      # 工具工厂 (动态注册 Skill)
  └── Compiler         # 图编译器 (配置 → 可执行图)
```

### 记忆系统

```
memory/
  ├── BaseMemory           # 抽象基类 (read/write/update/delete/clear)
  ├── operations/          # 记忆操作
  │   ├── management.py    # 记忆管理 (创建/删除)
  │   ├── reading.py       # 记忆读取
  │   └── writing.py       # 记忆写入
  └── sources/             # 记忆源
      ├── SessionMemory    # 会话级短期记忆
      ├── ProjectMemory    # 项目级持久记忆
      ├── UserMemory       # 用户级偏好记忆
      └── ExternalKnowledge # 外部知识库检索
```

---

## 数据模型

核心领域模型（SQLModel）：

| 模型 | 说明 |
| :--- | :--- |
| `Project` | 项目 |
| `Task` / `TaskLog` | 异步任务与日志 |
| `Document` / `DocumentChunk` / `DocumentImage` | 文档、分块、图片 |
| `Artifact` | 生成产物 |
| `AgentSession` | 智能体会话 |
| `Skill` / `SkillCall` | 技能定义与调用记录 |
| `MemoryItem` | 记忆条目 |
| `Workflow` | 工作流配置 |
| `Prompt` | Prompt 模板 |

---

## 环境变量

### 后端核心配置 (`apps/api`)

#### 应用基础

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `APP_ENV` | `dev` | 运行环境 (dev/prod) |
| `APP_HOST` | `0.0.0.0` | 监听地址 |
| `APP_PORT` | `8000` | 监听端口 |
| `SECRET_KEY` | `replace_me` | 安全密钥 (生产环境务必修改) |

#### 数据库

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `POSTGRES_SERVER` | `localhost` | PostgreSQL 地址 |
| `POSTGRES_USER` | `research` | 数据库用户名 |
| `POSTGRES_PASSWORD` | `research_password` | 数据库密码 |
| `POSTGRES_DB` | `research_os` | 数据库名 |
| `DATABASE_URL` | 自动组装 | 异步数据库连接 (asyncpg) |
| `RAG_DATABASE_URL` | 自动组装 | RAG 同步数据库连接 (psycopg) |

#### Redis

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `REDIS_HOST` | `localhost` | Redis 地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_DB` | `0` | Redis 数据库编号 |

#### LLM 配置

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `LLM_API_KEY` | — | LLM API 密钥 |
| `LLM_BASE_URL` | 阿里云 DashScope | LLM API 地址 |
| `OPENAI_API_KEY` | — | OpenAI API 密钥 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API 地址 |
| `GOOGLE_API_KEY` | — | Google API 密钥 |

#### 本地模型

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `USE_LOCAL_EMBEDDINGS` | `true` | 是否使用本地 Embedding |
| `LOCAL_EMBEDDING_MODEL_PATH` | `/app/models/embedding` | 本地模型路径 |
| `TORCH_DEVICE` | `auto` | PyTorch 设备 (auto/cuda/cpu) |
| `WARMUP_ON_STARTUP` | `true` | 启动时预热模型 |

#### 对象存储 (RustFS)

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `RUSTFS_ENDPOINT` | `http://rustfs:9000` | RustFS S3 地址 |
| `RUSTFS_PUBLIC_ENDPOINT` | — | 外部访问地址 (留空则通过 Nginx 代理) |
| `RUSTFS_ACCESS_KEY` | `rustfsadmin` | S3 Access Key |
| `RUSTFS_SECRET_KEY` | `rustfsadmin` | S3 Secret Key |
| `RUSTFS_BUCKET_PAPERS` | `papers` | 论文文件桶名 |
| `RUSTFS_BUCKET_ASSETS` | `assets` | 资产文件桶名 |
| `RUSTFS_SECURE` | `false` | 是否启用 HTTPS |

#### MinerU & 存储

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `MINERU_SERVICE_URL` | `http://mineru:8001` | MinerU 服务地址 |
| `MINERU_TIMEOUT` | `600` | MinerU 请求超时 (秒) |
| `STORAGE_BASE` | `/app/storage` | 本地存储根路径 |
| `MEDIA_BASE` | — | 媒体文件路径 |

#### Smart Draw

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `SMART_DRAW_ACCESS_PASSWORD` | — | Smart Draw 访问密码 |
| `SMART_DRAW_SERVER_LLM_TYPE` | — | Smart Draw LLM 类型 |
| `SMART_DRAW_SERVER_LLM_BASE_URL` | — | Smart Draw LLM 地址 |
| `SMART_DRAW_SERVER_LLM_API_KEY` | — | Smart Draw LLM 密钥 |
| `SMART_DRAW_SERVER_LLM_MODEL` | — | Smart Draw LLM 模型名 |

### 前端配置 (`apps/web`)

| 变量 | 说明 |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | 前端访问的 API 路径 |
| `API_URL_INTERNAL` | 容器内 API 地址 (SSR 用) |
| `NEXT_PUBLIC_DRAWIO_BASE_URL` | Draw.io 嵌入路径 |

---

## 常用命令

### Docker 服务管理

```bash
docker-compose up -d                    # 启动全栈
docker-compose up -d --build            # 重新构建并启动
docker-compose logs -f web              # 查看前端日志
docker-compose logs -f api              # 查看后端日志
docker-compose restart api              # 重启 API 服务
docker-compose exec api bash            # 进入 API 容器
docker-compose exec web bash            # 进入 Web 容器
docker-compose down                     # 停止所有服务
docker-compose down -v                  # 停止并清除数据卷 (慎用)
```

### 生产部署

```bash
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml down
```

### 数据库初始化

```bash
docker compose exec api python -m scripts.init_db
docker compose exec api python -m scripts.init_document_tables
docker compose exec api python -m scripts.seed_skills
docker compose exec api python -m scripts.seed_memory
```

### pnpm 快捷命令

```bash
pnpm dev              # 启动开发环境 (docker-compose up)
pnpm dev:infra        # 仅启动基础设施 (DB/Redis/RustFS)
pnpm dev:local        # 本地 Turbo 开发 (不推荐)
pnpm prod             # 启动生产环境
pnpm prod:down        # 停止生产环境
pnpm build            # Turbo 构建所有包
pnpm lint             # 全局 Lint
pnpm typecheck        # 全局类型检查
pnpm build:sdk        # 构建 SDK 包
```
