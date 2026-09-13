import { hashPassword } from '@pcc/database';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service.js';

describe('administrator authentication', () => {
  it('creates a session for a valid administrator', async () => {
    const passwordHash = await hashPassword('correct password');
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'admin@example.test',
            display_name: 'Admin Demo',
            password_hash: passwordHash,
          },
        ],
      })
      .mockResolvedValue({ rows: [] });
    const result = await new AuthService({ query } as never).login(
      'admin@example.test',
      'correct password',
      '127.0.0.1',
    );
    expect(result.user.email).toBe('admin@example.test');
    expect(result.token).toHaveLength(43);
    expect(query).toHaveBeenCalledTimes(3);
  });
  it('fails safely for invalid credentials', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await expect(
      new AuthService({ query } as never).login(
        'unknown@example.test',
        'wrong',
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects a missing session at the permission boundary', async () => {
    await expect(
      new AuthService({ query: vi.fn() } as never).authenticate(undefined),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('enforces the named event-management permission', async () => {
    const authenticated = {
      id: 'user-1',
      email: 'admin@example.test',
      display_name: 'Admin Demo',
      password_hash: null,
    };
    const deniedQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [authenticated] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      new AuthService({ query: deniedQuery } as never).requirePermission(
        'session-token',
        'events.manage',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(deniedQuery.mock.calls[1]?.[1]).toEqual(['user-1', 'events.manage']);

    const allowedQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [authenticated] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    await expect(
      new AuthService({ query: allowedQuery } as never).requirePermission(
        'session-token',
        'events.manage',
      ),
    ).resolves.toMatchObject({ id: 'user-1' });
  });

  it('rate limits repeated invalid logins', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const auth = new AuthService({ query } as never);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        auth.login('admin@example.test', 'wrong', '192.0.2.1'),
      ).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      auth.login('admin@example.test', 'wrong', '192.0.2.1'),
    ).rejects.toMatchObject({ response: { code: 'login_rate_limited' } });
  });
});
