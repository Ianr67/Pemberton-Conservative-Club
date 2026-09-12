import { describe, expect, it } from 'vitest';

import { getWorkerHealth } from './main.js';

describe('worker health', () => {
  it('reports the worker as healthy', () => {
    expect(getWorkerHealth()).toEqual({
      service: 'worker',
      status: 'ok',
    });
  });
});
