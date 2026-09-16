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

const filesystemMediaEnvironmentSchema = z.object({
  MEDIA_STORAGE_DRIVER: z.literal('filesystem').default('filesystem'),
  MEDIA_STORAGE_PATH: z.string().trim().min(1).default('.media'),
});

const s3MediaEnvironmentSchema = z.object({
  MEDIA_STORAGE_DRIVER: z.literal('s3'),
  S3_ENDPOINT: z.url().refine((value) => new URL(value).protocol === 'https:', {
    message: 'S3_ENDPOINT must use HTTPS',
  }),
  S3_REGION: z.string().trim().min(1),
  S3_BUCKET: z.string().trim().min(3),
  S3_ACCESS_KEY_ID: z.string().trim().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type MediaStorageEnvironment =
  | z.infer<typeof filesystemMediaEnvironmentSchema>
  | z.infer<typeof s3MediaEnvironmentSchema>;

export function parseMediaStorageEnvironment(
  environment: NodeJS.ProcessEnv,
): MediaStorageEnvironment {
  if (
    environment.NODE_ENV === 'production' &&
    environment.MEDIA_STORAGE_DRIVER !== 's3'
  ) {
    throw new Error(
      'Production requires MEDIA_STORAGE_DRIVER=s3 with complete S3 configuration',
    );
  }
  return environment.MEDIA_STORAGE_DRIVER === 's3'
    ? s3MediaEnvironmentSchema.parse(environment)
    : filesystemMediaEnvironmentSchema.parse(environment);
}
