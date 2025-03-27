'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const client = require('prom-client');
const { swaggerSpec, swaggerUiOptions } = require('./config/swagger');
const eventRoutes = require('./routes/events');

// =======================
//  Express Application Setup
// =======================

const app = express();

// セキュリティとCORSの設定
const corsOptions = {
  origin: '*', // すべてのオリジンを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // CORS プリフライトリクエストの結果をキャッシュする時間（秒）
};

app.use(cors(corsOptions));

// セキュリティヘッダーの設定
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());

// Swagger UIの設定
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ルーターの設定
app.use('/api', eventRoutes);

// Export application
module.exports = { app };
