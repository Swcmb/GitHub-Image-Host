const express = require('express');
const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'info';

// ============================================================
// 日志工具 — 带时间戳和级别的结构化日志
// ============================================================
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[logLevel] ?? 1;

const logger = {
  debug: (...args) => currentLevel <= 0 && console.log(`[${new Date().toISOString()}] [DEBUG]`, ...args),
  info:  (...args) => currentLevel <= 1 && console.log(`[${new Date().toISOString()}] [INFO]`,  ...args),
  warn:  (...args) => currentLevel <= 2 && console.warn(`[${new Date().toISOString()}] [WARN]`,  ...args),
  error: (...args) => currentLevel <= 3 && console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
};

// ============================================================
// 配置中间件
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — 允许跨域请求（开发和生产环境）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-GitHub-Event');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ============================================================
// 初始化 Octokit
// ============================================================
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// ============================================================
// 支持的图片格式
// ============================================================
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'
]);

// 上传大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// Multer 配置 — 内存存储，用于直接上传到 GitHub
// ============================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}，仅支持 ${[...ALLOWED_EXTENSIONS].join(', ')}`));
    }
  },
});

// ============================================================
// 工具函数
// ============================================================

/** 检查文件是否为图片 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/** 生成 GitHub Raw 链接 */
function generateRawUrl(owner, repo, branch, filePath) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

/** 根据文件扩展名获取 Content-Type */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png',  '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
  };
  return map[ext] || 'application/octet-stream';
}

// ============================================================
// 中间件 — 验证 Webhook 签名
// ============================================================
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: '缺少签名头' });
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('GITHUB_WEBHOOK_SECRET 未配置');
    return res.status(500).json({ error: '服务端配置错误' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

  // 使用 timingSafeEqual 防止时序攻击
  const sigBuffer = Buffer.from(signature);
  const digBuffer = Buffer.from(digest);
  if (sigBuffer.length !== digBuffer.length || !crypto.timingSafeEqual(sigBuffer, digBuffer)) {
    logger.warn('Webhook 签名验证失败');
    return res.status(401).json({ error: '签名无效' });
  }

  next();
}

// ============================================================
// 路由 — 健康检查
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// 路由 — Webhook 接收 GitHub push 事件
// ============================================================
app.post('/webhook', verifyWebhookSignature, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    if (event !== 'push') {
      return res.status(200).json({ message: '非 push 事件，已忽略' });
    }

    const { repository, ref, commits } = req.body;
    if (!repository || !ref || !commits) {
      return res.status(400).json({ error: 'Webhook 数据不完整' });
    }

    const owner = repository.owner.login;
    const repo = repository.name;
    const branch = ref.split('/').pop();
    const imageLinks = [];

    // 遍历所有提交，提取新增和修改的图片文件
    for (const commit of commits) {
      const changedFiles = [...(commit.added || []), ...(commit.modified || [])];
      for (const file of changedFiles) {
        if (isImageFile(file)) {
          imageLinks.push({
            file,
            url: generateRawUrl(owner, repo, branch, file),
          });
        }
      }
    }

    if (imageLinks.length === 0) {
      return res.status(200).json({ message: '未发现图片文件' });
    }

    logger.info(`Push 事件处理完成: ${imageLinks.length} 张图片`);
    res.status(200).json({
      success: true,
      message: `已生成 ${imageLinks.length} 个图片链接`,
      links: imageLinks,
    });

  } catch (error) {
    logger.error('处理 Webhook 时出错:', error.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ============================================================
// 路由 — 图片直接上传到 GitHub 仓库
// ============================================================
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // 校验文件
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    // 校验必需参数
    const { owner, repo, branch = 'main', path: filePath } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({
        error: '缺少必需参数',
        required: { owner: '仓库所有者', repo: '仓库名称' },
        optional: { branch: '分支名（默认 main）', path: '存储路径（默认根目录）' },
        usage: 'POST /upload?owner=xxx&repo=xxx&branch=main&path=images',
      });
    }

    // 构建文件在仓库中的路径
    const dir = filePath || '';
    const fileName = req.file.originalname;
    const fullPath = dir ? `${dir}/${fileName}` : fileName;

    // 将文件内容转为 Base64（GitHub API 要求）
    const content = req.file.buffer.toString('base64');

    logger.debug(`准备上传: ${fullPath} 到 ${owner}/${repo} (${branch})`);

    // 检查文件是否已存在（需要更新时获取 SHA）
    let existingSha = null;
    try {
      const existing = await octokit.rest.repos.getContent({
        owner, repo, path: fullPath, ref: branch,
      });
      existingSha = existing.data.sha;
      logger.debug(`文件已存在，SHA: ${existingSha}`);
    } catch (err) {
      if (err.status !== 404) throw err;
      // 文件不存在，正常创建
    }

    // 调用 GitHub API 创建或更新文件
    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fullPath,
      message: `feat: 上传图片 ${fileName} [skip ci]`,
      content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    });

    const rawUrl = generateRawUrl(owner, repo, branch, fullPath);

    logger.info(`图片上传成功: ${fullPath} → ${rawUrl}`);

    res.status(existingSha ? 200 : 201).json({
      success: true,
      message: existingSha ? '图片已更新' : '图片已上传',
      data: {
        file: fullPath,
        url: rawUrl,
        sha: result.data.content.sha,
        size: req.file.size,
      },
    });

  } catch (error) {
    // multer 错误处理
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
        });
      }
      return res.status(400).json({ error: `上传错误: ${error.message}` });
    }

    logger.error('图片上传失败:', error.message);
    res.status(500).json({ error: '上传失败，请检查 GitHub Token 权限和仓库配置' });
  }
});

