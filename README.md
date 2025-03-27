

# Hyperledger Fabric サプライチェーンアプリケーション

このアプリケーションは、サプライチェーンの部品イベントを管理するために構築されており、**Hyperledger Fabric** と **Express.js** を使用しています。主に、部品のトラッキングや、各イベント（組立、出荷など）を記録するための API を提供します。Hyperledger Fabricを用いてブロックチェーンでイベントデータを管理し、Express.jsでAPIとして提供しています。

---

## 概要

このアプリケーションでは、部品に関連するイベント（例：組立、検品、出荷など）を記録し、その情報をAPI経由で取得できるようにしています。サプライチェーンの管理において、各部品がどこにあり、どのステータスにあるかを追跡するのに役立ちます。

### 主な機能

- **部品イベントの登録:** 部品に関連するイベント（組立、出荷など）を記録するAPI。
- **イベントデータの取得:** 登録された部品イベントをIDで検索し、データを取得するAPI。
- **全イベントの取得:** 登録された全ての部品イベントを一覧で取得するAPI。

---

## 使用技術

- **Hyperledger Fabric:** 部品イベントデータをブロックチェーン上に保存・管理するための基盤として使用しています。イベントデータはチェーンコード（Node.js版）を通じて登録されます。
- **Express.js:** APIサーバーとして使用し、部品イベントを管理するRESTful APIを提供します。
- **Prometheus / Grafana:** アプリケーションのモニタリングとダッシュボードを提供するために使用しています。

---

## APIエンドポイント

### 1. 部品イベントの登録

- **POST** `/api/part-event`
- 部品イベントを新たに登録します。

**リクエストボディ例:**
```json
{
  "event_id": "EVT-TEST-001",
  "part_id": "BAT-001",
  "status": "assembled",
  "timestamp": "2025-03-26T16:00:00Z",
  "location": "ENEGEN 本社工場",
  "operator_id": "USR-9001"
}
```

**レスポンス例:**
```json
{
  "success": true,
  "txResult": "Transaction was successfully processed"
}
```

### 2. 部品イベントの検索

- **GET** `/api/query/{event_id}`
- 指定した `event_id` の部品イベントを検索し、そのデータを取得します。

**例URL:** `/api/query/EVT-TEST-001`

**レスポンス例:**
```json
{
  "event_id": "EVT-TEST-001",
  "part_id": "BAT-001",
  "status": "assembled",
  "timestamp": "2025-03-26T16:00:00Z",
  "location": "ENEGEN 本社工場",
  "operator_id": "USR-9001"
}
```

### 3. 全イベントの取得

- **GET** `/api/events`
- 登録されている全ての部品イベントを一覧として取得します。

**レスポンス例:**
```json
[
  {
    "event_id": "EVT-TEST-001",
    "status": "assembled"
  },
  {
    "event_id": "EVT-TEST-002",
    "status": "shipped"
  }
]
```

---

## テスト

アプリケーションにはJestとSupertestを使用してテストを記述しており、APIの各機能が正常に動作することを確認しています。

### 主なテストケース

- **部品イベント登録（成功）**
    - 有効なデータで部品イベントを登録し、トランザクションが成功することを確認。
- **部品イベント登録（失敗）**
    - 不正なデータで部品イベントを登録した際にエラーメッセージが返されることを確認。
- **イベント検索（成功）**
    - 登録済みの部品イベントがIDで正しく検索できることを確認。
- **全イベント取得（成功）**
    - 複数の部品イベントが正しく取得できることを確認。

 
![2025-03-27_17h25_24](https://github.com/user-attachments/assets/7c3ff9cd-7eae-44e8-8713-807c82302932)

![2025-03-27_17h47_26](https://github.com/user-attachments/assets/f9a7893b-0460-4a8d-89c0-4744c64c80fd)


![2025-03-27_17h23_48](https://github.com/user-attachments/assets/5f78f92c-da7d-4afd-9686-60c2f4ce7dbe)

---

## 結論

このアプリケーションは、三日で作った割に、Hyperledger Fabric を活用してサプライチェーン内の部品イベントを効率的に管理するためのPOC実用的なツールです。ブロックチェーン技術を使用することで、データの透明性と信頼性を確保し、サプライチェーンの各段階での追跡が可能となります。Express.jsによるAPIと、PrometheusやGrafanaでのモニタリングにより、運用面でも強力なサポートを提供します。
