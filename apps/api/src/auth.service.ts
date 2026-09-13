import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyPassword } from '@pcc/database';

import { DatabaseService } from './database.service.js';

interface AdminUserRow {
  display_name: string;
  email: string;
  id: string;
  password_hash: string | null;
}

export interface AuthenticatedAdministrator {
  displayName: string;
  email: string;
  id: string;
}

@Injectable()
export class AuthService {
  readonly #attempts = new Map<string, number[]>();

  constructor(private readonly database: DatabaseService) {}

  async login(
    email: string,
    password: string,
    ip: string,
  ): Promise<{ token: string; user: AuthenticatedAdministrator }> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${ip}:${normalizedEmail}`;
    const cutoff = Date.now() - 15 * 60_000;
    const recent = (this.#attempts.get(key) ?? []).filter(
      (time) => time > cutoff,
    );
    if (recent.length >= 5)
      throw new UnauthorizedException({
        code: 'login_rate_limited',
        message: 'Too many login attempts. Try again later.',
      });

    const result = await this.database.query<AdminUserRow>(
      `SELECT u.id, u.email, u.display_name, u.password_hash
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE lower(u.email) = $1 AND u.status = 'active' AND r.code = 'administrator'
         AND p.code = 'administration.access'
       LIMIT 1`,
      [normalizedEmail],
    );
    const row = result.rows[0];
    const valid = row?.password_hash
      ? await verifyPassword(password, row.password_hash)
      : false;
    if (!row || !valid) {
      this.#attempts.set(key, [...recent, Date.now()]);
      await this.audit(null, 'auth.login_failed', { ip });
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Email or password is incorrect.',
      });
    }

    this.#attempts.delete(key);
    const token = randomBytes(32).toString('base64url');
    await this.database.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + interval '8 hours')`,
      [randomUUID(), row.id, this.hashToken(token)],
    );
    await this.audit(row.id, 'auth.login_succeeded', { ip });
    return {
      token,
      user: { displayName: row.display_name, email: row.email, id: row.id },
    };
  }

  async authenticate(
    token: string | undefined,
  ): Promise<AuthenticatedAdministrator> {
    if (!token)
      throw new UnauthorizedException({
        code: 'authentication_required',
        message: 'Sign in is required.',
      });
    const result = await this.database.query<AdminUserRow>(
      `SELECT u.id, u.email, u.display_name, u.password_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active' AND r.code = 'administrator' AND p.code = 'administration.access'
       LIMIT 1`,
      [this.hashToken(token)],
    );
    const row = result.rows[0];
    if (!row)
      throw new UnauthorizedException({
        code: 'authentication_required',
        message: 'Sign in is required.',
      });
    return { displayName: row.display_name, email: row.email, id: row.id };
  }

  async requirePermission(
    token: string | undefined,
    permission: string,
  ): Promise<AuthenticatedAdministrator> {
    const user = await this.authenticate(token);
    const result = await this.database.query(
      `SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id
       JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1 AND p.code=$2 LIMIT 1`,
      [user.id, permission],
    );
    if (!result.rows[0])
      throw new ForbiddenException({
        code: 'permission_denied',
        message: 'You do not have permission to manage events.',
      });
    return user;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const result = await this.database.query<{ user_id: string }>(
      `UPDATE sessions SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL RETURNING user_id`,
      [this.hashToken(token)],
    );
    if (result.rows[0])
      await this.audit(result.rows[0].user_id, 'auth.logout', {});
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async audit(
    actorUserId: string | null,
    action: string,
    metadata: object,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO audit_events (id, actor_user_id, action, entity_type, metadata)
       VALUES ($1, $2, $3, 'session', $4::jsonb)`,
      [randomUUID(), actorUserId, action, JSON.stringify(metadata)],
    );
  }
}
