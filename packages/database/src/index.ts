import { Pool, type PoolConfig } from 'pg';

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

  async close(): Promise<void> {
    await this.#pool.end();
  }
}
