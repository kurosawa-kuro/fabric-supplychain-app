const request = require('supertest');
const { app } = require('./app');
const { db } = require('./database/initializeMasterData');
const { startServer, getServer } = require('./server');

// fabric-network 全体をモック
jest.mock('fabric-network');

describe('Hyperledger Fabric Mocked Test', () => {
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

  it('POST /api/part-event => 200 OK, returns txResult', async () => {
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

  it('POST /api/part-event => 400 NG, missing master data', async () => {
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

  it('GET /api/query/:event_id => 200 OK, returns chain data', async () => {
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

  it('GET /api/events => 200 OK, returns array of events', async () => {
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