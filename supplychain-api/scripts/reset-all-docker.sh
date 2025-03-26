# fabric-supplychain-app/supplychain-api/scripts/reset-all-docker.sh

#!/bin/bash
set -euxo pipefail

# 🔁 Docker コンテナ全停止・削除
docker stop $(docker ps -q) || true
docker rm $(docker ps -aq) || true

# （任意）ボリューム削除したいとき：
# docker system prune -af --volumes

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

# 🔑 appUser 再登録（Docker版）
docker run -it --rm \
  -v ~/dev/fabric-supplychain-app/supplychain-api/wallet:/app/wallet \
  -v ~/dev/fabric-supplychain-app/supplychain-api/config:/app/config \
  --entrypoint node \
  supplychain-api scripts/enrollAdmin.js

docker run -it --rm \
  -v ~/dev/fabric-supplychain-app/supplychain-api/wallet:/app/wallet \
  -v ~/dev/fabric-supplychain-app/supplychain-api/config:/app/config \
  --entrypoint node \
  supplychain-api scripts/registerUser.js

# 🚀 API起動（最後は手動 or 下記で連携）
# node app.js

cd ~/dev/fabric-supplychain-app/supplychain-api
docker build -t supplychain-api .
docker run -it --rm \
  -v $(pwd)/wallet:/app/wallet \
  -v $(pwd)/config:/app/config \
  -p 3000:3000 \
  supplychain-api
