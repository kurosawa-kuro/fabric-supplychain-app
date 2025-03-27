'use strict';

const client = require('prom-client');

// =======================
//  Prometheus Metrics Configuration
// =======================

const METRICS = {
  // Initialize default metrics
  init: () => {
    client.collectDefaultMetrics();
  },

  // Request counter
  requestCounter: new client.Counter({
    name: 'express_app_requests_total',
    help: 'Total number of requests received by the Express app',
    labelNames: ['method', 'route'],
  }),

  // Transaction duration
  transactionDuration: new client.Histogram({
    name: 'fabric_transaction_duration_seconds',
    help: 'Duration of Fabric transactions',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  // Transaction counter
  transactionCounter: new client.Counter({
    name: 'fabric_transactions_total',
    help: 'Total number of Fabric transactions',
    labelNames: ['operation', 'status'],
  }),

  // Error counter
  errorCounter: new client.Counter({
    name: 'fabric_errors_total',
    help: 'Total number of Fabric-related errors',
    labelNames: ['operation', 'error_type'],
  })
};

// Initialize metrics
METRICS.init();

module.exports = METRICS; 