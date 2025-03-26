#!/bin/bash
set -euxo pipefail

# �� Docker コンテナ全停止・削除
docker stop $(docker ps -q) || true
docker rm $(docker ps -aq) || true

# 📦 Fabricネットワーク停止
cd ~/dev/fabric-supplychain-app/fabric-samples/test-network
./network.sh down

# 🔒 Wallet / DB 削除
rm -rf ~/dev/fabric-supplychain-app/supplychain-api/wallet/*
rm -f ~/dev/fabric-supplychain-app/supplychain-api/db.json

# ✅ Fabricネットワーク起動 + チェーンコード再デプロイ
./network.sh up createChannel -ca
./network.sh deployCC \
  -ccn part_event \
  -ccp ../../chaincode/part_event_js \
  -ccl javascript \
  -ccep "OR('Org1MSP.peer')"  

# CA証明書の取得
docker cp ca_org1:/etc/hyperledger/fabric-ca-server/ca-cert.pem ~/dev/fabric-supplychain-app/supplychain-api/config/ca-cert.pem

# Adminの登録
docker run -it --rm \
  --network fabric_test \
  -v ~/dev/fabric-supplychain-app/supplychain-api/wallet:/app/wallet \
  -v ~/dev/fabric-supplychain-app/supplychain-api/config:/app/config \
  --entrypoint node \
  supplychain-api scripts/enrollAdmin.js

# ユーザーの登録
docker run -it --rm \
  --network fabric_test \
  -v ~/dev/fabric-supplychain-app/supplychain-api/wallet:/app/wallet \
  -v ~/dev/fabric-supplychain-app/supplychain-api/config:/app/config \
  --entrypoint node \
  supplychain-api scripts/registerUser.js

# 🚀 API起動
cd ~/dev/fabric-supplychain-app/supplychain-api
docker build -t supplychain-api .
docker run -it --rm \
  --network fabric_test \
  -v $(pwd)/wallet:/app/wallet \
  -v $(pwd)/config:/app/config \
  -p 3000:3000 \
  supplychain-api