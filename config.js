/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

require('dotenv').config();

// 验证必要的环境变量
const requiredEnvVars = [
  'VOLCENGINE_AK',
  'VOLCENGINE_SK',
  'VOLCENGINE_APP_ID',
  'VOLCENGINE_APP_KEY',
  'VOLCENGINE_ASR_APP_ID',
  'VOLCENGINE_ASR_TOKEN'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ 缺少必要的环境变量:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\n请创建 .env 文件并配置这些变量。参考 .env.example');
  process.exit(1);
}

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
