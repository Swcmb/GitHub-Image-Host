# CLAUDE.md — GitHub Image Host

## 项目概述
基于 Node.js + Express 的图片托管服务。当用户通过 `git push` 上传图片到 GitHub 仓库时，通过 webhook 自动捕获事件并生成 GitHub Raw 格式的直接访问链接。

## 技术栈
- **运行时**: Node.js 18+
- **框架**: Express 5.x
- **GitHub API**: @octokit/rest ^22.0.1
- **文件上传**: multer ^2.1.1（已安装但未使用）
- **环境变量**: dotenv ^17.4.2
- **部署**: GitHub Actions → Vercel / Heroku / AWS EC2

## 项目结构
```
D:\imageHosting\
├── index.js              # 主服务入口（~113 行，全部逻辑集中于此）
├── package.json          # npm 配置
├── .env                  # 环境变量（模板值，未提交）
├── .gitignore            # Git 忽略规则
├── README.md             # 项目说明文档
├── DEPLOYMENT.md         # 详细部署指南
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions CI/CD 工作流
└── node_modules/         # 依赖
```

## 核心 API
| 端点 | 方法 | 功能 |
|:---|:---|:---|
| `/webhook` | POST | 接收 GitHub push 事件，提取图片并生成 Raw 链接 |
| `/health` | GET | 健康检查，返回 "Server is running" |

## 环境变量
| 变量 | 必需 | 说明 |
|:---|:---|:---|
| `GITHUB_TOKEN` | 是 | GitHub 个人访问令牌（需 repo 权限） |
| `GITHUB_WEBHOOK_SECRET` | 是 | Webhook 签名验证密钥 |
| `PORT` | 否 | 服务端口，默认 3000 |

## 开发命令
```bash
npm install          # 安装依赖
node index.js        # 启动服务（无 dev 脚本）
npm test             # 无测试（会报错退出）
```

## 当前状态
项目处于**早期原型**阶段，仅 2 次 commit。核心 webhook 功能可用但缺少直接上传能力、测试、结构化日志等。
