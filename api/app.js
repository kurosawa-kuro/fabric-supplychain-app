'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');
const crypto = require('crypto');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(path.resolve(__dirname, 'db.json'));
const db = low(adapter);

const app = express();
app.use(express.json());

function seedMasterData() {
  const defaultData = {
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

  db.defaults(defaultData).write();
  console.log('✅ db.json にマスターデータをシードしました（常時上書き）');
}

seedMasterData();

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

function hashDimensionData(data) {
  const ordered = Object.keys(data).sort().reduce((obj, key) => {
    obj[key] = data[key];
    return obj;
  }, {});
  return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

app.post('/api/part-event', async (req, res) => {
  const { event_id, part_id, status, timestamp, location, operator_id } = req.body;

  try {
    const part = db.get('parts').find({ part_id }).value();
    const supplier = db.get('suppliers').find({ supplier_id: part?.supplier_id }).value();
    const operator = db.get('operators').find({ operator_id }).value();

    if (!part || !supplier || !operator) {
      return res.status(400).json({ error: 'マスターデータが不足しています' });
    }

    const partHash = hashDimensionData(part);
    const supplierHash = hashDimensionData(supplier);
    const operatorHash = hashDimensionData(operator);

    const { contract, gateway } = await getContract();
    const result = await contract.submitTransaction(
      'recordPartEvent',
      event_id,
      part_id,
      status,
      timestamp,
      location,
      operator_id,
      partHash,
      supplierHash,
      operatorHash
    );
    await gateway.disconnect();

    // event_idの重複チェック（重複なら上書き）
    db.get('events').remove({ event_id }).write();

    db.get('events')
      .push({
        event_id,
        part_id,
        status,
        timestamp,
        location,
        operator_id,
        part_hash: partHash,
        supplier_hash: supplierHash,
        operator_hash: operatorHash
      })
      .write();

    res.json({ success: true, txResult: result.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/query/:event_id', async (req, res) => {
  const { event_id } = req.params;
  try {
    const { contract, gateway } = await getContract();
    const result = await contract.evaluateTransaction('queryPartEvent', event_id);
    await gateway.disconnect();
    res.json({ event_id, result: JSON.parse(result.toString()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/verify/:event_id', async (req, res) => {
  const { event_id } = req.params;
  try {
    const onChain = await getContract();
    const result = await onChain.contract.evaluateTransaction('queryPartEvent', event_id);
    const chainData = JSON.parse(result.toString());
    await onChain.gateway.disconnect();

    const offChain = db.get('events').find({ event_id }).value();
    if (!offChain) {
      return res.status(404).json({ error: 'オフチェーンイベントが見つかりません' });
    }

    const matches =
      chainData.part_hash === offChain.part_hash &&
      chainData.supplier_hash === offChain.supplier_hash &&
      chainData.operator_hash === offChain.operator_hash;

    res.json({
      event_id,
      isValid: matches,
      onChainHash: {
        part_hash: chainData.part_hash,
        supplier_hash: chainData.supplier_hash,
        operator_hash: chainData.operator_hash
      },
      offChainHash: {
        part_hash: offChain.part_hash,
        supplier_hash: offChain.supplier_hash,
        operator_hash: offChain.operator_hash
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 API server with Fabric SDK listening on port 3000');
});