# hyperledger-fabric-helloworld

了解です ✅  
以下に「**Fabric CLI（peerコマンド）**」と「**Express API（curl）**」の両方から、  
オンチェーン登録／取得を行うための**コマンドテンプレート**を完全整理しました。

---

## 🧱 ① CLIから：`peer chaincode invoke / query`

### 🔧 共通：事前に必要な環境変数

```bash
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_MSPCONFIGPATH=$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export ORDERER_CA=$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

---

### ✅ `recordPartEvent` の登録（invoke）

```bash
peer chaincode invoke -o localhost:7050 \
--ordererTLSHostnameOverride orderer.example.com \
--tls --cafile "$ORDERER_CA" \
-C mychannel -n part_event \
--peerAddresses localhost:7051 \
--tlsRootCertFiles "$CORE_PEER_TLS_ROOTCERT_FILE" \
-c '{"function":"recordPartEvent","Args":["EVT-001","BAT-001","assembled","2025-03-26T01:30:00Z","ENEGEN 本社工場","USR-9001","0xabc123","0xdef456","0xghi789"]}'
```

---

### ✅ `queryPartEvent` の取得（query）

```bash
peer chaincode query -C mychannel -n part_event \
-c '{"function":"queryPartEvent","Args":["EVT-001"]}'
```

---

## 🌐 ② curlから：Express API 経由

Expressサーバー（`part-service.js`）がポート `3000` や `5002` などで立っている前提です。

---

### ✅ POST `/api/part-event`

```bash
curl -X POST http://localhost:3000/api/part-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVT-001",
    "part_id": "BAT-001",
    "status": "assembled",
    "timestamp": "2025-03-26T01:30:00Z",
    "location": "ENEGEN 本社工場",
    "operator_id": "USR-9001"
  }'
```

---

### ✅ GET `/api/query/:event_id`

```bash
curl http://localhost:3000/api/query/EVT-001
```

---

## ✅ まとめ表

| 操作               | CLI                       | Express API (`curl`)         |
|--------------------|---------------------------|-------------------------------|
| 書き込み（登録）   | `peer chaincode invoke`   | `POST /api/part-event`       |
| 読み取り（取得）   | `peer chaincode query`    | `GET /api/query/:event_id`   |
| TLS証明書など      | 必要（環境変数で指定）     | Express内部でSDK設定済み     |
| 証明書・接続負担    | 高い（学習コストあり）     | 低い（HTTPだけで完結）       |

---

必要ならこの一覧を Markdown にまとめてお渡しもできます！やりますか？📄