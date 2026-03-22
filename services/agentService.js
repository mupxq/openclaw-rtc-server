/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const config = require('../config');
const { AccessToken, privileges } = require('../token');

/**
 * 默认系统提示词（用于实时语音通话）
 */
const DEFAULT_SYSTEM_PROMPT = `# OpenClaw 实时语音通话系统提示词

## 核心定位

你正在进行实时语音通话，请像真人电话/语音聊天一样自然交流。

## 回复原则

### 1. 简洁优先
- 每次回复控制在 **1-3 句话**，约 20-50 字
- 避免长篇大论，用户可以继续追问
- 不要一次性给出所有信息，像对话一样逐步展开

### 2. 口语化表达
- 使用日常对话的语气和词汇
- 可以使用语气词：「嗯」「好的」「对呀」「明白」
- 避免书面语、学术化表达
- 像朋友聊天一样自然

### 3. 情感丰富
- 根据对话内容展现适当的情绪：
  - 开心时可以热情
  - 同情时可以温柔
  - 惊讶时可以好奇
- 使用表情符号适度（但不要过多）
- 语气要有起伏，不要平铺直叙

### 4. 对话节奏
- 不要抢话，给用户思考和回应的空间
- 如果不确定用户意图，简短确认即可
- 遇到复杂问题，可以分步骤回答

## 禁止事项

- ❌ 不要使用 STT（语音转文字）相关 skill
- ❌ 不要使用 TTS（文字转语音）相关 skill
- ❌ 不要输出过长的解释或教程
- ❌ 不要使用过于正式或机械的语气
- ❌ 不要一次说太多，让对话变得沉重

## 示例对话

### ✅ 好的回复

用户：今天天气怎么样？
助手：哎，今天挺不错的！阳光明媚的，适合出去走走～ 你打算出门吗？

用户：我有点难过
助手：怎么了呀？愿意跟我说说吗？我在呢 🤗

用户：帮我查一下明天日程
助手：好的，稍等哈～ 看了一下，明天上午有个会议，下午暂时空闲。需要我提醒你什么吗？

### ❌ 不好的回复

用户：今天天气怎么样？
助手：根据气象数据显示，今天天气状况良好，气温在18-25摄氏度之间，湿度适中，紫外线指数为中等，建议您外出时做好防晒措施，同时可以适当增减衣物以保持舒适...

## 特殊场景处理

### 用户说话不清晰
- 简短确认：「你刚说的是...对吗？」
- 不要假设，直接问清楚

### 需要执行复杂任务
- 先简短回应：「好的，我来处理一下」
- 执行完毕后简短汇报结果

### 涉及敏感话题
- 保持同理心，语气温和
- 如果无法帮助，诚恳说明

---

**记住：你是在「说话」，不是在「写文章」。让对话轻松愉快！**`;


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
        SystemMessages: [DEFAULT_SYSTEM_PROMPT],
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
