const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

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
        url: '/',
        description: 'ローカルサーバー',
      }
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
              description: 'イベントID',
              example: 'EVTA-001',
              pattern: '^EVT[A-Z]-\\d{3}$'
            },
            part_id: {
              type: 'string',
              description: '部品ID',
              example: 'BAT-001',
              pattern: '^[A-Z]+-\\d{3}$'
            },
            status: {
              type: 'string',
              description: 'ステータス',
              enum: ['assembled', 'testing', 'completed', 'shipped'],
              example: 'assembled'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'イベント発生時刻',
              example: '2025-03-26T16:00:00Z'
            },
            location: {
              type: 'string',
              description: '場所',
              example: 'ENEGEN 本社工場'
            },
            operator_id: {
              type: 'string',
              description: 'オペレーターID',
              example: 'USR-9001',
              pattern: '^USR-\\d{4}$'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'エラーメッセージ'
            }
          }
        }
      },
      responses: {
        Error: {
          description: 'エラーレスポンス',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: [path.resolve(__dirname, '../routes/*.js'), path.resolve(__dirname, '../app.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showCommonExtensions: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Parts Tracking API Documentation"
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions
}; 