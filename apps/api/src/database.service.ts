import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PostgresDatabaseClient } from '@pcc/database';
import type { QueryResult, QueryResultRow } from 'pg';
import { parseDatabaseEnvironment } from '@pcc/validation';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly #client: PostgresDatabaseClient;

  constructor() {
    const environment = parseDatabaseEnvironment(process.env);
    this.#client = new PostgresDatabaseClient(environment.DATABASE_URL, {
      connectionTimeoutMillis: 2_000,
      max: 5,
    });
  }

  checkConnection(): Promise<void> {
    return this.#client.checkConnection();
  }

  query<Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.#client.query<Row>(text, values);
  }

  onModuleDestroy(): Promise<void> {
    return this.#client.close();
  }
}
