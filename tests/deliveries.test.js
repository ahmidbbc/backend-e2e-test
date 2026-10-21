const express = require('express');
const request = require('supertest');
const { createDeliveryRouter } = require('../src/routes/deliveries');
const { createInMemoryDeliveryRepository } = require('../src/repositories/deliveryRepository');

describe('delivery tracking API', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(createDeliveryRouter());
  });

  async function create() {
    const res = await request(app).post('/api/deliveries').send({ orderId: 2 });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/deliveries/${res.body.id}`);
    return res.body;
  }

  it('creates a delivery and retains ordered status changes across requests', async () => {
    const delivery = await create();
    expect(delivery).toMatchObject({ orderId: 2, status: 'pending' });
    const path = `/api/deliveries/${delivery.id}`;
    for (const status of ['shipped', 'in_transit', 'delivered']) {
      const res = await request(app).patch(`${path}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
    const detail = await request(app).get(path).expect(200);
    const history = await request(app).get(`${path}/history`).expect(200);
    expect(history.body.history).toEqual(detail.body.history);
    expect(history.body.history.map((entry) => entry.status))
      .toEqual(['pending', 'shipped', 'in_transit', 'delivered']);
    const times = history.body.history.map((entry) => {
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
      return Date.parse(entry.timestamp);
    });
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const list = await request(app).get('/api/deliveries').expect(200);
    expect(list.body.deliveries).toEqual([detail.body]);
  });

  it('does not append history when the status is unchanged', async () => {
    const delivery = await create();
    const res = await request(app).patch(`/api/deliveries/${delivery.id}/status`)
      .send({ status: 'pending' }).expect(200);
    expect(res.body).toEqual(delivery);
  });

  it.each([{}, { orderId: '2' }, { orderId: -1 }, { orderId: 1.5 }, { orderId: null }])(
    'rejects invalid creation input %j', async (body) => {
      await request(app).post('/api/deliveries').send(body).expect(400);
      const list = await request(app).get('/api/deliveries');
      expect(list.body.deliveries).toEqual([]);
    },
  );

  it('rejects unknown orders and duplicate deliveries', async () => {
    await request(app).post('/api/deliveries').send({ orderId: 999 }).expect(404);
    await create();
    await request(app).post('/api/deliveries').send({ orderId: 2 }).expect(409);
  });

  it.each([{}, { status: 'lost' }, { status: null }, { status: ['shipped'] }])(
    'rejects invalid status %j without changing history', async (body) => {
      const delivery = await create();
      const path = `/api/deliveries/${delivery.id}`;
      await request(app).patch(`${path}/status`).send(body).expect(400);
      const res = await request(app).get(path);
      expect(res.body).toEqual(delivery);
    },
  );

  it('returns 404 for missing deliveries', async () => {
    await request(app).get('/api/deliveries/missing').expect(404);
    await request(app).get('/api/deliveries/missing/history').expect(404);
    await request(app).patch('/api/deliveries/missing/status')
      .send({ status: 'shipped' }).expect(404);
  });

  it('does not expose repository failures', async () => {
    const failingApp = express();
    failingApp.use(createDeliveryRouter({ repository: {
      list() { throw new Error('private storage details'); },
    } }));
    const res = await request(failingApp).get('/api/deliveries').expect(500);
    expect(res.body).toEqual({ error: 'internal_error' });
  });

  it('is mounted in the main application', async () => {
    await request(require('../src/app')).get('/api/deliveries').expect(200);
  });
});

it('protects stored history from mutations of returned objects', () => {
  const repository = createInMemoryDeliveryRepository();
  const created = repository.create(1);
  created.history[0].status = 'tampered';
  const listed = repository.list();
  listed[0].history.length = 0;
  const found = repository.findByOrderId(1);
  found.status = 'tampered';
  expect(repository.find(created.id)).toMatchObject({
    status: 'pending', history: [{ status: 'pending' }],
  });
});
