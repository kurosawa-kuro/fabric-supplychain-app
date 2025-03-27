const fs = require('fs');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');

const APP_CONFIG = {
  WALLET_PATH: path.resolve(__dirname, '../wallet'),
  CCP_PATH: path.resolve(__dirname, '../config', 'connection-org1.json'),
  IDENTITY: 'appUser',
  CHANNEL_NAME: 'mychannel',
  CONTRACT_NAME: 'part_event'
};

class OnchainService {
  async getContract() {
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
  }

  async recordPartEvent(params) {
    const { contract, gateway } = await this.getContract();
    try {
      const result = await contract.submitTransaction(
        'recordPartEvent',
        ...params
      );
      return result;
    } finally {
      await gateway.disconnect();
    }
  }

  async queryPartEvent(eventId) {
    const { contract, gateway } = await this.getContract();
    try {
      const result = await contract.evaluateTransaction('queryPartEvent', eventId);
      return result;
    } finally {
      await gateway.disconnect();
    }
  }
}

module.exports = new OnchainService(); 