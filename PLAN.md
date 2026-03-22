# 多人服务改造方案 v2

## 需求总结

将单用户 Demo 服务器改造成多人服务，每个用户可管理多个 Agent（语音助手）。

### Agent 配置项

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| name | string | Agent 名称（显示用） | 用户配置 |
| agentIdentifier | string | Agent 标识符，用于 x-openclaw-agent-id | 用户配置，不填则自动生成 |
| icon | string | 头像 URL | 用户配置 |
| llmUrl | string | LLM API 地址 | 用户配置 |
| apiKey | string | LLM API Key | 用户配置 |
| voiceType | string | TTS 音色 (下拉选择) | 用户配置 |
| welcomeMessage | string | 欢迎语，默认 "你好" | 用户配置 |
| roomId | string | 房间号，格式 "room_xxx" | 自动生成 |
| userId | string | 用户 ID | 自动生成 |
| taskId | string | 任务 ID，格式 "task_xxx" | 自动生成 |

### 固定配置

- **AppId**: 全局共享 (环境变量)
- **ASR/TTS Provider**: volcano (固定)
- **ModelName**: openclaw (固定)
- **x-openclaw-session-key**: 等于 roomId

## 架构

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Client    │────▶│   Koa Server    │────▶│   SQLite     │
│  (多用户)   │     │  + JWT Auth     │     │              │
└─────────────┘     └────────┬────────┘     └──────────────┘
                             │
                    ┌────────▼────────┐
                    │  Volcengine API │
                    └─────────────────┘
```

## 数据库设计

### users 表
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### agents 表
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    llm_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    voice_type TEXT NOT NULL DEFAULT 'zh_female_mizai_uranus_bigtts',
    welcome_message TEXT DEFAULT '你好',
    room_id TEXT NOT NULL UNIQUE,
    user_rtc_id TEXT NOT NULL,
    task_id TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### sessions 表
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

## API 设计

### 认证 API (公开)
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录获取 JWT |

### Agent API (需认证)
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/agents` | 获取用户的 Agent 列表 |
| GET | `/agents/:id` | 获取单个 Agent 详情 |
| POST | `/agents` | 创建 Agent |
| PUT | `/agents/:id` | 更新 Agent |
| DELETE | `/agents/:id` | 删除 Agent |
| GET | `/agents/:id/rtc-config` | 获取 Agent 的 RTC 配置 (含 Token) |

### 代理 API (需认证)
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/proxy` | 代理 Volcengine API |

## 文件结构

```
/server
├── app.js              # 主入口 (重构)
├── config.js           # 配置 (NEW)
├── database.js         # 数据库 (NEW)
├── middleware/
│   └── auth.js         # JWT 认证 (NEW)
├── routes/
│   ├── auth.js         # 认证路由 (NEW)
│   ├── agents.js       # Agent CRUD (NEW)
│   └── proxy.js        # 代理路由 (NEW)
├── services/
│   ├── agentService.js # Agent 业务逻辑 (NEW)
│   └── rtcService.js   # RTC Token 生成 (NEW)
├── token.js            # RTC Token (保留)
├── util.js             # 工具函数 (保留)
└── .env                # 环境变量 (NEW)
```

## 关键代码

### config.js
```javascript
require('dotenv').config();

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: '24h'
  },
  volcengine: {
    accessKeyId: process.env.VOLCENGINE_AK,
    secretKey: process.env.VOLCENGINE_SK,
    appId: process.env.VOLCENGINE_APP_ID,
    appKey: process.env.VOLCENGINE_APP_KEY,
    asrAppId: process.env.VOLCENGINE_ASR_APP_ID,
    asrToken: process.env.VOLCENGINE_ASR_TOKEN
  },
  database: {
    path: process.env.DATABASE_PATH || './data.db'
  }
};
```

### services/agentService.js - createAgent
```javascript
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

