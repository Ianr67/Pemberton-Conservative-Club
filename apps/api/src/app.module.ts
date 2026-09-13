import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';
import { DatabaseService } from './database.service.js';
import { ClubSettingsController } from './club-settings.controller.js';
import { ClubSettingsService } from './club-settings.service.js';

@Module({
  controllers: [
    AppController,
    AuthController,
    ContentController,
    ClubSettingsController,
  ],
  providers: [
    DatabaseService,
    AuthService,
    ContentService,
    ClubSettingsService,
  ],
})
export class AppModule {}
