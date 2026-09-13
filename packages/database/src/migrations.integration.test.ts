import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getMigrationStatus, migrate } from './migrations.js';
import { resetDevelopmentData, seedDevelopmentData } from './seed.js';

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : undefined;
const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;

describeWithDatabase('database migrations', () => {
  beforeAll(async () => {
    await pool?.query(`CREATE SCHEMA ${schema}`);
  });

  afterAll(async () => {
    await pool?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool?.end();
  });

  it('builds an empty namespace and reapplies deterministic fixtures', async () => {
    const client = await pool?.connect();
    expect(client).toBeDefined();
    if (!client) return;

    try {
      await client.query(`SET search_path TO ${schema}`);
      expect(await migrate(client)).toEqual([
        '000001_identity_foundation.sql',
        '000002_administrator_credentials.sql',
        '000003_homepage_content.sql',
        '000004_club_settings.sql',
        '000005_events.sql',
        '000006_editable_content_pages.sql',
      ]);
      expect(await migrate(client)).toEqual([]);
      expect(await getMigrationStatus(client)).toEqual([
        { name: '000001_identity_foundation.sql', state: 'applied' },
        { name: '000002_administrator_credentials.sql', state: 'applied' },
        { name: '000003_homepage_content.sql', state: 'applied' },
        { name: '000004_club_settings.sql', state: 'applied' },
        { name: '000005_events.sql', state: 'applied' },
        { name: '000006_editable_content_pages.sql', state: 'applied' },
      ]);
      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = $1
         ORDER BY table_name`,
        [schema],
      );
      expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
        '_pcc_migrations',
        'audit_events',
        'club_opening_times',
        'club_setting_versions',
        'club_settings',
        'club_social_links',
        'events',
        'page_versions',
        'pages',
        'permissions',
        'role_permissions',
        'roles',
        'sessions',
        'user_roles',
        'users',
        'venues',
      ]);

      await seedDevelopmentData(client, 'development');
      await seedDevelopmentData(client, 'development');
      const seeded = await client.query<{ count: string }>(
        "SELECT count(*) FROM users WHERE email LIKE '%@pemberton-club.example.test'",
      );
      expect(seeded.rows[0]?.count).toBe('2');
      const seededEvents = await client.query<{ count: string }>(
        'SELECT count(*) FROM events',
      );
      expect(seededEvents.rows[0]?.count).toBe('7');
      const seededPages = await client.query<{ count: string }>(
        'SELECT count(*) FROM pages',
      );
      expect(seededPages.rows[0]?.count).toBe('6');

      await resetDevelopmentData(client, 'development');
      const reset = await client.query<{ count: string }>(
        'SELECT count(*) FROM users',
      );
      expect(reset.rows[0]?.count).toBe('2');
    } finally {
      client.release();
    }
  });

  it('refuses to reset in production before changing data', async () => {
    const client = await pool?.connect();
    expect(client).toBeDefined();
    if (!client) return;

    try {
      await client.query(`SET search_path TO ${schema}`);
      await expect(resetDevelopmentData(client, 'production')).rejects.toThrow(
        'permitted only when NODE_ENV=development',
      );
      const result = await client.query<{ count: string }>(
        'SELECT count(*) FROM users',
      );
      expect(result.rows[0]?.count).toBe('2');
    } finally {
      client.release();
    }
  });
});
