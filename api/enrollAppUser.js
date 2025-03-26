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

  const enrollment = await ca.enroll({
    enrollmentID: 'appUser',
    enrollmentSecret: 'appUserpw'
  });

  const x509Identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: 'Org1MSP',
    type: 'X.509',
  };

  await wallet.put('appUser', x509Identity);
  console.log('✅ Enrolled appUser and saved to wallet');
}

main();
