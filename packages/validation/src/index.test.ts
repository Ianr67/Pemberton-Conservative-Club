import { describe, expect, it } from 'vitest';

import {
  parseDatabaseEnvironment,
  parseMediaStorageEnvironment,
  parseServiceEnvironment,
} from './index.js';

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

describe('parseMediaStorageEnvironment', () => {
  it('defaults to local filesystem storage', () => {
    expect(parseMediaStorageEnvironment({})).toEqual({
      MEDIA_STORAGE_DRIVER: 'filesystem',
      MEDIA_STORAGE_PATH: '.media',
    });
  });

  it('parses complete S3-compatible configuration', () => {
    expect(
      parseMediaStorageEnvironment({
        MEDIA_STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://objects.example.test',
        S3_REGION: 'auto',
        S3_BUCKET: 'pcc-media',
        S3_ACCESS_KEY_ID: 'test-access-key',
        S3_SECRET_ACCESS_KEY: 'test-secret-key',
        S3_FORCE_PATH_STYLE: 'true',
      }),
    ).toMatchObject({
      MEDIA_STORAGE_DRIVER: 's3',
      S3_FORCE_PATH_STYLE: true,
    });
  });

  it('rejects incomplete or insecure S3 configuration', () => {
    expect(() =>
      parseMediaStorageEnvironment({
        MEDIA_STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'http://objects.example.test',
      }),
    ).toThrow();
  });

  it('refuses filesystem storage in production', () => {
    expect(() =>
      parseMediaStorageEnvironment({
        NODE_ENV: 'production',
        MEDIA_STORAGE_DRIVER: 'filesystem',
      }),
    ).toThrow('Production requires MEDIA_STORAGE_DRIVER=s3');
  });
});
