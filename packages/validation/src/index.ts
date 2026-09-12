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
