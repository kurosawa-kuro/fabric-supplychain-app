こちらがチャットベースでの最新版 `README.md` の「🚀 起動方法（完全クリーンスタート手順）」セクションです ✅  
直接コピペして `README.md` に貼ってご活用ください！

---

## 🚀 起動方法（完全クリーンスタート手順）

### 1. 前回の履歴を削除（念のため）

```bash
# Dockerコンテナをすべて停止・削除
docker stop $(docker ps -q)
docker rm $(docker ps -aq)

# ※ volumeごと削除したい場合（慎重に）
# docker system prune -af --volumes

# Fabricネットワーク停止
cd fabric-samples/test-network
./network.sh down

# wallet（SDK証明書）削除
cd ../../api
rm -rf wallet/*
```

---

### 2. Fabricネットワーク起動（インスタンス停止後、再開する場合はここから）

```bash
cd ~/dev/fabric-supplychain-app/fabric-samples/test-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript
```

---

### 3. appUser登録とAPI起動

```bash
cd ~/dev/fabric-supplychain-app/supplychain-api
npm install
node scripts/enrollAdmin.js
node scripts/registerUser.js
node app.js
```

---

これで**完全な初期化 → Fabric構築 → チェーンコードデプロイ → API起動**のフローが迷わず実行できます💪  
次に `reset-all.sh` や `Makefile`、Swagger追加に進める準備もバッチリです！必要なら声かけてください🔥






# ⚡ EVバッテリー・サプライチェーン PoC（Hyperledger Fabric + Node.js）

本プロジェクトは、EVバッテリー製造・出荷イベントをブロックチェーン上に記録し、後から**オフチェーン改ざん検出**ができるシンプルかつ強力なPoCアプリケーションです。

---

## 🏗️ 技術スタック

- Hyperledger Fabric（単一組織構成 / test-network）
- チェーンコード：Node.js（JavaScript）
- APIサーバ：Express + LowDB（部品マスタ保存）
- Fabric SDK連携（fabric-network）
- REST API：登録 / 検証
- 将来的に EJS や UI追加も想定

---

## 🚀 起動方法

### 1. Fabricネットワーク起動

```
# 掃除
# FabricやAPIなど、関連するDockerコンテナをすべて停止
docker ps -a

# 該当するコンテナを停止・削除（または一括で）
docker stop $(docker ps -q)
docker rm $(docker ps -aq)

# ※ volumeごと削除したい場合（開発環境のみで慎重に）
# docker system prune -af --volumes

cd fabric-samples/test-network
./network.sh down

./network.sh up createChannel -ca

./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript





rm -rf wallet/*
```

```bash
cd fabric-samples/test-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn part_event -ccp ../../chaincode/part_event_js -ccl javascript
```

### 2. appUser登録とAPI起動

```bash
cd api
npm install
node scripts/enrollAdmin.js
node scripts/registerUser.js
node app.js
```

---

## 📬 API仕様

### 登録（オンチェーン書き込み）

`POST /api/part-event`

```json
{
  "event_id": "EVT-20250325001",
  "part_id": "BAT-001",
  "status": "assembled",
  "timestamp": "2025-03-25T11:30:00Z",
  "location": "ENEGEN 第2製造所",
  "operator_id": "USR-9001"
}
```

---

### 改ざん検証（オンチェーン vs オフチェーン）

`GET /api/verify/:event_id`

```json
{
  "event_id": "EVT-20250325001",
  "part_id": "BAT-001",
  "isValid": true,
  "onChainHash": "0xabc...",
  "calculatedHash": "0xabc..."
}
```

---

## 🧠 本PoCの特徴

| 特徴 | 説明 |
|------|------|
| ✅ 単一組織構成 | MVP構成。複雑な組織間合意は無し |
| ✅ 改ざん検出 | ハッシュ照合により後から証明可能 |
| ✅ 柔軟な拡張性 | 検査ログ・写真・オペレーター認証にも対応可 |
| ✅ 簡単デプロイ | test-networkベースで即時起動可能 |

---

## 📂 現在のディレクトリ構成（2025/03リファクタリング）

```
api/
├── app.js
├── config/
│   └── connection-org1.json
├── scripts/
│   ├── enrollAdmin.js
│   ├── enrollAppUser.js
│   └── registerUser.js
├── wallet/
│   ├── admin.id
│   └── appUser.id
├── package.json
└── package-lock.json
```

---

## 🧰 今後の拡張候補（例）

- Web UI（EJS/Reactなど）
- event_id → txIdマッピング管理
- Fabric Event機能の利用
- 署名付きPDF検査ログのハッシュ連携
- Docker化 → K8s対応（apps/ に分離予定）

---

## 🔖 備考

- `txId` は `ctx.stub.getTxID()` で取得可能
- 履歴管理は `GetHistoryForKey()` により容易に実装可能
- Express SDKは `fabric-network` v2.5系を使用中

---

開発者：あなた（最高の判断力を持つ構築者）