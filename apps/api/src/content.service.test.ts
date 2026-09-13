import { describe, expect, it, vi } from 'vitest';
import { ContentService } from './content.service.js';

const administrator = {
  id: 'admin-id',
  email: 'admin@example.test',
  displayName: 'Admin',
};

describe('homepage content states', () => {
  it('returns only the version selected as published', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'published-id',
          introduction: 'Old published copy',
          state: 'published',
          version_number: 1,
        },
      ],
    });
    await expect(
      new ContentService({ query } as never).publishedHomepage(),
    ).resolves.toMatchObject({
      introduction: 'Old published copy',
      state: 'published',
    });
    expect(String(query.mock.calls[0]?.[0])).toContain('published_version_id');
  });

  it('saves a separate draft without changing the published pointer', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'draft-id',
          introduction: 'New draft copy',
          state: 'draft',
          version_number: 2,
        },
      ],
    });
    await expect(
      new ContentService({ query } as never).saveDraft(
        'New draft copy',
        administrator,
      ),
    ).resolves.toMatchObject({ state: 'draft', versionNumber: 2 });
    expect(String(query.mock.calls[0]?.[0])).not.toContain(
      'published_version_id =',
    );
  });

  it('publishes the selected draft and writes its audit event atomically', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'draft-id',
          introduction: 'New copy',
          state: 'published',
          version_number: 2,
        },
      ],
    });
    await expect(
      new ContentService({ query } as never).publish('draft-id', administrator),
    ).resolves.toMatchObject({ state: 'published' });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('published_version_id');
    expect(sql).toContain('content.homepage_published');
  });
});

describe('editable website page states', () => {
  it('publishes the selected page draft and audits the page slug', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'draft-id',
          slug: 'about',
          title: 'About the club',
          introduction: 'New about copy',
          eyebrow: 'Our story',
          heading: 'About us',
          body: 'New about copy',
          state: 'published',
          version_number: 2,
        },
      ],
    });
    await expect(
      new ContentService({ query } as never).publishPage(
        'about',
        'draft-id',
        administrator,
      ),
    ).resolves.toMatchObject({
      slug: 'about',
      state: 'published',
      versionNumber: 2,
    });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('content.page_published');
    expect(query.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['draft-id', 'about']),
    );
  });
});
