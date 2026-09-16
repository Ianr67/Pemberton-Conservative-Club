import { describe, expect, it, vi } from 'vitest';
import { MediaController } from './media.controller.js';

describe('MediaController library authorization', () => {
  it('requires content management permission before listing media', async () => {
    const permissionError = Object.assign(new Error('unauthorized'), {
      status: 401,
    });
    const auth = {
      requirePermission: vi.fn().mockRejectedValue(permissionError),
    };
    const media = { list: vi.fn() };
    const controller = new MediaController(media as never, auth as never);

    await expect(controller.library(undefined, '1', '24')).rejects.toBe(
      permissionError,
    );
    expect(auth.requirePermission).toHaveBeenCalledWith(
      undefined,
      'content.manage',
    );
    expect(media.list).not.toHaveBeenCalled();
  });

  it('rejects unbounded page sizes', async () => {
    const auth = {
      requirePermission: vi.fn().mockResolvedValue({ id: 'admin' }),
    };
    const controller = new MediaController(
      { list: vi.fn() } as never,
      auth as never,
    );
    await expect(
      controller.library('session=x', '1', '51'),
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});