// ============================================================
// 路由 — 批量图片上传
// ============================================================
app.post('/upload/batch', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一个图片文件' });
    }

    const { owner, repo, branch = 'main', path: dirPath = '' } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({
        error: '缺少必需参数',
        required: { owner: '仓库所有者', repo: '仓库名称' },
      });
    }

    const results = [];
    const errors = [];

    // 逐个上传（避免并发超限）
    for (const file of req.files) {
      try {
        const fullPath = dirPath ? `${dirPath}/${file.originalname}` : file.originalname;
        const content = file.buffer.toString('base64');

        // 检查是否已存在
        let existingSha = null;
        try {
          const existing = await octokit.rest.repos.getContent({
            owner, repo, path: fullPath, ref: branch,
          });
          existingSha = existing.data.sha;
        } catch (err) {
          if (err.status !== 404) throw err;
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner, repo, path: fullPath,
          message: `feat: 批量上传图片 ${file.originalname} [skip ci]`,
          content, branch,
          ...(existingSha ? { sha: existingSha } : {}),
        });

        results.push({
          file: fullPath,
          url: generateRawUrl(owner, repo, branch, fullPath),
          size: file.size,
          status: 'success',
        });
      } catch (err) {
        errors.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    logger.info(`批量上传完成: ${results.length} 成功, ${errors.length} 失败`);

    res.status(errors.length === req.files.length ? 500 : 200).json({
      success: errors.length === 0,
      message: `${results.length}/${req.files.length} 个文件上传成功`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    logger.error('批量上传失败:', error.message);
    res.status(500).json({ error: '批量上传失败' });
  }
});

// ============================================================
// 全局错误处理
// ============================================================
app.use((err, req, res, _next) => {
  // multer fileFilter 拒绝错误
  if (err.message && err.message.includes('不支持的文件类型')) {
    return res.status(400).json({ error: err.message });
  }
  logger.error('未捕获的错误:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

// ============================================================
// 启动服务器
// ============================================================
app.listen(port, () => {
  logger.info(`服务器已启动，端口: ${port}`);
  logger.info(`Webhook 端点: POST /webhook`);
  logger.info(`图片上传:    POST /upload?owner=xxx&repo=xxx`);
  logger.info(`批量上传:    POST /upload/batch?owner=xxx&repo=xxx`);
  logger.info(`健康检查:    GET /health`);
});

// 导出 app 供测试使用
module.exports = app;
