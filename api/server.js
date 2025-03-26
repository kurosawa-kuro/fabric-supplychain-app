// file: server.js

const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const { app } = require('./app');

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
