rm -rf api/wallet/*

# 修正後の scripts 実行
node api/scripts/enrollAdmin.js
node api/scripts/registerUser.js

# 確認
ls -l api/wallet/
# → admin.id / appUser.id ができていれば OK


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
