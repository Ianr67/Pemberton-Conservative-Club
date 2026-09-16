import { describe, expect, it, vi } from 'vitest';
import { ContentController } from './content.controller.js';

describe('ContentController draft access', () => {
  it('does not return editor drafts without content management permission', async () => {
    const unauthorized = Object.assign(new Error('unauthorized'), {
      status: 401,
    });
    const auth = {
      requirePermission: vi.fn().mockRejectedValue(unauthorized),
    };
    const content = { pageEditorState: vi.fn() };
    const controller = new ContentController(content as never, auth as never);

    await expect(controller.pageEditor(undefined, 'about')).rejects.toBe(
      unauthorized,
    );
    expect(auth.requirePermission).toHaveBeenCalledWith(
      undefined,
      'content.manage',
    );
    expect(content.pageEditorState).not.toHaveBeenCalled();
  });
});
