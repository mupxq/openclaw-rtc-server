/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const config = require('../config');
const { AccessToken, privileges } = require('../token');

/**
 * 获取用户的所有 Agent
 */
function getUserAgents(userId) {
  return db.prepare(`
    SELECT id, name, agent_id, icon, voice_type, welcome_message, created_at, updated_at
    FROM agents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
}

/**
 * 获取单个 Agent 详情
 */
function getAgentById(agentId, userId) {
  const agent = db.prepare(`
    SELECT * FROM agents WHERE id = ? AND user_id = ?
  `).get(agentId, userId);

  if (!agent) return null;

  // 不返回敏感字段
  delete agent.api_key;
  return agent;
}

/**
 * 创建 Agent
 */
function createAgent(userId, data) {
  const { name, agentIdentifier, icon, llmUrl, apiKey, voiceType, welcomeMessage } = data;

  if (!name || !llmUrl || !apiKey) {
    throw new Error('name, llmUrl, apiKey 必填');
  }

  // 生成唯一标识
  const dbId = uuidv4();
  const agentId = agentIdentifier || 'main';
  const roomId = `room_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const userRtcId = uuidv4();
  const taskId = `task_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  db.prepare(`
    INSERT INTO agents (id, user_id, name, agent_id, icon, llm_url, api_key, voice_type,
                        welcome_message, room_id, user_rtc_id, task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dbId, userId, name, agentId, icon || '', llmUrl, apiKey,
    voiceType || 'zh_female_mizai_uranus_bigtts',
    welcomeMessage || '你好', roomId, userRtcId, taskId
  );

  return getAgentById(dbId, userId);
}

/**
 * 更新 Agent
 */
function updateAgent(agentDbId, userId, data) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
    .get(agentDbId, userId);

  if (!agent) return null;

  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.agentIdentifier !== undefined) {
    updates.push('agent_id = ?');
    values.push(data.agentIdentifier);
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    values.push(data.icon);
  }
  if (data.llmUrl !== undefined) {
    updates.push('llm_url = ?');
    values.push(data.llmUrl);
  }
  if (data.apiKey !== undefined) {
    updates.push('api_key = ?');
    values.push(data.apiKey);
  }
  if (data.voiceType !== undefined) {
    updates.push('voice_type = ?');
    values.push(data.voiceType);
  }
  if (data.welcomeMessage !== undefined) {
    updates.push('welcome_message = ?');
    values.push(data.welcomeMessage);
  }

  if (updates.length === 0) return getAgentById(agentDbId, userId);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(agentDbId, userId);

  db.prepare(`
    UPDATE agents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
  `).run(...values);

  return getAgentById(agentDbId, userId);
}

/**
 * 删除 Agent
 */
function deleteAgent(agentId, userId) {
  const result = db.prepare('DELETE FROM agents WHERE id = ? AND user_id = ?')
    .run(agentId, userId);

  return result.changes > 0;
}

/**
 * 获取 Agent 的 RTC 配置（包含 Token）
 */
function getAgentRtcConfig(agentId, userId) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
    .get(agentId, userId);

  if (!agent) return null;

  // 生成 RTC Token
  const accessToken = new AccessToken(
    config.volcengine.appId,
    config.volcengine.appKey,
    agent.room_id,
    agent.user_rtc_id
  );
  accessToken.addPrivilege(privileges.PrivSubscribeStream, 0);
  accessToken.addPrivilege(privileges.PrivPublishStream, 0);
  accessToken.expireTime(Math.floor(Date.now() / 1000) + 24 * 3600);

  return {
    appId: config.volcengine.appId,
    roomId: agent.room_id,
    userId: agent.user_rtc_id,
    token: accessToken.serialize()
  };
}

/**
 * 构建 VoiceChat 配置（用于代理请求）
 */
function buildVoiceChatConfig(agent) {
  const botUserId = `bot_${uuidv4().slice(0, 8)}`;

  return {
    AppId: config.volcengine.appId,
    RoomId: agent.room_id,
    TaskId: agent.task_id,
    AgentConfig: {
      TargetUserId: [agent.user_rtc_id],
      WelcomeMessage: agent.welcome_message,
      UserId: botUserId,
      EnableConversationStateCallback: true
    },
    Config: {
      ASRConfig: {
        Provider: 'volcano',
        ProviderParams: {
          Mode: 'bigmodel',
          AppId: config.volcengine.asrAppId,
          AccessToken: config.volcengine.asrToken,
          ApiResourceId: 'volc.bigasr.sauc.duration'
        }
      },
      TTSConfig: {
        Provider: 'volcano_bidirection',
        ProviderParams: {
          app: {
            appid: config.volcengine.asrAppId,
            token: config.volcengine.asrToken
          },
          audio: {
            voice_type: agent.voice_type,
            speech_rate: 0
          },
          ResourceId: 'seed-tts-2.0'
        }
      },
      LLMConfig: {
        Mode: 'CustomLLM',
        URL: agent.llm_url,
        APIKey: agent.api_key,
        ModelName: 'openclaw',
        SystemMessages: [''],
        HistoryLength: 0,
        ExtraHeader: {
          'x-openclaw-agent-id': agent.agent_id,
          'x-openclaw-session-key': `agent:${agent.agent_id}:${agent.room_id}`
        },
        VisionConfig: { Enable: false },
        Feature: '{"Http":true}'
      },
      InterruptMode: 0
    }
  };
}

/**
 * 获取 Agent 完整配置（包含敏感字段，仅内部使用）
 */
function getAgentFullConfig(agentId, userId) {
  return db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
    .get(agentId, userId);
}

module.exports = {
  getUserAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentRtcConfig,
  buildVoiceChatConfig,
  getAgentFullConfig
};
