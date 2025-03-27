const request = require('supertest');
const { app } = require('../app');
const { db } = require('../database/initializeMasterData');
const { startServer} = require('../server');

// fabric-network 全体をモック
jest.mock('fabric-network');

// テスト用のDBファイルを指定
process.env.DB_FILE = 'db-test.json';

describe('Hyperledger Fabric モックテスト', () => {
  let server;

  beforeAll(async () => {
    // テスト用のサーバーを起動
    server = await startServer();
  });

  beforeEach(() => {
    // テスト前にDBクリア
    db.set('events', []).write();
  });

  afterAll((done) => {
    // テスト完了後にサーバーをクローズ
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('部品イベント登録API: 正常系 - トランザクション結果が返却されること', async () => {
    const res = await request(app)
      .post('/api/part-event')
      .send({
        event_id: 'EVT-TEST-001',
        part_id: 'BAT-001',
        status: 'assembled',
        timestamp: '2025-03-26T16:00:00Z',
        location: 'ENEGEN 本社工場',
        operator_id: 'USR-9001'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('txResult');

    const savedEvent = db.get('events').find({ event_id: 'EVT-TEST-001' }).value();
    expect(savedEvent).toBeDefined();
    expect(savedEvent.status).toBe('assembled');
  });

  it('部品イベント登録API: 異常系 - マスターデータ不足時にエラーが返却されること', async () => {
    const res = await request(app)
      .post('/api/part-event')
      .send({
        event_id: 'EVT-TEST-999',
        part_id: 'UNKNOWN-PART',
        status: 'assembled',
        timestamp: '2025-03-26T16:00:00Z',
        location: 'ENEGEN 本社工場',
        operator_id: 'USR-9001'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'マスターデータが不足しています');
  });

  it('イベント検索API: 正常系 - チェーンコードのデータが返却されること', async () => {
    await request(app)
      .post('/api/part-event')
      .send({
        event_id: 'EVT-TEST-002',
        part_id: 'BAT-001',
        status: 'assembled',
        timestamp: '2025-03-26T16:00:00Z',
        location: 'Test-Location',
        operator_id: 'USR-9001'
      });

    const res = await request(app).get('/api/query/EVT-TEST-002');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('event_id', 'EVT-TEST-002');
    expect(res.body.result).toHaveProperty('part_hash', 'mockPartHash');
  });

  it('イベント一覧取得API: 正常系 - イベントの配列が返却されること', async () => {
    db.get('events').push({ event_id: 'EVT-ABC' }).write();
    db.get('events').push({ event_id: 'EVT-XYZ' }).write();

    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body.map(e => e.event_id)).toEqual(
      expect.arrayContaining(['EVT-ABC', 'EVT-XYZ'])
    );
  });
}); 