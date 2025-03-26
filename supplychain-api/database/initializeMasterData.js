const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// 環境変数に応じてDBファイルを選択
const dbFileName = process.env.NODE_ENV === 'test' ? 'db-test.json' : 'db-dev.json';
const dbFilePath = path.resolve(__dirname, `./${dbFileName}`);
const adapter = new FileSync(dbFilePath);
const db = low(adapter);

/**
 * マスターデータを初期化／シード
 * 毎回上書きするため、実行時にDBが更新される
 */
function initializeMasterData() {
  const masterData = {
    parts: [
      {
        part_id: 'BAT-001',
        model: 'EV6000',
        capacity_ah: 60,
        voltage_v: 3.2,
        manufacturer: 'ENEGEN Power Systems',
        manufactured_at: '2025-03-20',
        supplier_id: 'SUP-101'
      }
    ],
    suppliers: [
      {
        supplier_id: 'SUP-101',
        name: 'エネゲンパワーシステムズ株式会社',
        location: '福島県郡山市',
        certification: 'ISO/TS 16949',
        material_type: 'LiFePO4セル'
      }
    ],
    operators: [
      {
        operator_id: 'USR-9001',
        name: '佐藤 太一',
        role: '検査員',
        organization: 'ENEGEN 第2製造所'
      }
    ],
    events: []
  };

  db.defaults(masterData).write();
  console.log(`✅ ${dbFileName} にマスターデータをシードしました（常時上書き）`);
}

module.exports = {
  initializeMasterData,
  db
};
