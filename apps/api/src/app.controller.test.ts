import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('reports the API as healthy', () => {
    expect(new AppController().health()).toEqual({
      service: 'api',
      status: 'ok',
    });
  });
});
