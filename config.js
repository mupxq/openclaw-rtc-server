/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

require('dotenv').config();

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
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
  },
  server: {
    port: process.env.PORT || 3001
  }
};
