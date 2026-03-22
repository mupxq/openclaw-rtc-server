/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');

const config = require('./config');
const { initDatabase } = require('./database');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const proxyRoutes = require('./routes/proxy');

// 初始化数据库
initDatabase();

const app = new Koa();
const router = new Router();

// 全局中间件
app.use(cors({ origin: '*' }));
app.use(bodyParser());

// 请求日志中间件
app.use(async (ctx, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] ${ctx.method} ${ctx.url}`);

  await next();

  const duration = Date.now() - start;
  console.log(`  → ${ctx.status} (${duration}ms)`);

  if (ctx.status >= 400 && ctx.body?.error) {
    console.log(`  Error: ${ctx.body.error}`);
  }
});

// 公开路由 (无需认证)
router.use('/auth', authRoutes.routes());

// 需要认证的路由
router.use('/agents', authMiddleware, agentRoutes.routes());
router.use('/proxy', authMiddleware, proxyRoutes.routes());

// 健康检查
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// 应用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('Server error:', err);
  ctx.status = err.status || 500;
  ctx.body = { error: '服务器内部错误' };
});

// 启动服务器
app.listen(config.server.port, () => {
  console.log(`Multi-user AIGC Server running at http://localhost:${config.server.port}`);
});
