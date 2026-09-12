import { describe, expect, it } from 'vitest';

import { apiVersion } from './index.js';

describe('API contract foundation', () => {
  it('uses the documented API version', () => {
    expect(apiVersion).toBe('v1');
  });
});
