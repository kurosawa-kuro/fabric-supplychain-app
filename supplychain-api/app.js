'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');
const { db, initializeMasterData } = require('./database/initializeMasterData');
const { createHashBySortedKeys } = require('./util');
const { assignRequestId } = require('./middleware/request-id');
const { log } = require('./logger');


// =======================
//  DBサービス関連
// =======================

/**
 * マスターデータを初期化
 */
initializeMasterData();

/**
 * IDからパーツを取得
 * @param {string} partId
 */
function getPartById(partId) {
  return db.get('parts').find({ part_id: partId }).value();
}

/**
 * IDからサプライヤーを取得
 * @param {string} supplierId
 */
function getSupplierById(supplierId) {
  return db.get('suppliers').find({ supplier_id: supplierId }).value();
}

/**
 * IDからオペレーター（作業者）を取得
 * @param {string} operatorId
 */
function getOperatorById(operatorId) {
  return db.get('operators').find({ operator_id: operatorId }).value();
}

/**
 * イベントをeventsに保存
 * @param {object} newEvent
 */
function saveEvent(newEvent) {
  db.get('events').push(newEvent).write();
}

/**
 * event_idに紐づくイベントを取得
 * @param {string} eventId
 */
function getEventById(eventId) {
  return db.get('events').find({ event_id: eventId }).value();
}

/**
 * すべてのイベントを取得
 */
function getAllEvents() {
  return db.get('events').value();
}

// =======================
//  Fabricアクセス関連
// =======================

/**
 * GatewayとContractを取得
 * @returns {{ contract: Contract, gateway: Gateway }}
 */
async function getContract() {
  const ccpPath = path.resolve(__dirname, 'config', 'connection-org1.json');
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const walletPath = path.resolve(__dirname, 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'appUser',
    discovery: {
      enabled: true,
      asLocalhost: false 
    },
    tlsInfo: {
      certificate: fs.readFileSync(path.resolve(__dirname, 'config', 'tls-cert.pem')),
      hostnameOverride: 'peer0.org1.example.com'
    }
  });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('part_event');

  return { contract, gateway };
}

// =======================
//  ハッシュ作成関連
// =======================



// =======================
//  Expressアプリ／ルーティング
// =======================

const app = express();
app.use(assignRequestId);
app.use(express.json());

/**
 * パーツイベントを登録する
 */
app.post('/api/part-event', async (req, res) => {
  const {
    event_id: eventId,
    part_id: partId,
    status,
    timestamp,
    location,
    operator_id: operatorId
  } = req.body;

  log(req, `🔔 登録要求: event_id=${eventId}, part_id=${partId}, operator_id=${operatorId}`);

  try {
    // イベントIDの重複チェック
    const existingEvent = getEventById(eventId);
    if (existingEvent) {
      log(req, `⚠️ 重複イベントID: event_id=${eventId}`);
      return res.status(409).json({ error: 'event_id がすでに登録されています' });
    }

    // マスターデータ取得
    const partData = getPartById(partId);
    const supplierData = partData ? getSupplierById(partData.supplier_id) : null;
    const operatorData = getOperatorById(operatorId);

    // マスターデータが足りない場合はエラー
    if (!partData || !supplierData || !operatorData) {
      log(req, `❌ マスターデータ不足: part_id=${partId}, operator_id=${operatorId}`);
      return res.status(400).json({ error: 'マスターデータが不足しています' });
    }

    // ハッシュ作成
    const partHash = createHashBySortedKeys(partData);
    const supplierHash = createHashBySortedKeys(supplierData);
    const operatorHash = createHashBySortedKeys(operatorData);

    const { contract, gateway } = await getContract();

    // 📦 パラメータをログに出す
    log(req, '📦 Fabricに送信するパラメータ:');
    log(req, {
      eventId,
      partId,
      status,
      timestamp,
      location,
      operatorId,
      partHash,
      supplierHash,
      operatorHash
    });

    const txResult = await contract.submitTransaction(
      'recordPartEvent',
      eventId,
      partId,
      status,
      timestamp,
      location,
      operatorId,
      partHash,
      supplierHash,
      operatorHash
    );

    log(req, `✅ Fabricからの応答: ${txResult.toString()}`);

    await gateway.disconnect();

    // ローカルDBに保存
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
    saveEvent(newEventData);

    log(req, `✅ チェーン登録成功: event_id=${eventId}`);
    res.json({ success: true, txResult: txResult.toString() });
  } catch (error) {
    log(req, `❌ エラー: ${error.message}`);
    console.error(error);

    if (error.responses) {
      console.error('📩 responses:', error.responses);
    }
    if (error.errors) {
      console.error('📛 errors:', error.errors);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * イベントをチェーン上から取得
 */
app.get('/api/query/:event_id', async (req, res) => {
  const { event_id: eventId } = req.params;
  log(req, `🔍 イベント検索: event_id=${eventId}`);

  try {
    const { contract, gateway } = await getContract();
    const result = await contract.evaluateTransaction('queryPartEvent', eventId);
    await gateway.disconnect();

    const chainData = JSON.parse(result.toString());
    log(req, `✅ イベント取得成功: event_id=${eventId}`);
    res.json({ event_id: eventId, result: chainData });
  } catch (error) {
    log(req, `❌ エラー: ${error.message}`);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * チェーン上のハッシュとオフチェーンDBのハッシュを比較・検証
 */
app.get('/api/verify/:event_id', async (req, res) => {
  const { event_id: eventId } = req.params;
  log(req, `🔍 ハッシュ検証: event_id=${eventId}`);

  try {
    // チェーン上データを取得
    const fabricConnection = await getContract();
    const onChainResult = await fabricConnection.contract.evaluateTransaction('queryPartEvent', eventId);
    const onChainData = JSON.parse(onChainResult.toString());
    await fabricConnection.gateway.disconnect();

    // オフチェーンDBのイベントを取得
    const offChainData = getEventById(eventId);
    if (!offChainData) {
      log(req, `❌ オフチェーンイベント未検出: event_id=${eventId}`);
      return res.status(404).json({ error: 'オフチェーンイベントが見つかりません' });
    }

    // ハッシュ比較
    const isMatch = (
      onChainData.part_hash === offChainData.part_hash &&
      onChainData.supplier_hash === offChainData.supplier_hash &&
      onChainData.operator_hash === offChainData.operator_hash
    );

    log(req, `✅ ハッシュ検証完了: event_id=${eventId}, isMatch=${isMatch}`);
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
    log(req, `❌ エラー: ${error.message}`);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * すべてのイベントを取得
 */
app.get('/api/events', (req, res) => {
  log(req, '🔍 全イベント取得要求');
  try {
    const events = getAllEvents();
    log(req, `✅ 全イベント取得成功: ${events.length}件`);
    res.json(events);
  } catch (error) {
    log(req, `❌ エラー: ${error.message}`);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// アプリケーションをエクスポート
module.exports = { app };
