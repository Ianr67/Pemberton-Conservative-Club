import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MediaUpload } from '@pcc/contracts';
import type { AuthenticatedAdministrator } from './auth.service.js';
import { DatabaseService } from './database.service.js';

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

@Injectable()
export class MediaService {
  constructor(private readonly database: DatabaseService) {}

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
    const storageKey = `${id}.${definition.extension}`;
    const directory =
      process.env.MEDIA_STORAGE_PATH ?? join(process.cwd(), '.media');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, storageKey), file.buffer, { flag: 'wx' });
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
    const origin =
      process.env.PUBLIC_API_URL ??
      `http://localhost:${process.env.PORT ?? '3002'}/api/v1`;
    return {
      id,
      url: `${origin.replace(/\/$/, '')}/media/${id}`,
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
    const directory =
      process.env.MEDIA_STORAGE_PATH ?? join(process.cwd(), '.media');
    try {
      return {
        data: await readFile(join(directory, row.storage_key)),
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
