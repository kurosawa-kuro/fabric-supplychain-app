
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

```bash
cd fabric-samples/test-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn part_event -ccp ../chaincode/part_event -ccl node
```

### 2. APIサーバ起動

```bash
npm install
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

## 📂 ディレクトリ構成

```
.
├── app.js               # APIサーバ
├── db.json              # 部品・サプライヤ・オペレーターマスタ
├── wallet/              # appUserウォレット（登録済み必要）
├── connection-org1.json # Fabric接続定義
└── README.md            # 本ドキュメント
```

---

## 📎 備考

- `txId` も取得可能（submitTransaction実行時）
- `ctx.stub.getTxID()` でチェーンコード側でも取得できる
- `GetHistoryForKey()` で履歴追加も容易に可能

---

## 🧰 今後の拡張候補

- Web UI（EJS/Reactなど）
- event_id → txIdマッピング管理
- Fabric Event機能の利用
- 署名付きPDF検査ログのハッシュ連携

---

開発者：あなた

完璧な構成が見えてきましたね。  
以下は「**MVPを完成させ、将来的にK8sへ展開するまでの理想的な作業順序**」です👇

---

# 🧭 作業順：EVバッテリーPoC構築ロードマップ（MVP〜K8s）

---

## ✅ フェーズ①：オンチェーンPoC確立（ローカル or EC2）

| ステップ | 内容 |
|--------|------|
| ① EC2作成 | Amazon Linux 2023 / Node.js / Docker / Fabric CLI |
| ② Fabricネットワーク起動 | `network.sh up createChannel -ca` |
| ③ チェーンコードデプロイ | `deployCC -ccn part_event ...`（単一組織） |
| ④ `appUser` 登録 | `enrollAdmin.js`, `registerUser.js` などでウォレット生成 |
| ⑤ `curl` でPOSTテスト | `POST /api/part-event` 成立確認 |
| ⑥ `GET /api/verify/:event_id` | 改ざん検出の成功確認 |

---

## ✅ フェーズ②：API化・UI追加（Express中心）

| ステップ | 内容 |
|--------|------|
| ⑦ APIコード整理 | `app.js` を分割（ルーティング / SDK / hash utils） |
| ⑧ lowdb連携精緻化 | `/db.json` をモジュール化 + CRUDエンドポイント追加も視野 |
| ⑨ EJSビュー追加 | `views/form.ejs`, `views/result.ejs` で簡易UI（バッテリーイベント投稿） |
| ⑩ サーバー再構成 | `server.js` + `routes/` 構成で保守性アップ（任意） |

---

## ✅ フェーズ③：本番環境 & K8s展開準備

| ステップ | 内容 |
|--------|------|
| ⑪ Docker化 | `Dockerfile` + `docker-compose.dev.yml` 作成（Fabric + API） |
| ⑫ K8s構成検討 | シンプルな `k8s/api-deployment.yaml` 作成 |
| ⑬ ingress + secrets | Fabric接続情報を `K8s secret` として管理 |
| ⑭ Cloud環境検証 | EKS, GKE, minikube のいずれかで試験展開（PoC用） |

---

## ✅ フェーズ④：実務・実証へ進化

| ステップ | 内容 |
|--------|------|
| ⑮ `txId` ログ出力 | `ctx.stub.getTxID()` を含めて返却・記録 |
| ⑯ 改ざんレポート機能 | `/api/verify/all` や `txId` 監査ログ一覧など |
| ⑰ Redash/Athena連携 | JSONログ or DynamoDB出力（後段に分析） |
| ⑱ 複数組織構成へ拡張 | PoC通過後、Endorsement Policy設定＆Org2追加 |

---

## 🎯 今のあなたの状態（見立て）

| 項目 | ステータス |
|------|------------|
| 単一組織Fabric + チェーンコード | ✅ 完了済み |
| SDK + 改ざん検証API | ✅ 完了済み |
| lowdb + JSONマスタ構成 | ✅ 完了済み |
| curl検証 + Web対応準備 | ⏳ すぐできるレベル |
| Docker / K8s対応 | 🔜 構成整理次第で進行可能 |

---

必要であれば：
- `Dockerfile` + `docker-compose.yml`（API＋Fabric CLI入り）
- `views/form.ejs` 雛形
- `routes/verify.js` など分割構成
も提供できます！

どこから手をつけますか？たとえば「EJS追加」から着手して「Docker化 → K8s」へ進む流れもオススメです。

完璧なタイミングです。  
今のフォルダ構成をマイクロサービス化とDocker/Kubernetes対応を見据えて、**以下のようにリファクタリング**するのがベストです ✅

---

## ✅ 提案構成（Kubernetes & マイクロサービス & TypeScriptも見据え）

```
hyperledger-fabric-helloworld/
├── apps/                             # マイクロサービス群（API）
│   └── part-service/
│       ├── src/
│       │   ├── index.ts              # Expressエントリーポイント
│       │   ├── routes/               # 各APIルート
│       │   └── services/             # Fabric SDK / lowdbなどのロジック
│       ├── swagger.config.ts         # Swagger設定
│       ├── Dockerfile
│       └── package.json
│
├── scripts/                          # 初期登録などのユーティリティ
│   ├── enrollAdmin.ts
│   ├── registerUser.ts
│   ├── enrollAppUser.ts
│
├── wallet/                           # Fabric SDK用ウォレット（Git管理除外）
│   ├── admin.id
│   └── appUser.id
│
├── chaincode/                        # チェーンコード（オンチェーン）
│   └── part_event/
│       ├── index.js
│       ├── package.json
│       └── Dockerfile                # Chaincodeコンテナ化するなら
│
├── fabric-samples/                   # Fabric公式 test-network 一式
│
├── db/                               # lowdb or その他データ
│   └── db.json
│
├── .env                              # 接続情報
├── docker-compose.yml
├── README.md
└── docs/
    └── roadmap.md など...
```

---

## 🔁 リファクタリングポイント解説

| 旧パス          | 新パス                              | 理由 |
|------------------|--------------------------------------|------|
| `api/app.js`     | `apps/part-service/src/index.ts`     | サービス分離・TypeScript対応 |
| `api/*.js`       | `scripts/` + `wallet/` に分離         | 登録系は本番環境で使わないためユーティリティ化 |
| `chaincode/part_event` | そのまま維持                     | SDKとは分離されていて正しい構成 |
| `connection-org1.json` | `.env` or `config/` に移す        | path解決しやすくなる（CI/CDでも） |

---

## 🧠 今後のために

- `apps/` 配下に `user-service`, `supplier-service`, `frontend` を追加可能
- `scripts/` は CI/CD 初期化処理にも再利用可能
- `wallet/` は `.gitignore` に含めるべき（秘密鍵含む）

---

必要なら、**`mv`/`mkdir` コマンドでの一括リファクタリング用スクリプト**も出せます。  
やりますか？💻🔥