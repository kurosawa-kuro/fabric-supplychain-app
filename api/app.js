'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');
const { db, initializeMasterData } = require('./database/initializeMasterData');
const { createHashBySortedKeys } = require('./util');
const client = require('prom-client');

// =======================
//  Constants & Configuration
// =======================

const APP_CONFIG = {
  WALLET_PATH: path.resolve(__dirname, 'wallet'),
  CCP_PATH: path.resolve(__dirname, 'config', 'connection-org1.json'),
  IDENTITY: 'appUser',
  CHANNEL_NAME: 'mychannel',
  CONTRACT_NAME: 'part_event'
};

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

// =======================
//  Database Operations
// =======================

const DB_OPERATIONS = {
  // Initialize master data
  initialize: () => {
    initializeMasterData();
  },

  // Part operations
  getPartById: (partId) => {
    return db.get('parts').find({ part_id: partId }).value();
  },

  // Supplier operations
  getSupplierById: (supplierId) => {
    return db.get('suppliers').find({ supplier_id: supplierId }).value();
  },

  // Operator operations
  getOperatorById: (operatorId) => {
    return db.get('operators').find({ operator_id: operatorId }).value();
  },

  // Event operations
  saveEvent: (newEvent) => {
    db.get('events').remove({ event_id: newEvent.event_id }).write();
    db.get('events').push(newEvent).write();
  },

  getEventById: (eventId) => {
    return db.get('events').find({ event_id: eventId }).value();
  },

  getAllEvents: () => {
    return db.get('events').value();
  }
};

// Initialize database
DB_OPERATIONS.initialize();

// =======================
//  Fabric Network Operations
// =======================

const FABRIC_OPERATIONS = {
  getContract: async () => {
    const ccp = JSON.parse(fs.readFileSync(APP_CONFIG.CCP_PATH, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(APP_CONFIG.WALLET_PATH);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: APP_CONFIG.IDENTITY,
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork(APP_CONFIG.CHANNEL_NAME);
    const contract = network.getContract(APP_CONFIG.CONTRACT_NAME);

    return { contract, gateway };
  },

  recordPartEvent: async (contract, params) => {
    return await contract.submitTransaction(
      'recordPartEvent',
      ...params
    );
  },

  queryPartEvent: async (contract, eventId) => {
    return await contract.evaluateTransaction('queryPartEvent', eventId);
  }
};

// =======================
//  Express Application Setup
// =======================

const app = express();
app.use(express.json());

// =======================
//  Route Handlers
// =======================

const ROUTE_HANDLERS = {
  // Metrics endpoint
  getMetrics: async (req, res) => {
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  },

  // Part event registration
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
      const partData = DB_OPERATIONS.getPartById(partId);
      const supplierData = partData ? DB_OPERATIONS.getSupplierById(partData.supplier_id) : null;
      const operatorData = DB_OPERATIONS.getOperatorById(operatorId);

      if (!partData || !supplierData || !operatorData) {
        METRICS.errorCounter.inc({ operation: 'recordPartEvent', error_type: 'missing_master_data' });
        return res.status(400).json({ error: 'マスターデータが不足しています' });
      }

      const partHash = createHashBySortedKeys(partData);
      const supplierHash = createHashBySortedKeys(supplierData);
      const operatorHash = createHashBySortedKeys(operatorData);

      const { contract, gateway } = await FABRIC_OPERATIONS.getContract();
      const txResult = await FABRIC_OPERATIONS.recordPartEvent(contract, [
        eventId, partId, status, timestamp, location, operatorId,
        partHash, supplierHash, operatorHash
      ]);
      await gateway.disconnect();

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
      DB_OPERATIONS.saveEvent(newEventData);

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
  getQueryEvent: async (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    const { event_id: eventId } = req.params;
    try {
      const { contract, gateway } = await FABRIC_OPERATIONS.getContract();
      const result = await FABRIC_OPERATIONS.queryPartEvent(contract, eventId);
      await gateway.disconnect();

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
  getVerifyEvent: async (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    const { event_id: eventId } = req.params;
    try {
      const { contract, gateway } = await FABRIC_OPERATIONS.getContract();
      const onChainResult = await FABRIC_OPERATIONS.queryPartEvent(contract, eventId);
      const onChainData = JSON.parse(onChainResult.toString());
      await gateway.disconnect();

      const offChainData = DB_OPERATIONS.getEventById(eventId);
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
  getAllEvents: (req, res) => {
    const endTimer = METRICS.transactionDuration.startTimer();
    METRICS.requestCounter.inc({ method: req.method, route: req.originalUrl });

    try {
      const events = DB_OPERATIONS.getAllEvents();
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
