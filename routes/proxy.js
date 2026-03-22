/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const Router = require('@koa/router');
const { Signer } = require('@volcengine/openapi');
const fetch = require('node-fetch');
const agentService = require('../services/agentService');
const config = require('../config');

const router = new Router();

/**
 * 代理 Volcengine API
 * POST /proxy
 */
router.post('/', async (ctx) => {
  const { Action, Version = '2024-12-01', AgentId } = ctx.request.body;

  if (!Action) {
    ctx.status = 400;
    ctx.body = { error: 'Action 不能为空' };
    return;
  }

  if (!AgentId) {
    ctx.status = 400;
    ctx.body = { error: 'AgentId 不能为空' };
    return;
  }

  // 获取 Agent 完整配置
  const agent = agentService.getAgentFullConfig(AgentId, ctx.state.user.userId);
  if (!agent) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }

  let body = {};

  switch (Action) {
    case 'StartVoiceChat':
      body = agentService.buildVoiceChatConfig(agent);
      break;
    case 'StopVoiceChat':
      body = {
        AppId: config.volcengine.appId,
        RoomId: agent.room_id,
        TaskId: agent.task_id
      };
      break;
    default:
      ctx.status = 400;
      ctx.body = { error: `不支持的 Action: ${Action}` };
      return;
  }

  // 构建请求
  const openApiRequestData = {
    region: 'cn-north-1',
    method: 'POST',
    params: { Action, Version },
    headers: {
      Host: 'rtc.volcengineapi.com',
      'Content-Type': 'application/json'
    },
    body
  };

  // 签名
  const signer = new Signer(openApiRequestData, 'rtc');
  signer.addAuthorization({
    accessKeyId: config.volcengine.accessKeyId,
    secretKey: config.volcengine.secretKey
  });

  // 发送请求
  try {
    const result = await fetch(
      `https://rtc.volcengineapi.com?Action=${Action}&Version=${Version}`,
      {
        method: 'POST',
        headers: openApiRequestData.headers,
        body: JSON.stringify(body)
      }
    );

    ctx.body = await result.json();
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: `代理请求失败: ${err.message}` };
  }
});

module.exports = router;
