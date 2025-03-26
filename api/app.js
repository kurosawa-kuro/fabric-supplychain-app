// Fabricチェーンコード（Node.js版）: part_event スキーマ対応 + SDK連携済みExpress API（JS）
'use strict';

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');

const app = express();
app.use(express.json());

// JSON順序安定化 & SHA-256ハッシュ生成
function hashDimensionData(data) {
  const ordered = Object.keys(data).sort().reduce((obj, key) => {
    obj[key] = data[key];
    return obj;
  }, {});
  
  const json = JSON.stringify(ordered);
  return crypto.createHash('sha256').update(json).digest('hex');
}

// POST /api/part-event（lowdbなし、ハッシュは仮定値）
app.post('/api/part-event', async (req, res) => {
  const { event_id, part_id, status, timestamp, location, operator_id } = req.body;

  // 仮のハッシュ値を使用（実際はDBやAPIで取得して生成）
  const partHash = '0xabc123';
  const supplierHash = '0xdef456';
  const operatorHash = '0xghi789';

  try {
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'appUser',
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('part_event');

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
    res.json({ success: true, txResult: result.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 API server with Fabric SDK listening on port 3000');
});