import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { readSession } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContentService } from './content.service.js';
import {
  validatePageContentInput,
  type PageContentInput,
} from '@pcc/contracts';

@Controller('api/v1')
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly auth: AuthService,
  ) {}
  @Get('content/homepage-introduction') published() {
    return this.content.publishedHomepage();
  }
  @Get('content/pages/:slug') publishedPage(@Param('slug') slug: string) {
    return this.content.publishedPage(slug);
  }
  @Get('admin/pages') async pages(@Headers('cookie') cookie?: string) {
    await this.auth.authenticate(readSession(cookie));
    return this.content.listPages();
  }
  @Get('admin/pages/homepage-introduction') async editor(
    @Headers('cookie') cookie?: string,
  ) {
    await this.auth.authenticate(readSession(cookie));
    return this.content.editorState();
  }
  @Get('admin/pages/:slug') async pageEditor(
    @Headers('cookie') cookie: string | undefined,
    @Param('slug') slug: string,
  ) {
    await this.auth.authenticate(readSession(cookie));
    return this.content.pageEditorState(slug);
  }
  @Post('admin/pages/:slug/drafts') async savePage(
    @Headers('cookie') cookie: string | undefined,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const administrator = await this.auth.authenticate(readSession(cookie));
    const errors = validatePageContentInput(body);
    if (errors.length)
      throw new BadRequestException({
        code: 'invalid_page_content',
        message: errors.join(' '),
      });
    return {
      draft: await this.content.savePageDraft(
        slug,
        body as PageContentInput,
        administrator,
      ),
    };
  }
  @Post('admin/pages/:slug/publish') async publishPage(
    @Headers('cookie') cookie: string | undefined,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const administrator = await this.auth.authenticate(readSession(cookie));
    const versionId =
      typeof body === 'object' && body
        ? (body as Record<string, unknown>).versionId
        : undefined;
    if (typeof versionId !== 'string')
      throw new BadRequestException({
        code: 'invalid_version',
        message: 'A draft version is required.',
      });
    return {
      published: await this.content.publishPage(slug, versionId, administrator),
    };
  }
  @Get('admin/pages/homepage-introduction/preview') async preview(
    @Headers('cookie') cookie?: string,
  ) {
    await this.auth.authenticate(readSession(cookie));
    return { draft: await this.content.latestDraft() };
  }
  @Post('admin/pages/homepage-introduction/drafts') async save(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: unknown,
  ) {
    const administrator = await this.auth.authenticate(readSession(cookie));
    const value =
      typeof body === 'object' && body
        ? (body as Record<string, unknown>).introduction
        : undefined;
    if (
      typeof value !== 'string' ||
      value.trim().length < 1 ||
      value.length > 1000
    )
      throw new BadRequestException({
        code: 'invalid_introduction',
        message: 'Introduction must be between 1 and 1000 characters.',
      });
    return { draft: await this.content.saveDraft(value.trim(), administrator) };
  }
  @Post('admin/pages/homepage-introduction/publish') async publish(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: unknown,
  ) {
    const administrator = await this.auth.authenticate(readSession(cookie));
    const id =
      typeof body === 'object' && body
        ? (body as Record<string, unknown>).versionId
        : undefined;
    if (typeof id !== 'string')
      throw new BadRequestException({
        code: 'invalid_version',
        message: 'A draft version is required.',
      });
    return { published: await this.content.publish(id, administrator) };
  }
}
