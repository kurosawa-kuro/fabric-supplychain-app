// file: server.js

'use strict';

const path = require('path');
const { Wallets } = require('fabric-network');
const { app } = require('./app');

let server = null;

// =======================
//  アプリの起動前ウォレット確認
// =======================
async function startServer() {
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

    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
      console.log(`🚀 API server with Fabric SDK listening on port ${port}`);
    });

    return server;
  } catch (error) {
    console.error('ウォレット確認時エラー:', error.message);
    process.exit(1);
  }
}

// テスト環境でない場合のみサーバーを起動
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = {
  startServer,
  getServer: () => server
};
