#!/bin/bash
set -euxo pipefail

# 停止中の Docker コンテナを削除
docker stop $(docker ps -q) || true
docker rm $(docker ps -aq) || true

# （任意）ボリュームごと削除
# docker system prune -af --volumes

# Fabricネットワーク停止
cd fabric-samples/test-network
./network.sh down

# Walletと lowdb を削除
cd ../../api
rm -rf wallet/*
rm -f db.json
