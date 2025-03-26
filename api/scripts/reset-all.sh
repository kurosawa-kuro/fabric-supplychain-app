#!/bin/bash
set -euxo pipefail

# 🔁 Docker コンテナ全停止・削除
docker stop $(docker ps -q) || true
docker rm $(docker ps -aq) || true

# （任意）ボリューム削除したいとき：
# docker system prune -af --volumes

# 📦 Fabricネットワーク停止
cd ~/dev/hyperledger-fabric-helloworld/fabric-samples/test-network
./network.sh down

# 🔒 Wallet / DB 削除
rm -rf ~/dev/hyperledger-fabric-helloworld/api/wallet/*
rm -f ~/dev/hyperledger-fabric-helloworld/api/db.json

# ✅ Fabricネットワーク起動 + チェーンコード再デプロイ
./network.sh up createChannel -ca
./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript

# 🔑 appUser 再登録
cd ~/dev/hyperledger-fabric-helloworld/api
node scripts/enrollAdmin.js
node scripts/registerUser.js

# 🚀 API起動（最後は手動 or 下記で連携）
# node app.js
