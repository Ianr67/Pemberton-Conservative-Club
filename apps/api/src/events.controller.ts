import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { validateEventInput, type EventInput } from '@pcc/contracts';
import { readSession } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EventsService } from './events.service.js';

@Controller('api/v1')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly auth: AuthService,
  ) {}
  @Get('events') async publicList() {
    return { events: await this.events.publicList() };
  }
  @Get('events/:slug') publicDetail(@Param('slug') slug: string) {
    return this.events.publicDetail(slug);
  }
  @Get('admin/venues') async venues(@Headers('cookie') cookie?: string) {
    await this.authorize(cookie);
    return { venues: await this.events.venues() };
  }
  @Get('admin/events') async list(@Headers('cookie') cookie?: string) {
    await this.authorize(cookie);
    return { events: await this.events.adminList() };
  }
  @Get('admin/events/:id') async detail(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
  ) {
    await this.authorize(cookie);
    return this.events.adminDetail(id);
  }
  @Get('admin/events/:id/preview') async preview(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
  ) {
    await this.authorize(cookie);
    return this.events.adminDetail(id);
  }
  @Post('admin/events') async create(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: unknown,
  ) {
    const actor = await this.authorize(cookie);
    return this.events.create(this.input(body), actor);
  }
  @Patch('admin/events/:id') async update(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actor = await this.authorize(cookie);
    return this.events.update(id, this.input(body), actor);
  }
  @Post('admin/events/:id/publish') async publish(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
  ) {
    const actor = await this.authorize(cookie);
    return this.events.setPublished(id, true, actor);
  }
  @Post('admin/events/:id/unpublish') async unpublish(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
  ) {
    const actor = await this.authorize(cookie);
    return this.events.setPublished(id, false, actor);
  }
  private authorize(cookie?: string) {
    return this.auth.requirePermission(readSession(cookie), 'events.manage');
  }
  private input(body: unknown): EventInput {
    const errors = validateEventInput(body);
    if (errors.length)
      throw new BadRequestException({
        code: 'invalid_event',
        message: 'Check the event details.',
        errors,
      });
    return body as EventInput;
  }
}
