import { afterAll, describe, expect, it } from 'vitest';

import { PostgresDatabaseClient } from './index.js';

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const client = databaseUrl
  ? new PostgresDatabaseClient(databaseUrl)
  : undefined;

describeWithDatabase('PostgreSQL connectivity', () => {
  afterAll(async () => {
    await client?.close();
  });

  it('executes a query against the configured development database', async () => {
    await expect(client?.checkConnection()).resolves.toBeUndefined();
  });
});
