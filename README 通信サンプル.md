cd supplychain-api
docker build -t supplychain-api .
docker run --rm -it \
  --network fabric_test \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/wallet:/app/wallet \
  -e HFC_LOGGING='{"debug":"off","info":"off"}' \
  supplychain-api:latest








rm -rf ~/dev/fabric-supplychain-app/supplychain-api/wallet/*

# 修正後の scripts 実行
node ~/dev/fabric-supplychain-app/supplychain-api/scripts/enrollAdmin.js
node ~/dev/fabric-supplychain-app/supplychain-api/scripts/registerUser.js

# 確認
ls -l ~/dev/fabric-supplychain-app/supplychain-api/wallet/
# → admin.id / appUser.id ができていれば OK

cd ~/dev/fabric-supplychain-app/supplychain-api/
node app.js


curl -X POST http://localhost:3000/api/part-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVT-001",
    "part_id": "BAT-001",
    "status": "assembled",
    "timestamp": "2025-03-26T15:00:00Z",
    "location": "ENEGEN 第2製造所",
    "operator_id": "USR-9001"
  }'

curl http://localhost:3000/api/query/EVT-001


オフチェーン イベント テーブルを用意し
イベント記録とハッシュ管理してみてはどうだろうか