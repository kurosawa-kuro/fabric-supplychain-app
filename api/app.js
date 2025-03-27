'use strict';

const express = require('express');
const path = require('path');
const { createHashBySortedKeys } = require('./util');
const client = require('prom-client');
const METRICS = require('./metrics');
const onchainService = require('./services/onchainService');
const offchainService = require('./services/offchainService');

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
