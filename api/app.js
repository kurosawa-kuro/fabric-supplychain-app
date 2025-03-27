'use strict';

const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { createHashBySortedKeys } = require('./util');
const client = require('prom-client');
const METRICS = require('./metrics');
const onchainService = require('./services/onchainService');
const offchainService = require('./services/offchainService');

// Swagger設定
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Parts Tracking API',
      version: '1.0.0',
      description: '部品追跡システムのAPI仕様書',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-domain.com' 
          : `http://43.207.190.23:${process.env.PORT || 8080}`,
        description: process.env.NODE_ENV === 'production' ? '本番サーバー' : '開発サーバー',
      },
    ],
    tags: [
      {
        name: 'Events',
        description: '部品イベント関連のエンドポイント'
      },
      {
        name: 'Metrics',
        description: 'メトリクス関連のエンドポイント'
      }
    ],
    components: {
      schemas: {
        Event: {
          type: 'object',
          required: ['event_id', 'part_id', 'status', 'timestamp', 'location', 'operator_id'],
          properties: {
            event_id: {
              type: 'string',
              description: 'イベントID'
            },
            part_id: {
              type: 'string',
              description: '部品ID'
            },
            status: {
              type: 'string',
              description: 'ステータス'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'イベント発生時刻'
            },
            location: {
              type: 'string',
              description: '場所'
            },
            operator_id: {
              type: 'string',
              description: 'オペレーターID'
            }
          }
        }
      }
    }
  },
  apis: [__filename], // 現在のファイルを指定
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showCommonExtensions: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
}));

// =======================
//  Route Handlers
// =======================

