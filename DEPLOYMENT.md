# 部署指南

本指南详细介绍如何部署 GitHub Image Host 项目到不同的平台，包括 Vercel、Heroku 和 AWS EC2。

## 部署前准备

### 1. GitHub 仓库准备

- 确保项目已经推送到 GitHub 仓库
- 仓库地址：`https://github.com/Swcmb/GitHub-Image-Host`

### 2. GitHub 个人访问令牌

1. 登录 GitHub 账号
2. 进入 **Settings → Developer settings → Personal access tokens → Tokens (classic)**
3. 点击 **Generate new token**
4. 设置 token 名称（例如：`github-image-host`）
5. 选择权限：至少需要 `repo` 权限
6. 点击 **Generate token**
7. 复制生成的 token，保存好，后续会用到

### 3. Webhook 密钥

创建一个安全的 webhook 密钥，用于验证 webhook 请求的真实性。可以使用随机生成的字符串，例如：

```
openssl rand -base64 32
```

## 部署平台选项

### 选项 1：Vercel（推荐）

Vercel 是一个现代化的前端部署平台，适合部署 Node.js 应用，提供免费计划。

#### 步骤 1：创建 Vercel 账号

1. 访问 [Vercel](https://vercel.com/) 并注册账号
2. 使用 GitHub 账号登录

#### 步骤 2：导入项目

1. 在 Vercel 控制台点击 **New Project**
2. 选择 **Import from Git Repository**
3. 搜索并选择 `Swcmb/GitHub-Image-Host` 仓库
4. 点击 **Import**

#### 步骤 3：配置项目

1. **Project Name**：保持默认或自定义
2. **Framework Preset**：选择 `Other`
3. **Build Command**：留空
4. **Output Directory**：留空
5. **Root Directory**：留空

#### 步骤 4：设置环境变量

在 **Environment Variables** 部分添加以下环境变量：

| 变量名 | 值 |
|-------|-----|
| GITHUB_TOKEN | 你的 GitHub 个人访问令牌 |
| GITHUB_WEBHOOK_SECRET | 你的 webhook 密钥 |
| PORT | 3000 |

#### 步骤 5：部署

点击 **Deploy** 按钮，等待部署完成。

#### 步骤 6：获取部署 URL

部署完成后，Vercel 会提供一个部署 URL，例如：`https://github-image-host.vercel.app`

### 选项 2：Heroku

Heroku 是一个流行的 PaaS 平台，适合部署 Node.js 应用，提供免费计划。

#### 步骤 1：创建 Heroku 账号

1. 访问 [Heroku](https://www.heroku.com/) 并注册账号
2. 登录 Heroku 控制台

#### 步骤 2：创建新应用

1. 点击 **New** → **Create New App**
2. 输入应用名称（例如：`github-image-host`）
3. 选择区域
4. 点击 **Create App**

#### 步骤 3：连接 GitHub 仓库

1. 在应用页面，选择 **Deploy** 标签
2. 选择 **GitHub** 作为部署方法
3. 搜索并选择 `Swcmb/GitHub-Image-Host` 仓库
4. 点击 **Connect**

#### 步骤 4：设置环境变量

1. 在应用页面，选择 **Settings** 标签
2. 点击 **Reveal Config Vars**
3. 添加以下环境变量：

| 变量名 | 值 |
|-------|-----|
| GITHUB_TOKEN | 你的 GitHub 个人访问令牌 |
| GITHUB_WEBHOOK_SECRET | 你的 webhook 密钥 |
| PORT | 3000 |

#### 步骤 5：部署应用

1. 在 **Deploy** 标签页，选择 **Manual deploy**
2. 选择 `main` 分支
3. 点击 **Deploy Branch**
4. 等待部署完成

#### 步骤 6：获取部署 URL

部署完成后，Heroku 会提供一个部署 URL，例如：`https://github-image-host.herokuapp.com`

### 选项 3：AWS EC2

AWS EC2 提供完全可控的服务器环境，适合需要更多自定义配置的场景。

#### 步骤 1：创建 EC2 实例

1. 登录 AWS 控制台
2. 进入 **EC2** 服务
3. 点击 **Launch Instances**
4. 选择一个 Amazon Machine Image (AMI)，推荐使用 Ubuntu Server
5. 选择实例类型，例如 `t2.micro`（免费 tier）
6. 配置实例详细信息
7. 添加存储
8. 配置安全组，确保开放端口 3000
9. 点击 **Launch**
10. 创建并下载密钥对，用于 SSH 连接

#### 步骤 2：连接到 EC2 实例

使用 SSH 连接到你的 EC2 实例：

```bash
ssh -i your-key-pair.pem ubuntu@your-ec2-ip
```

#### 步骤 3：安装依赖

在 EC2 实例上执行以下命令：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Git
sudo apt install -y git

# 安装 PM2（用于进程管理）
sudo npm install -g pm2
```

#### 步骤 4：克隆仓库

```bash
git clone https://github.com/Swcmb/GitHub-Image-Host.git
cd GitHub-Image-Host
npm install
```

#### 步骤 5：设置环境变量

创建 `.env` 文件：

```bash
nano .env
```

添加以下内容：

```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

保存并退出。

#### 步骤 6：启动应用

使用 PM2 启动应用：

```bash
npm install
npm install -g pm2
pm2 start index.js --name "image-host"
```

#### 步骤 7：获取部署 URL

使用 EC2 实例的公网 IP 作为部署 URL，例如：`http://your-ec2-ip:3000`

## 配置 GitHub Webhook

无论选择哪种部署平台，都需要配置 GitHub Webhook：

1. 进入 GitHub 仓库 → **Settings** → **Webhooks** → **Add webhook**

2. 填写以下信息：
   - **Payload URL**：部署后的 URL + `/webhook`（例如：`https://github-image-host.vercel.app/webhook`）
   - **Content type**：选择 `application/json`
   - **Secret**：填写与环境变量中相同的 `GITHUB_WEBHOOK_SECRET` 值
   - **Which events would you like to trigger this webhook?**：选择 `Just the push event`
   - **Active**：勾选

3. 点击 **Add webhook**

## 测试部署

### 测试健康检查端点

访问部署后的 URL + `/health`，应该返回：

```
Server is running
```

### 测试图片上传流程

1. 向 GitHub 仓库推送一张图片文件
2. 检查服务器日志，应该看到类似以下输出：

```
Generated image links: [
  {
    file: 'images/photo.jpg',
    url: 'https://raw.githubusercontent.com/Swcmb/GitHub-Image-Host/main/images/photo.jpg'
  }
]
```

3. 访问生成的 URL，应该直接显示图片内容

## 故障排除

### 常见问题

1. **Webhook 触发但无响应**
   - 检查服务器是否正常运行
   - 检查环境变量是否正确设置
   - 检查服务器日志中的错误信息

2. **图片链接生成失败**
   - 检查 GitHub 令牌权限是否正确
   - 检查仓库路径是否正确
   - 检查服务器是否可以访问 GitHub API

3. **部署失败**
   - 检查依赖是否安装成功
   - 检查环境变量是否正确设置
   - 检查端口是否被占用

### 日志查看

- **Vercel**：在 Vercel 控制台的 **Logs** 标签页查看
- **Heroku**：使用 `heroku logs --tail` 命令查看
- **AWS EC2**：使用 `pm2 logs` 命令查看

### 调试技巧

1. **验证 webhook 签名**：确保 `GITHUB_WEBHOOK_SECRET` 在服务器和 GitHub 配置中完全一致
2. **检查 GitHub API 访问**：使用 `curl` 命令测试 GitHub API 访问
3. **测试图片识别**：尝试推送不同格式的图片文件

## 监控和维护

### 监控

- **Vercel**：使用 Vercel 控制台的监控功能
- **Heroku**：使用 Heroku 控制台的 metrics 功能
- **AWS EC2**：使用 CloudWatch 或其他监控工具

### 维护

1. **定期更新依赖**：
   ```bash
   npm update
   ```

2. **备份环境变量**：确保安全存储环境变量配置

3. **更新 GitHub 令牌**：定期更新 GitHub 个人访问令牌

## 扩展功能

### 自定义域名

- **Vercel**：在 Vercel 控制台的 **Domains** 标签页添加自定义域名
- **Heroku**：在 Heroku 控制台的 **Settings** → **Domains** 添加自定义域名
- **AWS EC2**：配置 DNS 记录指向 EC2 实例的公网 IP

### HTTPS 配置

- **Vercel**：自动提供 HTTPS
- **Heroku**：自动提供 HTTPS
- **AWS EC2**：使用 ACM 或 Let's Encrypt 配置 HTTPS

## 部署检查清单

- [ ] 创建 GitHub 个人访问令牌
- [ ] 生成 webhook 密钥
- [ ] 选择并部署到合适的平台
- [ ] 设置环境变量
- [ ] 配置 GitHub Webhook
- [ ] 测试健康检查端点
- [ ] 测试图片上传流程
- [ ] 验证生成的图片链接

## 联系支持

如果遇到部署问题，可以：

1. 查看项目的 [Issues](https://github.com/Swcmb/GitHub-Image-Host/issues) 页面
2. 提交新的 Issue 描述问题
3. 检查服务器日志获取详细错误信息

---

部署完成后，你就可以通过 `git push` 向 GitHub 仓库上传图片，系统会自动生成可直接访问的图片链接！