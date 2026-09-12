import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

import {
  Pool,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from 'pg';

const scrypt = promisify(scryptCallback);

export const minimumPostgresMajorVersion = 15;

export interface DatabaseClient {
  checkConnection(): Promise<void>;
  close(): Promise<void>;
}

export class PostgresDatabaseClient implements DatabaseClient {
  readonly #pool: Pool;

  constructor(
    connectionString: string,
    poolConfig: Omit<PoolConfig, 'connectionString'> = {},
  ) {
    this.#pool = new Pool({
      ...poolConfig,
      connectionString,
    });
  }

  async checkConnection(): Promise<void> {
    await this.#pool.query('SELECT 1');
  }

  query<Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.#pool.query<Row>(text, [...values]);
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

export async function hashPassword(
  password: string,
  salt = randomBytes(16),
): Promise<string> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64url');
  const actual = (await scrypt(
    password,
    Buffer.from(saltText, 'base64url'),
    expected.length,
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
