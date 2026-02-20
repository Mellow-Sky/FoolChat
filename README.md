# FoolChat (TypeScript + Express)

[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

一个本地可运行的 Gemini 聊天项目，包含：

- Web 聊天界面（对话列表、定位、模型风格切换）
- 后端 API（普通回复 + 流式回复）
- 基于提示词的风格化输出（内置 + 自定义模型风格）
- 本地会话存储（浏览器 LocalStorage）

## 1. 环境要求

- Node.js 20+
- 可用的 Gemini API Key

## 2. 快速开始

1. 安装依赖

```bash
npm install
```

2. 创建环境变量文件

```bash
cp .env.example .env
```

Windows PowerShell 可用：

```powershell
Copy-Item .env.example .env
```

3. 编辑 `.env`

```env
GEMINI_API_KEY=你的密钥
GEMINI_MODEL=gemini-2.0-flash
PORT=5000
```

4. 启动开发模式

```bash
npm run dev
```

5. 打开浏览器

- `http://127.0.0.1:5000`

## 3. 可用脚本

- `npm run dev`：使用 `tsx watch` 启动开发服务（自动重载）
- `npm run build`：TypeScript 编译到 `dist/`
- `npm start`：运行 `dist/index.js`（生产模式）

## 4. 环境变量说明

- `GEMINI_API_KEY`：必填，Gemini API 密钥
- `GEMINI_MODEL`：可选，默认 `gemini-2.0-flash`
- `PORT`：可选，默认 `5000`

未配置 `GEMINI_API_KEY` 时，服务会在启动阶段报错并退出。

## 5. API 说明

### `GET /health`

健康检查。

响应示例：

```json
{ "ok": true }
```

### `POST /api/chat`

非流式聊天接口。

请求体字段：

- `message?: string`
- `history?: Array<{ role: "user" | "model"; content: string }>`
- `style?: "balanced" | "concise" | "creative" | "professional" | "teacher" | "custom"`
- `customStylePrompt?: string`

约束：

- `message` 和 `history` 至少提供一个
- `history` 最多保留最近 20 条有效消息

响应示例：

```json
{ "reply": "..." }
```

### `POST /api/chat/stream`

流式聊天接口（Server-Sent Events 风格文本流）。

请求体与 `/api/chat` 相同。返回数据行格式：

```text
data: {"type":"chunk","text":"..."}

data: {"type":"done"}
```

出错时：

```text
data: {"type":"error","error":"..."}
```

## 6. 内置风格

后端支持以下风格值：

- `balanced`（均衡）
- `concise`（简洁）
- `creative`（创意）
- `professional`（专业）
- `teacher`（讲解）
- `custom`（自定义，需配合 `customStylePrompt`）

风格会作用在后端 Prompt 构造阶段，不是前端纯展示效果。

## 7. 前端功能概览

- 新对话 / 最近对话 / 对话定位
- 模型风格选择与自定义风格保存
- 流式输出的逐字渲染
- 主题切换
- 侧栏折叠

前端资源位于 `public/`：

- `public/index.html`
- `public/styles.css`
- `public/app.js`

## 8. 项目结构

```text
.
├─ src/
│  ├─ index.ts       # Express 服务与路由入口
│  ├─ api.ts         # Gemini API 调用与流式解析
│  ├─ proactive.ts   # 风格化 Prompt 构建
│  └─ config.ts      # 环境变量读取与校验
├─ public/           # 前端静态资源
├─ dist/             # 编译输出
├─ .env.example
└─ package.json
```

## 9. 常见问题

1. 启动报 `Missing env: GEMINI_API_KEY`
- 原因：未配置密钥
- 处理：检查 `.env` 是否存在且变量名正确

2. 端口冲突（5000 被占用）
- 处理：修改 `.env` 的 `PORT`，或释放占用进程

3. 模型无响应或报 4xx/5xx
- 处理：检查 API Key、模型名、网络连通性

4. 前端看不到历史
- 说明：历史保存在浏览器 LocalStorage，更换浏览器或清缓存后会丢失

## 10. 生产部署建议

- 使用 `npm run build && npm start`
- 通过进程管理器托管（如 PM2 / systemd / Windows 服务）
- 在反向代理层（Nginx/Caddy）处理 HTTPS 与域名
- 保护 `.env`，不要提交真实密钥到仓库
