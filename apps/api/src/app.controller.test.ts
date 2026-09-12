import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller.js';

describe('AppController', () => {
  const database = {
    checkConnection: async () => undefined,
  };

  it('reports the API as healthy', () => {
    expect(new AppController(database as never).health()).toEqual({
      service: 'api',
      status: 'ok',
    });
  });

  it('reports a successful database connection', async () => {
    await expect(
      new AppController(database as never).databaseHealth(),
    ).resolves.toEqual({
      service: 'database',
      status: 'ok',
    });
  });

  it('keeps liveness healthy when the database is unavailable', async () => {
    const unavailableDatabase = {
      checkConnection: async () => Promise.reject(new Error('unavailable')),
    };
    const controller = new AppController(unavailableDatabase as never);

    expect(controller.health()).toEqual({ service: 'api', status: 'ok' });
    await expect(controller.databaseHealth()).rejects.toMatchObject({
      status: 503,
    });
  });
});
