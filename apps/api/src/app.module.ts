import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';
import { DatabaseService } from './database.service.js';

@Module({
  controllers: [AppController, AuthController, ContentController],
  providers: [DatabaseService, AuthService, ContentService],
})
export class AppModule {}
