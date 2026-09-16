import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  parseMediaStorageEnvironment,
  type MediaStorageEnvironment,
} from '@pcc/validation';

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

export interface StoredMedia {
  data: Buffer;
  contentType: string;
  metadata: Readonly<Record<string, string>>;
}

export interface MediaStorage {
  upload(
    key: string,
    data: Buffer,
    contentType: string,
    metadata?: Readonly<Record<string, string>>,
  ): Promise<void>;
  read(key: string): Promise<StoredMedia>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

const safeKeyPattern =
  /^(?:media\/)?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)$/;

function assertSafeKey(key: string): void {
  if (!safeKeyPattern.test(key)) throw new Error('Unsafe media storage key');
}

export function createMediaObjectKey(extension: string): string {
  if (!['jpg', 'png', 'webp', 'gif'].includes(extension))
    throw new Error('Unsupported media extension');
  return `media/${randomUUID()}.${extension}`;
}

export class FilesystemMediaStorage implements MediaStorage {
  readonly #root: string;

  constructor(root: string) {
    this.#root = resolve(root);
  }

  #path(key: string): string {
    assertSafeKey(key);
    const path = resolve(this.#root, ...key.split('/'));
    if (!path.startsWith(`${this.#root}${sep}`))
      throw new Error('Unsafe media storage path');
    return path;
  }

  async upload(key: string, data: Buffer): Promise<void> {
    const path = this.#path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: 'wx' });
  }

  async read(key: string): Promise<StoredMedia> {
    return {
      data: await readFile(this.#path(key)),
      contentType: '',
      metadata: {},
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.#path(key), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.#path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

interface S3Sender {
  send(command: object): Promise<unknown>;
}

export class S3MediaStorage implements MediaStorage {
  constructor(
    private readonly client: S3Sender,
    private readonly bucket: string,
  ) {}

  async upload(
    key: string,
    data: Buffer,
    contentType: string,
    metadata: Readonly<Record<string, string>> = {},
  ): Promise<void> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        Metadata: { ...metadata },
      }),
    );
  }

  async read(key: string): Promise<StoredMedia> {
    assertSafeKey(key);
    const result = (await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as {
      Body?: { transformToByteArray(): Promise<Uint8Array> };
      ContentType?: string;
      Metadata?: Record<string, string>;
    };
    if (!result.Body) throw new Error('S3 object body was empty');
    return {
      data: Buffer.from(await result.Body.transformToByteArray()),
      contentType: result.ContentType ?? '',
      metadata: result.Metadata ?? {},
    };
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

export function createMediaStorage(
  environment: NodeJS.ProcessEnv = process.env,
  s3ClientFactory: (
    configuration: NonNullable<ConstructorParameters<typeof S3Client>[0]>,
  ) => S3Sender = (configuration) => new S3Client(configuration),
): MediaStorage {
  const configuration: MediaStorageEnvironment =
    parseMediaStorageEnvironment(environment);
  if (configuration.MEDIA_STORAGE_DRIVER === 'filesystem')
    return new FilesystemMediaStorage(configuration.MEDIA_STORAGE_PATH);

  return new S3MediaStorage(
    s3ClientFactory({
      endpoint: configuration.S3_ENDPOINT,
      region: configuration.S3_REGION,
      forcePathStyle: configuration.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: configuration.S3_ACCESS_KEY_ID,
        secretAccessKey: configuration.S3_SECRET_ACCESS_KEY,
      },
    }),
    configuration.S3_BUCKET,
  );
}
