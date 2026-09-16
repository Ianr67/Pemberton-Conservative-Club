import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { readSession } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MediaService } from './media.service.js';

@Controller('api/v1')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly auth: AuthService,
  ) {}

  @Post('admin/media')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @Headers('cookie') cookie: string | undefined,
    @UploadedFile()
    file:
      | { originalname: string; mimetype: string; size: number; buffer: Buffer }
      | undefined,
  ) {
    const actor = await this.auth.requirePermission(
      readSession(cookie),
      'content.manage',
    );
    return this.media.upload(file, actor);
  }

  @Get('admin/media')
  async library(
    @Headers('cookie') cookie: string | undefined,
    @Query('page') pageValue?: string,
    @Query('pageSize') pageSizeValue?: string,
  ) {
    await this.auth.requirePermission(readSession(cookie), 'content.manage');
    const page = pageValue === undefined ? 1 : Number(pageValue);
    const pageSize = pageSizeValue === undefined ? 24 : Number(pageSizeValue);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    )
      throw new BadRequestException({
        code: 'invalid_pagination',
        message:
          'Page must be positive and page size must be between 1 and 50.',
      });
    return this.media.list(page, pageSize);
  }

  @Get('media/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async image(@Param('id') id: string, @Res() response: Response) {
    const image = await this.media.read(id);
    response.type(image.mimeType).send(image.data);
  }
}
