import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service.js';

const cookieName = 'pcc_admin_session';

export function readSession(
  cookieHeader: string | undefined,
): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}

@Controller('api/v1')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/login')
  async login(
    @Body() body: unknown,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as Record<string, unknown>).email !== 'string' ||
      typeof (body as Record<string, unknown>).password !== 'string'
    ) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Email or password is incorrect.',
      });
    }
    const result = await this.auth.login(
      (body as { email: string }).email,
      (body as { password: string }).password,
      ip,
    );
    response.cookie(cookieName, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return { user: result.user };
  }

  @Post('auth/logout')
  async logout(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(readSession(cookie));
    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { status: 'signed_out' };
  }

  @Get('admin/dashboard')
  async dashboard(@Headers('cookie') cookie: string | undefined) {
    return {
      user: await this.auth.authenticate(readSession(cookie)),
      status: 'authenticated',
    };
  }
}
