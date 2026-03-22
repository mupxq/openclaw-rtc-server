# Multi-User RTC Server

多用户实时语音对话服务器，支持每个用户创建和管理多个 AI Agent。

## 快速开始

```bash
# 安装依赖
yarn

# 启动服务
yarn dev
```

服务运行在 `http://localhost:3001`

## 环境配置

复制 `.env.example` 为 `.env` 并填写配置：

```env
JWT_SECRET=your-secret-key

# 火山引擎凭证
VOLCENGINE_AK=your-access-key
VOLCENGINE_SK=your-secret-key
VOLCENGINE_APP_ID=your-app-id
VOLCENGINE_APP_KEY=your-app-key

# ASR/TTS 配置
VOLCENGINE_ASR_APP_ID=asr-app-id
VOLCENGINE_ASR_TOKEN=asr-token
```

## API 端点

### 认证 API
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录，获取 JWT Token |
| GET | `/auth/me` | 获取当前用户信息 |

### Agent API (需认证)
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/agents` | 获取用户的 Agent 列表 |
| GET | `/agents/:id` | 获取单个 Agent 详情 |
| POST | `/agents` | 创建新 Agent |
| PUT | `/agents/:id` | 更新 Agent |
| DELETE | `/agents/:id` | 删除 Agent |
| GET | `/agents/:id/rtc-config` | 获取 Agent 的 RTC 连接配置 |

### 代理 API (需认证)
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/proxy` | 代理语音对话请求 |

## Agent 字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | ✅ | - | Agent 显示名称 |
| `agentIdentifier` | string | | "main" | Agent 标识符，用于 LLM 请求头 |
| `icon` | string | | "" | 头像图片 URL |
| `llmUrl` | string | ✅ | - | LLM API 地址 |
| `apiKey` | string | ✅ | - | LLM API Key |
| `voiceType` | string | | zh_female_mizai_uranus_bigtts | TTS 音色 |
| `welcomeMessage` | string | | "你好" | 欢迎语 |

## 认证方式

所有需要认证的接口需在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

## 相关链接

- [API 详细文档](./API.md) - 前端开发参考
- [火山引擎 RTC 文档](https://www.volcengine.com/docs/6348/1558163)
- [火山引擎控制台](https://console.volcengine.com/rtc/aigc/listRTC)

## 技术栈

- Node.js + Koa
- SQLite (better-sqlite3)
- JWT 认证
- 火山引擎 RTC SDK
