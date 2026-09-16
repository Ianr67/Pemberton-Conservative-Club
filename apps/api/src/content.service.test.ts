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
        { introduction: 'New draft copy', image: null },
        administrator,
      ),
    ).resolves.toMatchObject({ state: 'draft', versionNumber: 2 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).not.toContain('published_version_id =');
    expect(sql).toContain('eyebrow, heading, body');
    expect(query.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['New draft copy', null]),
    );
  });

  it('stores the selected media UUID and clears all image fields on removal', async () => {
    const imageRow = {
      id: 'draft-id',
      introduction: 'New draft copy',
      state: 'draft',
      version_number: 2,
      image_url: 'https://api.example.test/api/v1/media/media-id',
      image_alt: 'Members talking in the club lounge',
      image_width: 1600,
      image_height: 900,
      image_media_id: '70000000-0000-4000-8000-000000000001',
    };
    const query = vi.fn().mockResolvedValue({ rows: [imageRow] });
    const service = new ContentService({ query } as never);
    await expect(
      service.saveDraft(
        {
          introduction: 'New draft copy',
          image: {
            url: imageRow.image_url,
            alt: imageRow.image_alt,
            width: imageRow.image_width,
            height: imageRow.image_height,
            mediaId: imageRow.image_media_id,
          },
        },
        administrator,
      ),
    ).resolves.toMatchObject({ image: { mediaId: imageRow.image_media_id } });
    expect(query.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([imageRow.image_media_id]),
    );

    query.mockResolvedValueOnce({
      rows: [
        {
          ...imageRow,
          image_url: null,
          image_alt: null,
          image_width: null,
          image_height: null,
          image_media_id: null,
        },
      ],
    });
    await expect(
      service.saveDraft(
        { introduction: 'New draft copy', image: null },
        administrator,
      ),
    ).resolves.toMatchObject({ image: null });
    expect(query.mock.calls[1]?.[1]?.slice(3)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
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
  it('stores the selected media identifier on a page draft', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'draft-id',
          slug: 'about',
          title: 'About the club',
          introduction: 'Body',
          eyebrow: 'Our story',
          heading: 'About us',
          body: 'Body',
          state: 'draft',
          version_number: 2,
          image_url: 'https://api.example.test/api/v1/media/media-id',
          image_alt: 'The club room ready for an event',
          image_width: null,
          image_height: null,
          image_media_id: '70000000-0000-4000-8000-000000000001',
        },
      ],
    });
    await expect(
      new ContentService({ query } as never).savePageDraft(
        'about',
        {
          eyebrow: 'Our story',
          heading: 'About us',
          body: 'Body',
          image: {
            url: 'https://api.example.test/api/v1/media/media-id',
            alt: 'The club room ready for an event',
            width: null,
            height: null,
            mediaId: '70000000-0000-4000-8000-000000000001',
          },
        },
        administrator,
      ),
    ).resolves.toMatchObject({
      image: {
        mediaId: '70000000-0000-4000-8000-000000000001',
        alt: 'The club room ready for an event',
      },
    });
    expect(String(query.mock.calls[0]?.[0])).toContain('image_media_id');
    expect(query.mock.calls[0]?.[1]).toContain(
      '70000000-0000-4000-8000-000000000001',
    );
  });

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
  it('deletes a page and records its former identity', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'page-id' }] });
    await expect(
      new ContentService({ query } as never).deletePage('about', administrator),
    ).resolves.toEqual({ deleted: true, slug: 'about' });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('DELETE FROM pages');
    expect(sql).toContain('content.page_deleted');
  });

  it('protects the structural homepage from deletion', async () => {
    await expect(
      new ContentService({ query: vi.fn() } as never).deletePage(
        'homepage',
        administrator,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