const ROUTE_HANDLERS = {
  // Metrics endpoint
  /**
   * @swagger
   * /metrics:
   *   get:
   *     summary: Prometheusメトリクスを取得
   *     tags: [Metrics]
   *     responses:
   *       200:
   *         description: メトリクスデータ
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   */
  getMetrics: async (req, res) => {
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  },

  // Part event registration
  /**
   * @swagger
   * /api/part-event:
   *   post:
   *     summary: 部品イベントを登録
   *     tags: [Events]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Event'
   *     responses:
   *       200:
   *         description: イベント登録成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 txResult:
   *                   type: string
   *       400:
   *         description: マスターデータ不足
   *       500:
   *         description: サーバーエラー
   */
  postPartEvent: async (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    const {
      event_id: eventId,
      part_id: partId,
      status,
      timestamp,
      location,
      operator_id: operatorId
    } = req.body;

    try {
      const partData = offchainService.getPartById(partId);
      const supplierData = partData ? offchainService.getSupplierById(partData.supplier_id) : null;
      const operatorData = offchainService.getOperatorById(operatorId);

      if (!partData || !supplierData || !operatorData) {
        METRICS.errorCounter.inc({ operation: 'recordPartEvent', error_type: 'missing_master_data' });
        return res.status(400).json({ error: 'マスターデータが不足しています' });
      }

      const partHash = createHashBySortedKeys(partData);
      const supplierHash = createHashBySortedKeys(supplierData);
      const operatorHash = createHashBySortedKeys(operatorData);

      const txResult = await onchainService.recordPartEvent([
        eventId, partId, status, timestamp, location, operatorId,
        partHash, supplierHash, operatorHash
      ]);

      const newEventData = {
        event_id: eventId,
        part_id: partId,
        status,
        timestamp,
        location,
        operator_id: operatorId,
        part_hash: partHash,
        supplier_hash: supplierHash,
        operator_hash: operatorHash
      };
      offchainService.saveEvent(newEventData);

      METRICS.transactionCounter.inc({ operation: 'recordPartEvent', status: 'success' });
      endTimer({ operation: 'recordPartEvent' });

      console.log('アクション：イベント登録');
      res.json({ success: true, txResult: txResult.toString() });
    } catch (error) {
      METRICS.transactionCounter.inc({ operation: 'recordPartEvent', status: 'failure' });
      METRICS.errorCounter.inc({ operation: 'recordPartEvent', error_type: error.name });
      endTimer({ operation: 'recordPartEvent' });
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },

  // Query event from chain
  /**
   * @swagger
   * /api/query/{event_id}:
   *   get:
   *     summary: チェーン上からイベントを取得
   *     tags: [Events]
   *     parameters:
   *       - in: path
   *         name: event_id
   *         required: true
   *         schema:
   *           type: string
   *         description: 取得するイベントのID
   *     responses:
   *       200:
   *         description: イベントデータ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event_id:
   *                   type: string
   *                 result:
   *                   type: object
   *       500:
   *         description: サーバーエラー
   */
  getQueryEvent: async (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    const { event_id: eventId } = req.params;
    try {
      const result = await onchainService.queryPartEvent(eventId);
      const chainData = JSON.parse(result.toString());
      METRICS.transactionCounter.inc({ operation: 'queryPartEvent', status: 'success' });
      endTimer({ operation: 'queryPartEvent' });

      console.log('アクション：チェーン上データ取得');
      res.json({ event_id: eventId, result: chainData });
    } catch (error) {
      METRICS.transactionCounter.inc({ operation: 'queryPartEvent', status: 'failure' });
      METRICS.errorCounter.inc({ operation: 'queryPartEvent', error_type: error.name });
      endTimer({ operation: 'queryPartEvent' });
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },

  // Verify event hashes
  /**
   * @swagger
   * /api/verify/{event_id}:
   *   get:
   *     summary: イベントのハッシュを検証
   *     tags: [Events]
   *     parameters:
   *       - in: path
   *         name: event_id
   *         required: true
   *         schema:
   *           type: string
   *         description: 検証するイベントのID
   *     responses:
   *       200:
   *         description: 検証結果
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event_id:
   *                   type: string
   *                 isValid:
   *                   type: boolean
   *                 onChainHash:
   *                   type: object
   *                 offChainHash:
   *                   type: object
   *       404:
   *         description: イベントが見つかりません
   *       500:
   *         description: サーバーエラー
   */
  getVerifyEvent: async (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    const { event_id: eventId } = req.params;
    try {
      const onChainResult = await onchainService.queryPartEvent(eventId);
      const onChainData = JSON.parse(onChainResult.toString());

      const offChainData = offchainService.getEventById(eventId);
      if (!offChainData) {
        METRICS.errorCounter.inc({ operation: 'verifyPartEvent', error_type: 'event_not_found' });
        return res.status(404).json({ error: 'オフチェーンイベントが見つかりません' });
      }

      const isMatch = (
        onChainData.part_hash === offChainData.part_hash &&
        onChainData.supplier_hash === offChainData.supplier_hash &&
        onChainData.operator_hash === offChainData.operator_hash
      );

      METRICS.transactionCounter.inc({ operation: 'verifyPartEvent', status: 'success' });
      endTimer({ operation: 'verifyPartEvent' });

      console.log('アクション：ハッシュ比較');
      res.json({
        event_id: eventId,
        isValid: isMatch,
        onChainHash: {
          part_hash: onChainData.part_hash,
          supplier_hash: onChainData.supplier_hash,
          operator_hash: onChainData.operator_hash
        },
        offChainHash: {
          part_hash: offChainData.part_hash,
          supplier_hash: offChainData.supplier_hash,
          operator_hash: offChainData.operator_hash
        }
      });
    } catch (error) {
      METRICS.transactionCounter.inc({ operation: 'verifyPartEvent', status: 'failure' });
      METRICS.errorCounter.inc({ operation: 'verifyPartEvent', error_type: error.name });
      endTimer({ operation: 'verifyPartEvent' });
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all events
  /**
   * @swagger
   * /api/events:
   *   get:
   *     summary: 全イベントを取得
   *     tags: [Events]
   *     responses:
   *       200:
   *         description: イベント一覧
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Event'
   *       500:
   *         description: サーバーエラー
   */
  getAllEvents: (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    try {
      const events = offchainService.getAllEvents();
      METRICS.transactionCounter.inc({ operation: 'getAllEvents', status: 'success' });
      endTimer({ operation: 'getAllEvents' });

      console.log('アクション：イベント一覧取得');
      res.json(events);
    } catch (error) {
      METRICS.transactionCounter.inc({ operation: 'getAllEvents', status: 'failure' });
      METRICS.errorCounter.inc({ operation: 'getAllEvents', error_type: error.name });
      endTimer({ operation: 'getAllEvents' });
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
};

// =======================
//  Route Definitions
// =======================

app.get('/metrics', ROUTE_HANDLERS.getMetrics);
app.post('/api/part-event', ROUTE_HANDLERS.postPartEvent);
app.get('/api/query/:event_id', ROUTE_HANDLERS.getQueryEvent);
app.get('/api/verify/:event_id', ROUTE_HANDLERS.getVerifyEvent);
app.get('/api/events', ROUTE_HANDLERS.getAllEvents);

// Export application
module.exports = { app };
