/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Router = require('@koa/router');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const config = require('../config');
const authMiddleware = require('../middleware/auth');

const router = new Router();

/**
 * 用户注册
 * POST /auth/register
 */
router.post('/register', async (ctx) => {
  const { email, password, displayName } = ctx.request.body;

  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { error: '邮箱和密码不能为空' };
    return;
  }

  if (password.length < 6) {
    ctx.status = 400;
    ctx.body = { error: '密码至少6位' };
    return;
  }

  // 检查邮箱是否已注册
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    ctx.status = 400;
    ctx.body = { error: '邮箱已被注册' };
    return;
  }

  // 创建用户
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `).run(userId, email, passwordHash, displayName || email.split('@')[0]);

  // 生成 token
  const token = jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  ctx.body = {
    token,
    user: {
      id: userId,
      email,
      displayName: displayName || email.split('@')[0]
    }
  };
});

/**
 * 用户登录
 * POST /auth/login
 */
router.post('/login', async (ctx) => {
  const { email, password } = ctx.request.body;

  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { error: '邮箱和密码不能为空' };
    return;
  }

  // 查找用户
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    ctx.status = 401;
    ctx.body = { error: '邮箱或密码错误' };
    return;
  }

  // 验证密码
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    ctx.status = 401;
    ctx.body = { error: '邮箱或密码错误' };
    return;
  }

  // 生成 token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  ctx.body = {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name
    }
  };
});

/**
 * 获取当前用户信息
 * GET /auth/me
 */
router.get('/me', authMiddleware, async (ctx) => {
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?')
    .get(ctx.state.user.userId);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  ctx.body = {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at
    }
  };
});

module.exports = router;
