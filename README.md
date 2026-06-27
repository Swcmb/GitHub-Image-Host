# GitHub Image Host

一个自动化图片托管服务，当你通过 `git push` 上传图片到 GitHub 仓库时，系统会自动生成并返回图片的直接访问链接。同时支持通过 API 直接上传图片到指定仓库。

## 功能特性

- 🚀 **自动化处理**：通过 GitHub Webhook 自动捕获图片上传事件
- 📤 **直接上传**：通过 REST API 上传图片到任意 GitHub 仓库
- 📦 **批量上传**：支持一次上传多张图片（最多 20 张）
- 📷 **多格式支持**：支持 jpg、jpeg、png、gif、webp、svg、bmp 等图片格式
- 🔗 **直接访问链接**：生成 GitHub Raw 格式的图片链接，可直接在浏览器中查看
- 🔒 **安全可靠**：支持 Webhook 签名验证（HMAC-SHA256 + timingSafeEqual）
- 📝 **结构化日志**：支持可配置的日志级别（debug/info/warn/error）
- 🌐 **CORS 支持**：内置跨域资源共享支持

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Swcmb/GitHub-Image-Host.git
cd GitHub-Image-Host
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写：

```env
GITHUB_TOKEN=ghp_xxxx          # GitHub 个人访问令牌（需 repo 权限）
GITHUB_WEBHOOK_SECRET=xxxx      # Webhook 签名密钥
PORT=3000                       # 服务端口
LOG_LEVEL=info                  # 日志级别 (debug|info|warn|error)
```

### 4. 启动服务

```bash
# 生产环境
npm start

# 开发环境（Node.js 原生 watch 模式）
npm run dev
```

## API 文档

### 健康检查

```
GET /health
```

响应示例：

```json
{ "status": "running", "uptime": 123.456, "timestamp": "2026-06-27T12:00:00.000Z" }
```

### 图片直接上传

```
POST /upload?owner={owner}&repo={repo}&branch={branch}&path={path}
Content-Type: multipart/form-data
```

| 参数 | 必需 | 说明 |
|:---|:---|:---|
| `owner` | ✅ | 仓库所有者 |
| `repo` | ✅ | 仓库名称 |
| `branch` | ❌ | 分支名（默认 `main`） |
| `path` | ❌ | 存储目录路径（默认仓库根目录） |
| `image` | ✅ | 图片文件（form-data 字段名） |

响应示例：

```json
{
  "success": true,
  "message": "图片已上传",
  "data": {
    "file": "images/photo.jpg",
    "url": "https://raw.githubusercontent.com/user/repo/main/images/photo.jpg",
    "sha": "abc123...",
    "size": 102400
  }
}
```

### 批量上传

```
POST /upload/batch?owner={owner}&repo={repo}&branch={branch}&path={path}
Content-Type: multipart/form-data
```

字段名为 `images`，最多 20 张图片。响应包含每个文件的上传结果。

### Webhook 接收

```
POST /webhook
```

由 GitHub 自动调用，无需手动配置请求体。需在 GitHub 仓库中配置 Webhook 指向此端点。

## 部署

### 1. 准备工作

- 生成 GitHub 个人访问令牌（需 `repo` 权限）：**Settings → Developer settings → Personal access tokens**
- 生成 Webhook 密钥：`openssl rand -base64 32`

### 2. 选择部署平台

**Vercel（推荐）**
1. 登录 [vercel.com](https://vercel.com)，导入 `Swcmb/GitHub-Image-Host` 仓库
2. 在 Environment Variables 中添加 `GITHUB_TOKEN`、`GITHUB_WEBHOOK_SECRET`
3. 点击 Deploy

**AWS EC2 / 自有服务器**
```bash
git clone https://github.com/Swcmb/GitHub-Image-Host.git
cd GitHub-Image-Host
npm install
cp .env.example .env  # 编辑填写配置
pm2 start index.js --name "image-host"
```

### 3. 配置 GitHub Webhook

进入仓库 **Settings → Webhooks → Add webhook**：

| 配置项 | 值 |
|:---|:---|
| Payload URL | `https://你的域名/webhook` |
| Content type | `application/json` |
| Secret | 与 `.env` 中 `GITHUB_WEBHOOK_SECRET` 一致 |
| Events | **Just the push event** |

### GitHub Actions 自动部署

项目已配置 `.github/workflows/deploy.yml`，推送代码到 `main` 分支时自动触发 Vercel 部署。需在仓库 Secrets 中配置 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。

## 生成的链接格式

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

## 技术栈

| 组件 | 技术 |
|:---|:---|
| 运行时 | Node.js 18+ |
| Web 框架 | Express 5 |
| GitHub API | @octokit/rest |
| 文件上传 | multer |
| 环境管理 | dotenv |
| 测试 | Jest + Supertest |

## 注意事项

1. **GitHub 令牌权限**：需要 `repo` 权限的个人访问令牌
2. **文件大小限制**：单个文件最大 10MB
3. **带宽限制**：GitHub Raw 有带宽限制，不建议用于高流量场景
4. **仓库限制**：GitHub 单文件限制 100MB

## 许可证

[MIT License](LICENSE) - Copyright (c) 2026 Swcmb
