import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);

export function parseServiceEnvironment(
  environment: NodeJS.ProcessEnv,
  defaultPort: number,
) {
  return z
    .object({
      NODE_ENV: nodeEnvironmentSchema.default('development'),
      PORT: z.coerce.number().int().min(1).max(65_535).default(defaultPort),
    })
    .parse(environment);
}

function isPostgresUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'postgres:' || protocol === 'postgresql:';
  } catch {
    return false;
  }
}

export function parseDatabaseEnvironment(environment: NodeJS.ProcessEnv) {
  return z
    .object({
      DATABASE_URL: z.string().refine(isPostgresUrl, {
        message: 'DATABASE_URL must be a valid PostgreSQL connection URL',
      }),
    })
    .parse(environment);
}
