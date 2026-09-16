import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MediaLibraryPage, MediaUpload } from '@pcc/contracts';
import type { AuthenticatedAdministrator } from './auth.service.js';
import { DatabaseService } from './database.service.js';
import {
  createMediaObjectKey,
  MEDIA_STORAGE,
  type MediaStorage,
} from './media-storage.js';

const supported = {
  'image/jpeg': { extension: 'jpg', signatures: [[0xff, 0xd8, 0xff]] },
  'image/png': {
    extension: 'png',
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  'image/webp': { extension: 'webp', signatures: [[0x52, 0x49, 0x46, 0x46]] },
  'image/gif': { extension: 'gif', signatures: [[0x47, 0x49, 0x46, 0x38]] },
} as const;

interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
interface MediaRow {
  id: string;
  storage_key: string;
  mime_type: string;
}
interface MediaLibraryRow extends MediaRow {
  original_filename: string;
  byte_size: number;
  created_at: Date;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
  ) {}

  private publicUrl(id: string): string {
    const origin =
      process.env.PUBLIC_API_URL ??
      `http://localhost:${process.env.PORT ?? '3002'}/api/v1`;
    return `${origin.replace(/\/$/, '')}/media/${id}`;
  }

  async list(page: number, pageSize: number): Promise<MediaLibraryPage> {
    const offset = (page - 1) * pageSize;
    const [result, count] = await Promise.all([
      this.database.query<MediaLibraryRow>(
        `SELECT id,storage_key,original_filename,mime_type,byte_size,created_at
         FROM media WHERE mime_type LIKE 'image/%'
         ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
      this.database.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM media WHERE mime_type LIKE 'image/%'`,
      ),
    ]);
    return {
      page,
      pageSize,
      total: Number(count.rows[0]?.count ?? 0),
      media: result.rows.map((row) => ({
        id: row.id,
        url: this.publicUrl(row.id),
        alt: '',
        width: null,
        height: null,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  async upload(
    file: UploadedImage | undefined,
    actor: AuthenticatedAdministrator,
  ): Promise<MediaUpload> {
    if (!file)
      throw new BadRequestException({
        code: 'image_required',
        message: 'Choose an image to upload.',
      });
    const definition = supported[file.mimetype as keyof typeof supported];
    if (
      !definition ||
      file.size < 1 ||
      file.size > 5 * 1024 * 1024 ||
      !definition.signatures.some((signature) =>
        signature.every((byte, index) => file.buffer[index] === byte),
      )
    ) {
      throw new BadRequestException({
        code: 'invalid_image',
        message: 'Upload a JPEG, PNG, WebP or GIF image no larger than 5 MB.',
      });
    }
    if (
      file.mimetype === 'image/webp' &&
      file.buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
      throw new BadRequestException({
        code: 'invalid_image',
        message: 'The uploaded file is not a valid WebP image.',
      });
    }
    const id = randomUUID();
    const storageKey = createMediaObjectKey(definition.extension);
    await this.storage.upload(storageKey, file.buffer, file.mimetype, {
      'media-id': id,
    });
    try {
      await this.database.query(
        `INSERT INTO media(id,storage_key,original_filename,mime_type,byte_size,created_by) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          id,
          storageKey,
          file.originalname.slice(0, 255),
          file.mimetype,
          file.size,
          actor.id,
        ],
      );
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    return {
      id,
      url: this.publicUrl(id),
      alt: '',
      width: null,
      height: null,
    };
  }

  async read(id: string) {
    const row = (
      await this.database.query<MediaRow>(
        'SELECT id,storage_key,mime_type FROM media WHERE id=$1',
        [id],
      )
    ).rows[0];
    if (!row)
      throw new NotFoundException({
        code: 'media_not_found',
        message: 'Image was not found.',
      });
    try {
      const stored = await this.storage.read(row.storage_key);
      return {
        data: stored.data,
        mimeType: row.mime_type,
      };
    } catch {
      throw new NotFoundException({
        code: 'media_not_found',
        message: 'Image was not found.',
      });
    }
  }
}
