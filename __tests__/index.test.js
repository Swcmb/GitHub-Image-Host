const crypto = require('crypto');

// ============================================================
// Mock @octokit/rest — 避免 ESM 导入问题和真实 API 调用
// ============================================================
const mockGetContent = jest.fn();
const mockCreateOrUpdateFile = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getContent: mockGetContent,
        createOrUpdateFileContents: mockCreateOrUpdateFile,
      },
    },
  })),
}));

// 设置测试环境变量
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '0';

const request = require('supertest');
const app = require('../index');

// ============================================================
// 辅助函数
// ============================================================

/** 生成合法的 webhook 签名 */
function signWebhook(payload, secret = 'test-secret') {
  const hmac = crypto.createHmac('sha256', secret);
  return `sha256=${hmac.update(JSON.stringify(payload)).digest('hex')}`;
}

/** 构造 push 事件 payload */
function createPushPayload(files = []) {
  return {
    ref: 'refs/heads/main',
    repository: {
      name: 'test-repo',
      owner: { login: 'testuser' },
    },
    commits: [
      {
        added: files.filter((_, i) => i % 2 === 0),
        modified: files.filter((_, i) => i % 2 !== 0),
      },
    ],
  };
}

// ============================================================
// 健康检查端点
// ============================================================
describe('GET /health', () => {
  it('应返回运行状态', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ============================================================
// Webhook 端点
// ============================================================
describe('POST /webhook', () => {
  it('缺少签名时应返回 401', async () => {
    const res = await request(app)
      .post('/webhook')
      .send(createPushPayload(['test.jpg']));
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('签名');
  });

  it('签名错误时应返回 401', async () => {
    const payload = createPushPayload(['test.jpg']);
    const res = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', 'sha256=invalid')
      .set('x-github-event', 'push')
      .send(payload);
    expect(res.status).toBe(401);
  });

  it('非 push 事件应返回忽略消息', async () => {
    const payload = {
      ref: 'refs/heads/main',
      repository: { name: 'r', owner: { login: 'u' } },
      commits: [],
    };
    const res = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', signWebhook(payload))
      .set('x-github-event', 'ping')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('忽略');
  });

  it('push 中无图片文件时应返回提示', async () => {
    const payload = createPushPayload(['README.md', 'index.js']);
    const res = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', signWebhook(payload))
      .set('x-github-event', 'push')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('未发现');
  });

  it('push 中包含图片时应生成链接', async () => {
    const payload = createPushPayload(['images/photo.jpg', 'banner.png', 'readme.md']);
    const res = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', signWebhook(payload))
      .set('x-github-event', 'push')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.links).toHaveLength(2);
    expect(res.body.links[0].url).toContain('raw.githubusercontent.com');
  });

  it('Webhook 签名应使用 timingSafeEqual 验证（防时序攻击）', async () => {
    const payload = createPushPayload(['test.png']);
    const validSig = signWebhook(payload);
    // 修改一个字符，确保长度相同
    const tampered = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a');
    const res = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', tampered)
      .set('x-github-event', 'push')
      .send(payload);
    expect(res.status).toBe(401);
  });
});

// ============================================================
// 上传端点（参数校验测试）
// ============================================================
describe('POST /upload', () => {
  it('无文件时应返回 400', async () => {
    const res = await request(app)
      .post('/upload?owner=testuser&repo=test-repo');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('图片');
  });

  it('缺少 owner 参数时应返回 400', async () => {
    const res = await request(app)
      .post('/upload?repo=test-repo')
      .attach('image', Buffer.from([0xff, 0xd8, 0xff, 0x00]), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('参数');
  });

  it('不支持的文件类型应返回 400', async () => {
    const res = await request(app)
      .post('/upload?owner=u&repo=r')
      .attach('image', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 批量上传端点
// ============================================================
describe('POST /upload/batch', () => {
  it('无文件时应返回 400', async () => {
    const res = await request(app)
      .post('/upload/batch?owner=u&repo=r');
    expect(res.status).toBe(400);
  });

  it('缺少参数时应返回 400', async () => {
    const res = await request(app)
      .post('/upload/batch');
    expect(res.status).toBe(400);
  });
});
