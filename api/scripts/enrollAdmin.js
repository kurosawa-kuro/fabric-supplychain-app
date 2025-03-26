const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

async function main() {
  const ccpPath = path.resolve(__dirname, 'connection-org1.json');
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
  const ca = new FabricCAServices(caURL);

  const wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));
  const identity = await wallet.get('admin');
  if (identity) {
    console.log('✔️ Admin identity already exists');
    return;
  }

  const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
  const x509Identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: 'Org1MSP',
    type: 'X.509',
  };
  await wallet.put('admin', x509Identity);
  console.log('✅ Successfully enrolled admin and imported into the wallet');
}

main();
