import { describe, expect, it } from 'vitest';

import { parseDatabaseEnvironment, parseServiceEnvironment } from './index.js';

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

  it('requires a PostgreSQL URL when requested', () => {
    expect(() => parseDatabaseEnvironment({})).toThrow();
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: 'postgresql://example.test/pcc_development',
      }).DATABASE_URL,
    ).toBe('postgresql://example.test/pcc_development');
  });

  it('rejects a non-PostgreSQL database URL', () => {
    expect(() =>
      parseDatabaseEnvironment({
        DATABASE_URL: 'https://example.test/database',
      }),
    ).toThrow();
  });

  it('parses the database environment independently', () => {
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: 'postgresql://example.test/pcc_development',
      }),
    ).toEqual({
      DATABASE_URL: 'postgresql://example.test/pcc_development',
    });
  });
});
