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

  const userExists = await wallet.get('appUser');
  if (userExists) {
    console.log('✔️ appUser already registered');
    return;
  }

  const adminIdentity = await wallet.get('admin');
  if (!adminIdentity) {
    console.log('⚠️ Admin identity not found. Please run enrollAdmin.js first.');
    return;
  }

  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, 'admin');

  await ca.register({
    enrollmentID: 'appUser',
    enrollmentSecret: 'appUserpw',  // ← ★ここを明示
    affiliation: 'org1.department1',
    role: 'client',
  }, adminUser);

  const enrollment = await ca.enroll({
    enrollmentID: 'appUser',
    enrollmentSecret: 'appUserpw',
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
  console.log('✅ Registered and enrolled appUser successfully');
}

main();
