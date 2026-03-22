# OpenClaw RTC Server API 文档

Base URL: `http://localhost:3001`

## 目录

- [认证](#认证)
  - [注册](#注册)
  - [登录](#登录)
  - [获取当前用户](#获取当前用户)
- [Agent 管理](#agent-管理)
  - [获取 Agent 列表](#获取-agent-列表)
  - [获取 Agent 详情](#获取-agent-详情)
  - [创建 Agent](#创建-agent)
  - [更新 Agent](#更新-agent)
  - [删除 Agent](#删除-agent)
  - [获取 RTC 配置](#获取-rtc-配置)
- [语音对话](#语音对话)
  - [启动对话](#启动对话)
  - [停止对话](#停止对话)
- [音色列表](#音色列表)

---

## 认证

所有需要认证的接口需在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

### 注册

**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "displayName": "用户昵称"  // 可选
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "用户昵称"
  }
}
```

**错误响应:**
```json
{
  "error": "邮箱已被注册"
}
```

---

### 登录

**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "用户昵称"
  }
}
```

**错误响应:**
```json
{
  "error": "邮箱或密码错误"
}
```

---

### 获取当前用户

**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "用户昵称",
    "createdAt": "2025-01-01 00:00:00"
  }
}
```

---

## Agent 管理

### 获取 Agent 列表

**GET** `/agents`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "助手小咪",
      "agent_id": "main",
      "icon": "https://example.com/avatar.png",
      "voice_type": "zh_female_mizai_uranus_bigtts",
      "welcome_message": "你好",
      "created_at": "2025-01-01 00:00:00",
      "updated_at": "2025-01-01 00:00:00"
    }
  ]
}
```

---

### 获取 Agent 详情

**GET** `/agents/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "agent": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "助手小咪",
    "agent_id": "main",
    "icon": "https://example.com/avatar.png",
    "llm_url": "http://example.com/v1/chat/completions",
    "voice_type": "zh_female_mizai_uranus_bigtts",
    "welcome_message": "你好",
    "room_id": "room_xxxxxxxx",
    "user_rtc_id": "uuid",
    "task_id": "task_xxxxxxxx",
    "created_at": "2025-01-01 00:00:00",
    "updated_at": "2025-01-01 00:00:00"
  }
}
```

> 注意：响应中不包含 `api_key` 敏感字段

---

### 创建 Agent

**POST** `/agents`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "助手小咪",                    // 必填，显示名称
  "agentIdentifier": "main",            // 可选，默认 "main"，用于 x-openclaw-agent-id
  "icon": "https://example.com/avatar.png",  // 可选，头像 URL
  "llmUrl": "http://example.com/v1/chat/completions",  // 必填，LLM API 地址
  "apiKey": "sk-xxxxxxxx",              // 必填，LLM API Key
  "voiceType": "zh_female_mizai_uranus_bigtts",  // 可选，默认见下方
  "welcomeMessage": "你好"              // 可选，默认 "你好"
}
```

**字段说明:**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | ✅ | - | Agent 显示名称 |
| agentIdentifier | string | ❌ | "main" | Agent 标识符，用于 LLM 请求头 x-openclaw-agent-id |
| icon | string | ❌ | "" | 头像图片 URL |
| llmUrl | string | ✅ | - | LLM API 地址 |
| apiKey | string | ✅ | - | LLM API Key |
| voiceType | string | ❌ | zh_female_mizai_uranus_bigtts | TTS 音色 |
| welcomeMessage | string | ❌ | "你好" | 欢迎语 |

**Response:**
```json
{
  "agent": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "助手小咪",
    "agent_id": "main",
    "icon": "https://example.com/avatar.png",
    "llm_url": "http://example.com/v1/chat/completions",
    "voice_type": "zh_female_mizai_uranus_bigtts",
    "welcome_message": "你好",
    "room_id": "room_xxxxxxxx",
    "user_rtc_id": "uuid",
    "task_id": "task_xxxxxxxx",
    "created_at": "2025-01-01 00:00:00",
    "updated_at": "2025-01-01 00:00:00"
  }
}
```

---

### 更新 Agent

**PUT** `/agents/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (所有字段可选)
```json
{
  "name": "新名称",
  "agentIdentifier": "new-id",
  "icon": "https://example.com/new-avatar.png",
  "llmUrl": "http://new-url.com/v1/chat",
  "apiKey": "sk-new-key",
  "voiceType": "zh_male_taocheng_uranus_bigtts",
  "welcomeMessage": "新的欢迎语"
}
```

**Response:**
```json
{
  "agent": { ... }
}
```

---

### 删除 Agent

**DELETE** `/agents/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

---

### 获取 RTC 配置

获取 Agent 的 RTC 连接配置（用于前端 RTC SDK 初始化）

**GET** `/agents/:id/rtc-config`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "rtcConfig": {
    "appId": "69bc26e75a5bf20166ed314c",
    "roomId": "room_xxxxxxxx",
    "userId": "uuid",
    "token": "00169bc26e75a5bf20166ed314c..."
  }
}
```

---

## 语音对话

### 启动对话

**POST** `/proxy`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "Action": "StartVoiceChat",
  "AgentId": "agent-uuid"
}
```

**Response:**
```json
{
  "Result": {
    // Volcengine API 返回结果
  }
}
```

---

### 停止对话

**POST** `/proxy`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "Action": "StopVoiceChat",
  "AgentId": "agent-uuid"
}
```

**Response:**
```json
{
  "Result": {
    // Volcengine API 返回结果
  }
}
```

---

## 音色列表

前端内置以下常用音色（`voiceType` 字段可选值）：

### 通用场景
| 名称 | voice_type |
|------|------------|
| 黑猫侦探社咪仔 2.0 | `zh_female_mizai_uranus_bigtts` |
| Vivi 2.0 | `zh_female_vv_uranus_bigtts` |
| 小何 2.0 | `zh_female_xiaohe_uranus_bigtts` |
| 云舟 2.0 | `zh_male_m191_uranus_bigtts` |
| 小天 2.0 | `zh_male_taocheng_uranus_bigtts` |
| 刘飞 2.0 | `zh_male_liufei_uranus_bigtts` |

### 角色扮演
| 名称 | voice_type |
|------|------------|
| 知性灿灿 2.0 | `zh_female_cancan_uranus_bigtts` |
| 撒娇学妹 2.0 | `zh_female_sajiaoxuemei_uranus_bigtts` |
| 可爱女生 | `saturn_zh_female_keainvsheng_tob` |
| 调皮公主 | `saturn_zh_female_tiaopigongzhu_tob` |

### 教育场景
| 名称 | voice_type |
|------|------------|
| Tina老师 2.0 | `zh_female_yingyujiaoxue_uranus_bigtts` |

### 客服场景
| 名称 | voice_type |
|------|------------|
| 暖阳女声 2.0 | `zh_female_kefunvsheng_uranus_bigtts` |

---

## 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 无效 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式:**
```json
{
  "error": "错误信息描述"
}
```

---

## 前端集成流程

### 1. 用户注册/登录
```javascript
// 注册或登录获取 token
const { token } = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(r => r.json());

// 存储 token
localStorage.setItem('token', token);
```

### 2. 获取/创建 Agent
```javascript
// 获取 Agent 列表
const { agents } = await fetch('/agents', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 或创建新 Agent
const { agent } = await fetch('/agents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '我的助手',
    llmUrl: 'http://your-llm-server.com/v1/chat/completions',
    apiKey: 'your-api-key'
  })
}).then(r => r.json());
```

### 3. 初始化 RTC
```javascript
// 获取 RTC 配置
const { rtcConfig } = await fetch(`/agents/${agentId}/rtc-config`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 使用配置初始化 RTC SDK
const engine = VERTC.createEngine(rtcConfig.appId);
await engine.joinRoom(rtcConfig.token, rtcConfig.roomId, {
  userId: rtcConfig.userId
});
```

### 4. 启动语音对话
```javascript
await fetch('/proxy', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    Action: 'StartVoiceChat',
    AgentId: agentId
  })
});
```

---

## 环境信息

- 服务端口: `3001`
- Token 有效期: `24小时`
- 默认音色: `zh_female_mizai_uranus_bigtts`
- 默认欢迎语: `你好`
- 默认 Agent 标识符: `main`
