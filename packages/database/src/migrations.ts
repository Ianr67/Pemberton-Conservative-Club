import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PoolClient } from 'pg';

const defaultMigrationDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url),
);

export interface MigrationStatus {
  name: string;
  state: 'applied' | 'pending';
}

interface MigrationFile {
  checksum: string;
  name: string;
  sql: string;
}

async function loadMigrations(
  directory = defaultMigrationDirectory,
): Promise<MigrationFile[]> {
  const names = (await readdir(directory))
    .filter((name) => /^\d{6}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(directory, name), 'utf8');
      return {
        checksum: createHash('sha256').update(sql).digest('hex'),
        name,
        sql,
      };
    }),
  );
}

async function ensureMigrationLedger(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _pcc_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function getMigrationStatus(
  client: PoolClient,
): Promise<MigrationStatus[]> {
  await ensureMigrationLedger(client);
  const migrations = await loadMigrations();
  const result = await client.query<{ checksum: string; name: string }>(
    'SELECT name, checksum FROM _pcc_migrations ORDER BY name',
  );
  const applied = new Map(result.rows.map((row) => [row.name, row.checksum]));

  for (const migration of migrations) {
    const recordedChecksum = applied.get(migration.name);
    if (recordedChecksum && recordedChecksum !== migration.checksum) {
      throw new Error(`Applied migration has changed: ${migration.name}`);
    }
  }

  return migrations.map((migration) => ({
    name: migration.name,
    state: applied.has(migration.name) ? 'applied' : 'pending',
  }));
}

export async function migrate(client: PoolClient): Promise<string[]> {
  await ensureMigrationLedger(client);
  const migrations = await loadMigrations();
  const status = await getMigrationStatus(client);
  const pending = new Set(
    status.filter(({ state }) => state === 'pending').map(({ name }) => name),
  );
  const applied: string[] = [];

  for (const migration of migrations) {
    if (!pending.has(migration.name)) continue;

    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO _pcc_migrations (name, checksum) VALUES ($1, $2)',
        [migration.name, migration.checksum],
      );
      await client.query('COMMIT');
      applied.push(migration.name);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  return applied;
}
