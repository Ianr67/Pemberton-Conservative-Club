import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';
import { DatabaseService } from './database.service.js';
import { ClubSettingsController } from './club-settings.controller.js';
import { ClubSettingsService } from './club-settings.service.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { createMediaStorage, MEDIA_STORAGE } from './media-storage.js';

@Module({
  controllers: [
    AppController,
    AuthController,
    ContentController,
    ClubSettingsController,
    EventsController,
    MediaController,
  ],
  providers: [
    DatabaseService,
    AuthService,
    ContentService,
    ClubSettingsService,
    EventsService,
    MediaService,
    {
      provide: MEDIA_STORAGE,
      useFactory: () => createMediaStorage(),
    },
  ],
})
export class AppModule {}
