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
