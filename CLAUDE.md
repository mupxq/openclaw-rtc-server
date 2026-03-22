# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js server for Volcengine RTC AIGC (AI voice chat) demo. It proxies OpenAPI requests to Volcengine's RTC service and manages scene-based configurations for voice chat sessions.

## Commands

```bash
# Install dependencies
yarn

# Start development server (with hot reload via nodemon)
yarn dev
# or
yarn start
```

Server runs at `http://localhost:3001`

## Architecture

### Core Files
- `app.js` - Main Koa server with two API endpoints
- `token.js` - RTC token generation (AccessToken class with HMAC-SHA256 signing)
- `util.js` - Helper utilities (wrapper for API handlers, assert, readFiles for scene loading)
- `scenes/*.json` - Scene configuration files loaded at startup

### API Endpoints

**POST /proxy** - Proxies requests to Volcengine RTC OpenAPI
- Actions: `StartVoiceChat`, `StopVoiceChat`
- Requires `SceneID` in body to load scene configuration

**POST /getScenes** - Returns all available scenes with RTC config
- Auto-generates RoomId, UserId, Token if not provided
- Strips AppKey from response for security

### Scene Configuration (scenes/*.json)

Scene JSON files define voice chat sessions with:
- `SceneConfig` - UI metadata (icon, name)
- `AccountConfig` - Volcengine AK/SK credentials
- `RTCConfig` - RTC settings (AppId, AppKey, RoomId, UserId, Token)
- `VoiceChat` - Full voice chat config including:
  - `AgentConfig` - Bot settings (UserId, WelcomeMessage)
  - `Config.ASRConfig` - Speech recognition provider
  - `Config.TTSConfig` - Text-to-speech provider
  - `Config.LLMConfig` - LLM settings (Mode, URL, APIKey, ModelName, SystemMessages)
  - `Config.InterruptMode` - Voice interruption mode

### Token Generation

When RTCConfig lacks Token/UserId/RoomId, the server auto-generates them using `TokenManager.AccessToken`:
- Creates HMAC-SHA256 signed token
- Adds privileges: `PrivSubscribeStream`, `PrivPublishStream`
- Default expiry: 24 hours

## Adding New Scenes

1. Create `scenes/YourSceneName.json` following the `Custom.json` template
2. Restart the server to load the new scene
3. Get credentials from:
   - AK/SK: https://console.volcengine.com/iam/keymanage/
   - AppId/AppKey: https://console.volcengine.com/rtc/aigc/listRTC
