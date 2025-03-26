'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');
const crypto = require('crypto');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// =======================
//  DBサービス関連
// =======================


const dbFilePath = path.resolve(__dirname, 'db.json');
const adapter = new FileSync(dbFilePath);
const db = low(adapter);

/**
 * マスターデータを初期化／シード
 * 毎回上書きするため、実行時にDBが更新される
 */
function initializeMasterData() {
  const masterData = {
    parts: [
      {
        part_id: 'BAT-001',
        model: 'EV6000',
        capacity_ah: 60,
        voltage_v: 3.2,
        manufacturer: 'ENEGEN Power Systems',
        manufactured_at: '2025-03-20',
        supplier_id: 'SUP-101'
      }
    ],
    suppliers: [
      {
        supplier_id: 'SUP-101',
        name: 'エネゲンパワーシステムズ株式会社',
        location: '福島県郡山市',
        certification: 'ISO/TS 16949',
        material_type: 'LiFePO4セル'
      }
    ],
    operators: [
      {
        operator_id: 'USR-9001',
        name: '佐藤 太一',
        role: '検査員',
        organization: 'ENEGEN 第2製造所'
      }
    ],
    events: []
  };

  db.defaults(masterData).write();
  console.log('✅ db.json にマスターデータをシードしました（常時上書き）');
}

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
 * イベントをeventsに保存（同一event_idがあれば先に削除→追加）
 * @param {object} newEvent
 */
function saveEvent(newEvent) {
  db.get('events').remove({ event_id: newEvent.event_id }).write();
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
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('part_event');

  return { contract, gateway };
}

// =======================
//  ハッシュ作成関連
// =======================

/**
 * 寸法などオブジェクトのハッシュを安定化（キー順でソート）して作成
 * @param {object} data
 * @returns {string} sha256ハッシュ文字列
 */
function createHashBySortedKeys(data) {
  const sortedData = Object.keys(data)
    .sort()
    .reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});
  return crypto.createHash('sha256')
    .update(JSON.stringify(sortedData))
    .digest('hex');
}

// =======================
//  Expressアプリ／ルーティング
// =======================

const app = express();
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

  try {
    // マスターデータ取得
    const partData = getPartById(partId);
    const supplierData = partData ? getSupplierById(partData.supplier_id) : null;
    const operatorData = getOperatorById(operatorId);

    // マスターデータが足りない場合はエラー
    if (!partData || !supplierData || !operatorData) {
      return res.status(400).json({ error: 'マスターデータが不足しています' });
    }

    // ハッシュ作成
    const partHash = createHashBySortedKeys(partData);
    const supplierHash = createHashBySortedKeys(supplierData);
    const operatorHash = createHashBySortedKeys(operatorData);

    // Fabricにイベント登録
    const { contract, gateway } = await getContract();
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
    await gateway.disconnect();

    // ローカルDBにもイベント保存（同じevent_idがあれば削除→追加）
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

    res.json({ success: true, txResult: txResult.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * イベントをチェーン上から取得
 */
app.get('/api/query/:event_id', async (req, res) => {
  const { event_id: eventId } = req.params;
  try {
    const { contract, gateway } = await getContract();
    const result = await contract.evaluateTransaction('queryPartEvent', eventId);
    await gateway.disconnect();

    const chainData = JSON.parse(result.toString());
    res.json({ event_id: eventId, result: chainData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * チェーン上のハッシュとオフチェーンDBのハッシュを比較・検証
 */
app.get('/api/verify/:event_id', async (req, res) => {
  const { event_id: eventId } = req.params;
  try {
    // チェーン上データを取得
    const fabricConnection = await getContract();
    const onChainResult = await fabricConnection.contract.evaluateTransaction('queryPartEvent', eventId);
    const onChainData = JSON.parse(onChainResult.toString());
    await fabricConnection.gateway.disconnect();

    // オフチェーンDBのイベントを取得
    const offChainData = getEventById(eventId);
    if (!offChainData) {
      return res.status(404).json({ error: 'オフチェーンイベントが見つかりません' });
    }

    // ハッシュ比較
    const isMatch = (
      onChainData.part_hash === offChainData.part_hash &&
      onChainData.supplier_hash === offChainData.supplier_hash &&
      onChainData.operator_hash === offChainData.operator_hash
    );

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
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * すべてのイベントを取得
 */
app.get('/api/events', (req, res) => {
  try {
    const events = getAllEvents();
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =======================
//  アプリの起動前ウォレット確認
// =======================
(async () => {
  try {
    const walletPath = path.resolve(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const appUser = await wallet.get('appUser');

    if (!appUser) {
      console.error(
        '❌ appUser が wallet に存在しません。scripts/enrollAdmin.js と registerUser.js を実行してください。'
      );
      process.exit(1);
    }

    app.listen(3000, () => {
      console.log('🚀 API server with Fabric SDK listening on port 3000');
    });
  } catch (error) {
    console.error('ウォレット確認時エラー:', error.message);
    process.exit(1);
  }
})();
