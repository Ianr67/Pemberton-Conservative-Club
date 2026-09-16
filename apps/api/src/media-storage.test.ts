import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMediaObjectKey,
  createMediaStorage,
  FilesystemMediaStorage,
  S3MediaStorage,
} from './media-storage.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('media storage selection and keys', () => {
  it('generates opaque safe keys without using the uploaded filename', () => {
    const key = createMediaObjectKey('png');
    expect(key).toMatch(/^media\/[0-9a-f-]{36}\.png$/);
    expect(key).not.toContain('..');
    expect(() => createMediaObjectKey('../png')).toThrow();
  });

  it('selects filesystem storage by default', () => {
    expect(createMediaStorage({})).toBeInstanceOf(FilesystemMediaStorage);
  });

  it('selects S3 storage and passes validated configuration', () => {
    const factory = vi.fn(() => ({ send: vi.fn() }));
    const storage = createMediaStorage(
      {
        MEDIA_STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://objects.example.test',
        S3_REGION: 'auto',
        S3_BUCKET: 'pcc-media',
        S3_ACCESS_KEY_ID: 'access-key',
        S3_SECRET_ACCESS_KEY: 'secret-key',
        S3_FORCE_PATH_STYLE: 'true',
      },
      factory,
    );
    expect(storage).toBeInstanceOf(S3MediaStorage);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://objects.example.test',
        region: 'auto',
        forcePathStyle: true,
      }),
    );
  });
});

describe('FilesystemMediaStorage', () => {
  it('uploads, reads, checks and deletes media in its root', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pcc-media-'));
    temporaryDirectories.push(directory);
    const storage = new FilesystemMediaStorage(directory);
    const key = createMediaObjectKey('png');
    const data = Buffer.from('test image');

    await storage.upload(key, data, 'image/png', { 'media-id': 'test' });
    await expect(storage.exists(key)).resolves.toBe(true);
    await expect(storage.read(key)).resolves.toMatchObject({ data });
    await expect(readFile(join(directory, ...key.split('/')))).resolves.toEqual(
      data,
    );
    await storage.delete(key);
    await expect(storage.exists(key)).resolves.toBe(false);
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it('rejects keys outside the managed namespace', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pcc-media-'));
    temporaryDirectories.push(directory);
    const storage = new FilesystemMediaStorage(directory);
    await expect(storage.read('../secret')).rejects.toThrow('Unsafe');
  });

  it('can read safe keys created by the previous filesystem implementation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pcc-media-'));
    temporaryDirectories.push(directory);
    const storage = new FilesystemMediaStorage(directory);
    const generated = createMediaObjectKey('jpg');
    const legacyKey = generated.slice('media/'.length);
    await storage.upload(legacyKey, Buffer.from('legacy'), 'image/jpeg');
    await expect(storage.read(legacyKey)).resolves.toMatchObject({
      data: Buffer.from('legacy'),
    });
  });
});

describe('S3MediaStorage', () => {
  it('maps storage operations to S3 commands and preserves metadata', async () => {
    const send = vi.fn(async (command: object) => {
      if (command instanceof GetObjectCommand)
        return {
          Body: {
            transformToByteArray: async () => new Uint8Array([1, 2, 3]),
          },
          ContentType: 'image/png',
          Metadata: { 'media-id': 'test' },
        };
      return {};
    });
    const storage = new S3MediaStorage({ send }, 'pcc-media');
    const key = createMediaObjectKey('png');

    await storage.upload(key, Buffer.from([1, 2, 3]), 'image/png', {
      'media-id': 'test',
    });
    await expect(storage.exists(key)).resolves.toBe(true);
    await expect(storage.read(key)).resolves.toEqual({
      data: Buffer.from([1, 2, 3]),
      contentType: 'image/png',
      metadata: { 'media-id': 'test' },
    });
    await storage.delete(key);

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[3]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it('returns false only for an S3 not-found response', async () => {
    const notFound = Object.assign(new Error('missing'), {
      $metadata: { httpStatusCode: 404 },
    });
    const storage = new S3MediaStorage(
      { send: vi.fn().mockRejectedValue(notFound) },
      'pcc-media',
    );
    await expect(storage.exists(createMediaObjectKey('jpg'))).resolves.toBe(
      false,
    );
  });
});
