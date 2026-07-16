const express = require('express');
const request = require('supertest');
const metrics = require('../../src/core/metrics');
const { registerHealthRoutes } = require('../../src/core/health');

describe('health and monitoring endpoints', () => {
  beforeEach(() => {
    metrics.inc('test_counter', 0);
  });

  it('returns ok from /healthz', async () => {
    const app = express();
    registerHealthRoutes(app, {
      db: { ping: async () => true },
      redis: { status: 'ready' }
    });

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('attendance-backend');
  });

  it('returns ready when dependencies are healthy', async () => {
    const app = express();
    registerHealthRoutes(app, {
      db: { ping: async () => true },
      redis: { status: 'ready' }
    });

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('returns metric snapshot from /metrics', async () => {
    const app = express();
    registerHealthRoutes(app, {
      db: { ping: async () => true },
      redis: { status: 'ready' }
    });
    metrics.inc('test_counter', 2);

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.body.counters.test_counter).toBe(2);
  });
});
