const request = require('supertest');

describe('GET /api/orders', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../src/usecases/listOrders');
  });

  it('returns 200 with the list of customer orders', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThan(0);

    res.body.orders.forEach((order) => {
      expect(typeof order.id).toBe('number');
      expect(typeof order.customer).toBe('string');
      expect(typeof order.total).toBe('number');
      expect(typeof order.status).toBe('string');
    });

    expect(res.body.pagination).toMatchObject({
      page: 1,
      total: res.body.orders.length,
    });
  });

  it('filters orders by status', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/orders?status=pending');

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThan(0);
    res.body.orders.forEach((order) => expect(order.status).toBe('pending'));
    expect(res.body.pagination.total).toBe(res.body.orders.length);
  });

  it('filters orders by customer (case-insensitive substring)', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/orders?customer=ali');

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(1);
    expect(res.body.orders[0].customer).toBe('Alice');
  });

  it('filters orders by date', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/orders?date=2026-07-22');

    expect(res.status).toBe(200);
    res.body.orders.forEach((order) => expect(order.date).toBe('2026-07-22'));
  });

  it('paginates the result', async () => {
    const app = require('../src/app');
    const res = await request(app).get('/api/orders?page=1&size=2');

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, size: 2 });
    expect(res.body.pagination.total).toBeGreaterThan(2);
    expect(res.body.pagination.totalPages).toBeGreaterThan(1);

    const page2 = await request(app).get('/api/orders?page=2&size=2');
    expect(page2.body.orders.length).toBeGreaterThan(0);
    expect(page2.body.orders[0].id).not.toBe(res.body.orders[0].id);
  });

  it('returns 500 when the usecase fails', async () => {
    jest.resetModules();
    jest.doMock('../src/usecases/listOrders', () => ({
      listOrders: () => {
        throw new Error('repository unavailable');
      },
    }));

    const app = require('../src/app');
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
  });
});
