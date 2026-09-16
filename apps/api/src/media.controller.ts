import {
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
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
    const actor = await this.auth.authenticate(readSession(cookie));
    return this.media.upload(file, actor);
  }

  @Get('media/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async image(@Param('id') id: string, @Res() response: Response) {
    const image = await this.media.read(id);
    response.type(image.mimeType).send(image.data);
  }
}
