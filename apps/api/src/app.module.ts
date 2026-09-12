import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DatabaseService } from './database.service.js';

@Module({
  controllers: [AppController, AuthController],
  providers: [DatabaseService, AuthService],
})
export class AppModule {}