function createAgent(userId, data) {
  const { name, icon, llmUrl, apiKey, voiceType, welcomeMessage } = data;

  const roomId = `room_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const userRtcId = uuidv4();
  const taskId = `task_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  const stmt = db.prepare(`
    INSERT INTO agents (id, user_id, name, icon, llm_url, api_key, voice_type,
                        welcome_message, room_id, user_rtc_id, task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const agentId = uuidv4();
  stmt.run(agentId, userId, name, icon || '', llmUrl, apiKey,
           voiceType || 'zh_female_mizai_uranus_bigtts',
           welcomeMessage || '你好', roomId, userRtcId, taskId);

  return getAgentById(agentId, userId);
}

function buildVoiceChatConfig(agent) {
  return {
    AppId: config.volcengine.appId,
    RoomId: agent.room_id,
    TaskId: agent.task_id,
    AgentConfig: {
      TargetUserId: [agent.user_rtc_id],
      WelcomeMessage: agent.welcome_message,
      UserId: `bot_${uuidv4().slice(0, 8)}`,
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
          'x-openclaw-agent-id': agent.name,
          'x-openclaw-session-key': agent.room_id
        },
        VisionConfig: { Enable: false },
        Feature: '{"Http":true}'
      },
      InterruptMode: 0
    }
  };
}
```

### routes/agents.js
```javascript
const Router = require('@koa/router');
const agentService = require('../services/agentService');

const router = new Router();

// 获取 Agent 列表
router.get('/', async (ctx) => {
  const agents = agentService.getUserAgents(ctx.state.user.userId);
  ctx.body = { agents };
});

// 创建 Agent
router.post('/', async (ctx) => {
  const { name, llmUrl, apiKey, voiceType, welcomeMessage, icon } = ctx.request.body;

  if (!name || !llmUrl || !apiKey) {
    ctx.status = 400;
    ctx.body = { error: 'name, llmUrl, apiKey 必填' };
    return;
  }

  const agent = agentService.createAgent(ctx.state.user.userId, {
    name, llmUrl, apiKey, voiceType, welcomeMessage, icon
  });
  ctx.body = { agent };
});

// 更新 Agent
router.put('/:id', async (ctx) => {
  const agent = agentService.updateAgent(
    ctx.params.id,
    ctx.state.user.userId,
    ctx.request.body
  );
  if (!agent) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }
  ctx.body = { agent };
});

// 删除 Agent
router.delete('/:id', async (ctx) => {
  const deleted = agentService.deleteAgent(ctx.params.id, ctx.state.user.userId);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Agent 不存在' };
    return;
  }
  ctx.body = { success: true };
});

module.exports = router;
```

## 音色

前端自行管理音色列表，创建/更新 Agent 时直接传 voiceType 值。

## 环境变量 (.env)

```
JWT_SECRET=your-secret-key
VOLCENGINE_AK=your-access-key
VOLCENGINE_SK=your-secret-key
VOLCENGINE_APP_ID=your-app-id
VOLCENGINE_APP_KEY=your-app-key
VOLCENGINE_ASR_APP_ID=asr-app-id
VOLCENGINE_ASR_TOKEN=asr-token
```

## 实现步骤

1. **安装依赖**: `yarn add @koa/router bcryptjs jsonwebtoken better-sqlite3 dotenv`
2. **创建配置**: config.js, .env
3. **创建数据库**: database.js, 表初始化
4. **创建认证**: middleware/auth.js, routes/auth.js
5. **创建 Agent 服务**: services/agentService.js
6. **创建路由**: routes/agents.js, routes/proxy.js
7. **重构主入口**: app.js
8. **删除旧文件**: scenes/, json-backup/

## 验证

```bash
# 注册
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 登录
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 创建 Agent
curl -X POST http://localhost:3001/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"助手A","llmUrl":"http://example.com/v1/chat","apiKey":"sk-xxx"}'

# 获取 Agent 列表
curl http://localhost:3001/agents -H "Authorization: Bearer <token>"
```
