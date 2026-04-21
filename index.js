const express = require('express');
const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
const crypto = require('crypto');

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化 Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// 图片文件扩展名
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

// 验证 webhook 签名
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).send('Missing signature');
  }

  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  next();
}

// 检查文件是否为图片
function isImageFile(filename) {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(extension);
}

// 生成 GitHub Raw 链接
function generateRawUrl(owner, repo, branch, path) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

// 处理 GitHub webhook
app.post('/webhook', verifyWebhookSignature, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    if (event !== 'push') {
      return res.status(200).send('Not a push event');
    }

    const { repository, ref, commits } = req.body;
    const owner = repository.owner.login;
    const repo = repository.name;
    const branch = ref.split('/').pop();

    const imageLinks = [];

    // 处理所有提交
    for (const commit of commits) {
      // 处理新增和修改的文件
      const changedFiles = [...(commit.added || []), ...(commit.modified || [])];

      for (const file of changedFiles) {
        if (isImageFile(file)) {
          const rawUrl = generateRawUrl(owner, repo, branch, file);
          imageLinks.push({
            file,
            url: rawUrl
          });
        }
      }
    }

    if (imageLinks.length === 0) {
      return res.status(200).send('No image files found in push');
    }

    // 这里可以根据需要将链接发送到指定位置，比如通过 GitHub Actions、邮件等
    console.log('Generated image links:', imageLinks);

    res.status(200).json({
      success: true,
      message: `Generated ${imageLinks.length} image links`,
      links: imageLinks
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal server error');
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Webhook endpoint: POST /webhook');
  console.log('Health check: GET /health');
});