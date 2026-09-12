import { Pool } from 'pg';

import { getMigrationStatus, migrate } from './migrations.js';
import { resetDevelopmentData, seedDevelopmentData } from './seed.js';

type Command = 'migrate' | 'reset' | 'seed' | 'status';

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required');

  const url = new URL(value);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  return value;
}

async function run(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (!command || !['migrate', 'reset', 'seed', 'status'].includes(command)) {
    throw new Error('Expected one command: migrate, status, seed, or reset');
  }

  if (
    (command === 'reset' || command === 'seed') &&
    process.env.NODE_ENV !== 'development'
  ) {
    throw new Error(
      command === 'reset'
        ? 'Database reset is permitted only when NODE_ENV=development'
        : 'Development fixtures require NODE_ENV=development',
    );
  }

  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 1 });
  const client = await pool.connect();
  try {
    if (command === 'migrate') {
      const applied = await migrate(client);
      console.info(
        applied.length
          ? `Applied: ${applied.join(', ')}`
          : 'No pending migrations.',
      );
    } else if (command === 'status') {
      for (const item of await getMigrationStatus(client)) {
        console.info(`${item.state.padEnd(7)} ${item.name}`);
      }
    } else if (command === 'seed') {
      await migrate(client);
      await seedDevelopmentData(client, process.env.NODE_ENV);
      console.info('Development fixtures applied.');
    } else {
      await migrate(client);
      await resetDevelopmentData(client, process.env.NODE_ENV);
      console.info('Development data reset and fixtures reapplied.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Database command failed',
  );
  process.exitCode = 1;
});
