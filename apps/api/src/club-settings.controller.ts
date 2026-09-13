import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { validateClubSettings, type ClubSettingsInput } from '@pcc/contracts';
import { readSession } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ClubSettingsService } from './club-settings.service.js';
@Controller('api/v1')
export class ClubSettingsController {
  constructor(
    private readonly settings: ClubSettingsService,
    private readonly auth: AuthService,
  ) {}
  @Get('club-settings') published() {
    return this.settings.published();
  }
  @Get('admin/club-settings') async editor(@Headers('cookie') cookie?: string) {
    await this.auth.authenticate(readSession(cookie));
    return this.settings.editorState();
  }
  @Post('admin/club-settings/drafts') async save(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: unknown,
  ) {
    const actor = await this.auth.authenticate(readSession(cookie));
    const errors = validateClubSettings(body);
    if (errors.length)
      throw new BadRequestException({
        code: 'invalid_club_settings',
        message: 'Check the highlighted settings.',
        errors,
      });
    return {
      draft: await this.settings.saveDraft(body as ClubSettingsInput, actor),
    };
  }
  @Post('admin/club-settings/publish') async publish(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: unknown,
  ) {
    const actor = await this.auth.authenticate(readSession(cookie));
    const id =
      body && typeof body === 'object'
        ? (body as Record<string, unknown>).versionId
        : null;
    if (typeof id !== 'string')
      throw new BadRequestException({
        code: 'invalid_version',
        message: 'A draft version is required.',
      });
    return { published: await this.settings.publish(id, actor) };
  }
}
