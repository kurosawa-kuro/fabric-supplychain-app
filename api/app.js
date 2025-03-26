'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');

const app = express();
app.use(express.json());

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

app.post('/api/part-event', async (req, res) => {
  const { event_id, part_id, status, timestamp, location, operator_id } = req.body;

  try {
    const partHash = '0xabc123';
    const supplierHash = '0xdef456';
    const operatorHash = '0xghi789';

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

app.listen(3000, () => {
  console.log('🚀 API server with Fabric SDK listening on port 3000');
});