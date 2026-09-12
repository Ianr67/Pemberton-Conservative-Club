import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { parseServiceEnvironment } from '@pcc/validation';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const environment = parseServiceEnvironment(process.env, 3002);
  const app = await NestFactory.create(AppModule);
  await app.listen(environment.PORT);
}

void bootstrap();
