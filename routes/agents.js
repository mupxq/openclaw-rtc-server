/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Router = require('@koa/router');
const agentService = require('../services/agentService');

const router = new Router();

/**
 * 获取用户的 Agent 列表
 * GET /agents
 */
router.get('/', async (ctx) => {
  const agents = agentService.getUserAgents(ctx.state.user.userId);
  ctx.body = { agents };
});

/**
 * 获取单个 Agent 详情
 * GET /agents/:id
 */
router.get('/:id', async (ctx) => {
  const agent = agentService.getAgentById(ctx.params.id, ctx.state.user.userId);

  if (!agent) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }

  ctx.body = { agent };
});

/**
 * 创建 Agent
 * POST /agents
 */
router.post('/', async (ctx) => {
  const { name, agentIdentifier, llmUrl, apiKey, voiceType, welcomeMessage, icon } = ctx.request.body;

  try {
    const agent = agentService.createAgent(ctx.state.user.userId, {
      name, agentIdentifier, llmUrl, apiKey, voiceType, welcomeMessage, icon
    });
    ctx.body = { agent };
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: err.message };
  }
});

/**
 * 更新 Agent
 * PUT /agents/:id
 */
router.put('/:id', async (ctx) => {
  const { name, agentIdentifier, llmUrl, apiKey, voiceType, welcomeMessage, icon } = ctx.request.body;

  const agent = agentService.updateAgent(
    ctx.params.id,
    ctx.state.user.userId,
    { name, agentIdentifier, llmUrl, apiKey, voiceType, welcomeMessage, icon }
  );

  if (!agent) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }

  ctx.body = { agent };
});

/**
 * 删除 Agent
 * DELETE /agents/:id
 */
router.delete('/:id', async (ctx) => {
  const deleted = agentService.deleteAgent(ctx.params.id, ctx.state.user.userId);

  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }

  ctx.body = { success: true };
});

/**
 * 获取 Agent 的 RTC 配置
 * GET /agents/:id/rtc-config
 */
router.get('/:id/rtc-config', async (ctx) => {
  const rtcConfig = agentService.getAgentRtcConfig(
    ctx.params.id,
    ctx.state.user.userId
  );

  if (!rtcConfig) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }

  ctx.body = { rtcConfig };
});

module.exports = router;
