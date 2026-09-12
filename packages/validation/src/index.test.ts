import { describe, expect, it } from 'vitest';

import { parseServiceEnvironment } from './index.js';

describe('parseServiceEnvironment', () => {
  it('uses the supplied default port', () => {
    expect(parseServiceEnvironment({}, 3002)).toEqual({
      NODE_ENV: 'development',
      PORT: 3002,
    });
  });

  it('coerces a valid port from an environment variable', () => {
    expect(parseServiceEnvironment({ PORT: '4100' }, 3002).PORT).toBe(4100);
  });

  it('rejects an invalid port', () => {
    expect(() => parseServiceEnvironment({ PORT: '70000' }, 3002)).toThrow();
  });
});
