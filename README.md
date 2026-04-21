# GitHub Image Host

一个自动化图片托管服务，当你通过 `git push` 上传图片到 GitHub 仓库时，系统会自动生成并返回图片的直接访问链接。

## 功能特性

- 🚀 **自动化处理**：通过 GitHub webhook 自动捕获图片上传事件
- 📷 **多格式支持**：支持 jpg、jpeg、png、gif、webp、svg、bmp 等图片格式
- 🔗 **直接访问链接**：生成 GitHub Raw 格式的图片链接，可直接在浏览器中查看
- 🔒 **安全可靠**：支持 webhook 签名验证，确保请求来源安全
- 📦 **易于部署**：支持多种部署平台（Vercel、Heroku、AWS EC2）
- 🛠 **可扩展**：模块化设计，易于添加新功能

## 工作原理

1. **推送图片**：用户通过 `git push` 将图片文件上传到 GitHub 仓库
2. **触发 webhook**：GitHub 发送 push 事件到配置的 webhook 地址
3. **处理事件**：服务器接收并验证 webhook 事件
4. **识别图片**：自动识别上传的图片文件
5. **生成链接**：为每个图片生成 GitHub Raw 格式的直接访问链接
6. **返回结果**：返回包含所有图片链接的 JSON 响应

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/github-image-host.git
cd github-image-host
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env` 文件并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# GitHub API 配置
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# 服务器配置
PORT=3000
```

### 4. 启动服务器

```bash
node index.js
```

服务器将运行在 `http://localhost:3000`

### 5. 配置 GitHub Webhook

1. 进入 GitHub 仓库 → Settings → Webhooks → Add webhook
2. Payload URL：填写你的服务器地址 + `/webhook`
3. Content type：选择 `application/json`
4. Secret：填写与 `.env` 文件中相同的密钥
5. 事件：选择 `Just the push event`
6. 激活 webhook

## 部署

### 使用 GitHub Actions 部署

本项目配置了 GitHub Actions 工作流，支持部署到多种平台：

1. **Vercel**（推荐）
2. **Heroku**
3. **AWS EC2**

详细部署步骤见 [部署指南](#部署指南)。

### 手动部署

你也可以将项目部署到任何支持 Node.js 的服务器：

1. 复制项目文件到服务器
2. 安装依赖：`npm install`
3. 配置环境变量
4. 启动服务器：`node index.js`
5. （推荐）使用 PM2 管理进程：`pm2 start index.js`

## API 文档

### Webhook 端点

- **URL**：`/webhook`
- **方法**：`POST`
- **Content-Type**：`application/json`
- **描述**：接收 GitHub push 事件并处理图片文件

### 健康检查端点

- **URL**：`/health`
- **方法**：`GET`
- **描述**：检查服务器运行状态

### 响应格式

成功响应：

```json
{
  "success": true,
  "message": "Generated 2 image links",
  "links": [
    {
      "file": "images/photo1.jpg",
      "url": "https://raw.githubusercontent.com/username/repo/main/images/photo1.jpg"
    },
    {
      "file": "images/photo2.png",
      "url": "https://raw.githubusercontent.com/username/repo/main/images/photo2.png"
    }
  ]
}
```

## 生成的链接格式

生成的图片链接格式为 GitHub Raw 格式：

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

例如：
- 仓库：`username/repo`
- 分支：`main`
- 图片路径：`images/photo.jpg`
- 生成的链接：`https://raw.githubusercontent.com/username/repo/main/images/photo.jpg`

## 注意事项

1. **GitHub 令牌权限**：需要创建具有 `repo` 权限的个人访问令牌
2. **Webhook 密钥**：确保 webhook 密钥的安全性，避免泄露
3. **服务器可访问性**：确保部署的服务器可以被 GitHub 访问
4. **文件大小限制**：GitHub 对文件大小有一定限制，建议上传不超过 100MB 的图片
5. **带宽限制**：GitHub Raw 有带宽限制，不建议用于高流量场景

## 示例使用场景

1. **个人图片托管**：将个人图片上传到 GitHub 仓库，自动获取可访问链接
2. **项目文档图片**：为项目文档自动生成图片链接
3. **博客图片**：为博客文章自动生成图片链接
4. **团队协作**：团队成员上传图片后自动获取链接，方便共享

## 技术栈

- **Node.js**：运行环境
- **Express**：Web 服务器框架
- **Octokit**：GitHub API 客户端
- **dotenv**：环境变量管理
- **GitHub Actions**：自动化部署

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目地址：https://github.com/your-username/github-image-host
- 问题反馈：https://github.com/your-username/github-image-host/issues
