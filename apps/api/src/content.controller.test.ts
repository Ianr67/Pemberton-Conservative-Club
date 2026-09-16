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

  it.each([
    ['editor', (controller: ContentController) => controller.editor(undefined)],
    [
      'preview',
      (controller: ContentController) => controller.preview(undefined),
    ],
    [
      'save',
      (controller: ContentController) =>
        controller.save(undefined, { introduction: 'Welcome.' }),
    ],
    [
      'publish',
      (controller: ContentController) =>
        controller.publish(undefined, { versionId: 'draft-id' }),
    ],
  ])('protects homepage %s with content.manage', async (_, invoke) => {
    const forbidden = Object.assign(new Error('forbidden'), { status: 403 });
    const auth = {
      requirePermission: vi.fn().mockRejectedValue(forbidden),
    };
    const content = {
      editorState: vi.fn(),
      latestDraft: vi.fn(),
      saveDraft: vi.fn(),
      publish: vi.fn(),
    };
    const controller = new ContentController(content as never, auth as never);

    await expect(invoke(controller)).rejects.toBe(forbidden);
    expect(auth.requirePermission).toHaveBeenCalledWith(
      undefined,
      'content.manage',
    );
  });
});
