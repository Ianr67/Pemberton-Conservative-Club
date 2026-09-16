import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedAdministrator } from './auth.service.js';
import type { HomepageContentInput } from '@pcc/contracts';
import { DatabaseService } from './database.service.js';

interface VersionRow {
  id: string;
  introduction: string;
  eyebrow: string;
  heading: string;
  body: string;
  state: 'draft' | 'published';
  version_number: number;
  image_url: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
  image_media_id: string | null;
}

interface PageVersionRow extends VersionRow {
  slug: string;
  title: string;
}

@Injectable()
export class ContentService {
  constructor(private readonly database: DatabaseService) {}
  private present(row: VersionRow) {
    return {
      id: row.id,
      introduction: row.introduction,
      state: row.state,
      versionNumber: row.version_number,
      image: row.image_url
        ? {
            url: row.image_url,
            alt: row.image_alt!,
            width: row.image_width,
            height: row.image_height,
            mediaId: row.image_media_id,
          }
        : null,
    };
  }

  private presentPage(row: PageVersionRow) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      eyebrow: row.eyebrow,
      heading: row.heading,
      body: row.body,
      state: row.state,
      versionNumber: row.version_number,
      image: row.image_url
        ? {
            url: row.image_url,
            alt: row.image_alt!,
            width: row.image_width,
            height: row.image_height,
            mediaId: row.image_media_id,
          }
        : null,
    };
  }

  async publishedHomepage() {
    const result = await this.database.query<VersionRow>(
      `SELECT pv.id, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id FROM pages p JOIN page_versions pv ON pv.id = p.published_version_id WHERE p.slug = 'homepage'`,
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'content_not_found',
        message: 'Homepage introduction is unavailable.',
      });
    return this.present(result.rows[0]);
  }
  async listPages() {
    const result = await this.database.query<{
      id: string;
      slug: string;
      title: string;
      published_version: number | null;
    }>(
      `SELECT p.id, p.slug, p.title, pv.version_number AS published_version FROM pages p LEFT JOIN page_versions pv ON pv.id = p.published_version_id ORDER BY CASE WHEN p.slug = 'homepage' THEN 0 ELSE 1 END, p.title`,
    );
    return {
      pages: result.rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        publishedVersion: r.published_version,
      })),
    };
  }

  async publishedPage(slug: string) {
    const result = await this.database.query<PageVersionRow>(
      `SELECT pv.id, p.slug, p.title, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id
       FROM pages p JOIN page_versions pv ON pv.id = p.published_version_id WHERE p.slug = $1`,
      [slug],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'content_not_found',
        message: 'Page content is unavailable.',
      });
    return this.presentPage(result.rows[0]);
  }

  async latestPageDraft(slug: string) {
    const result = await this.database.query<PageVersionRow>(
      `SELECT pv.id, p.slug, p.title, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id
       FROM pages p JOIN page_versions pv ON pv.page_id = p.id
       WHERE p.slug = $1 AND pv.state = 'draft' ORDER BY pv.version_number DESC LIMIT 1`,
      [slug],
    );
    return result.rows[0] ? this.presentPage(result.rows[0]) : null;
  }

  async pageEditorState(slug: string) {
    return {
      published: await this.publishedPage(slug),
      draft: await this.latestPageDraft(slug),
    };
  }

  async savePageDraft(
    slug: string,
    input: {
      eyebrow: string;
      heading: string;
      body: string;
      image?: {
        url: string;
        alt: string;
        width: number | null;
        height: number | null;
        mediaId: string | null;
      } | null;
    },
    administrator: AuthenticatedAdministrator,
  ) {
    const result = await this.database.query<PageVersionRow>(
      `INSERT INTO page_versions (id, page_id, version_number, state, introduction, eyebrow, heading, body, created_by, image_url, image_alt, image_width, image_height, image_media_id)
       SELECT $1, p.id, COALESCE(max(pv.version_number), 0) + 1, 'draft', $4, $2, $3, $4, $5, $7, $8, $9, $10, $11
       FROM pages p LEFT JOIN page_versions pv ON pv.page_id = p.id WHERE p.slug = $6 GROUP BY p.id, p.slug, p.title
       RETURNING id, introduction, eyebrow, heading, body, state, version_number, image_url, image_alt, image_width, image_height, image_media_id,
         (SELECT slug FROM pages WHERE id = page_id) AS slug,
         (SELECT title FROM pages WHERE id = page_id) AS title`,
      [
        randomUUID(),
        input.eyebrow.trim(),
        input.heading.trim(),
        input.body.trim(),
        administrator.id,
        slug,
        input.image?.url ?? null,
        input.image?.alt.trim() ?? null,
        input.image?.width ?? null,
        input.image?.height ?? null,
        input.image?.mediaId ?? null,
      ],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'page_not_found',
        message: 'Page could not be found.',
      });
    return this.presentPage(result.rows[0]);
  }

  async publishPage(
    slug: string,
    versionId: string,
    administrator: AuthenticatedAdministrator,
  ) {
    const result = await this.database.query<PageVersionRow>(
      `WITH selected AS (
         UPDATE page_versions pv SET state = 'published', published_at = now() FROM pages p
         WHERE pv.id = $1 AND pv.page_id = p.id AND p.slug = $2 AND pv.state = 'draft'
         RETURNING pv.id, pv.page_id, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id
       ), updated_page AS (
         UPDATE pages p SET published_version_id = selected.id, updated_at = now() FROM selected WHERE p.id = selected.page_id RETURNING p.id, p.slug, p.title
       ), audited AS (
         INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, metadata)
         SELECT $3, $4, 'content.page_published', 'page_version', selected.id, jsonb_build_object('slug', updated_page.slug, 'versionNumber', selected.version_number) FROM selected, updated_page
       ) SELECT selected.*, updated_page.slug, updated_page.title FROM selected, updated_page`,
      [versionId, slug, randomUUID(), administrator.id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'draft_not_found',
        message: 'Draft could not be published.',
      });
    return this.presentPage(result.rows[0]);
  }
  async deletePage(slug: string, administrator: AuthenticatedAdministrator) {
    if (slug === 'homepage')
      throw new BadRequestException({
        code: 'protected_page',
        message:
          'The homepage is required by the website and cannot be deleted.',
      });
    const result = await this.database.query<{ id: string }>(
      `WITH cleared AS (UPDATE pages SET published_version_id=NULL WHERE slug=$1 RETURNING id), removed AS (DELETE FROM pages WHERE id IN (SELECT id FROM cleared) RETURNING id,slug,title), audited AS (INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $2,$3,'content.page_deleted','page',id,jsonb_build_object('slug',slug,'title',title) FROM removed) SELECT id FROM removed`,
      [slug, randomUUID(), administrator.id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'page_not_found',
        message: 'Page could not be found.',
      });
    return { deleted: true, slug };
  }
  async latestDraft() {
    const result = await this.database.query<VersionRow>(
      `SELECT pv.id, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id FROM pages p JOIN page_versions pv ON pv.page_id = p.id WHERE p.slug = 'homepage' AND pv.state = 'draft' ORDER BY pv.version_number DESC LIMIT 1`,
    );
    return result.rows[0] ? this.present(result.rows[0]) : null;
  }
  async editorState() {
    return {
      published: await this.publishedHomepage(),
      draft: await this.latestDraft(),
    };
  }
  async saveDraft(
    input: HomepageContentInput,
    administrator: AuthenticatedAdministrator,
  ) {
    const result = await this.database.query<VersionRow>(
      `INSERT INTO page_versions (id, page_id, version_number, state, introduction, eyebrow, heading, body, created_by, image_url, image_alt, image_width, image_height, image_media_id)
       SELECT $1, p.id, COALESCE(max(pv.version_number), 0) + 1, 'draft', $2, 'Welcome to Pemberton', p.title, $2, $3, $4, $5, $6, $7, $8
       FROM pages p LEFT JOIN page_versions pv ON pv.page_id = p.id WHERE p.slug = 'homepage' GROUP BY p.id, p.title
       RETURNING id, introduction, eyebrow, heading, body, state, version_number, image_url, image_alt, image_width, image_height, image_media_id`,
      [
        randomUUID(),
        input.introduction.trim(),
        administrator.id,
        input.image?.url ?? null,
        input.image?.alt.trim() ?? null,
        input.image?.width ?? null,
        input.image?.height ?? null,
        input.image?.mediaId ?? null,
      ],
    );
    if (!result.rows[0]) throw new NotFoundException();
    return this.present(result.rows[0]);
  }
  async publish(versionId: string, administrator: AuthenticatedAdministrator) {
    const result = await this.database.query<VersionRow>(
      `WITH selected AS (UPDATE page_versions pv SET state = 'published', published_at = now() FROM pages p WHERE pv.id = $1 AND pv.page_id = p.id AND p.slug = 'homepage' AND pv.state = 'draft' RETURNING pv.id, pv.page_id, pv.introduction, pv.eyebrow, pv.heading, pv.body, pv.state, pv.version_number, pv.image_url, pv.image_alt, pv.image_width, pv.image_height, pv.image_media_id), updated_page AS (UPDATE pages p SET published_version_id = selected.id, updated_at = now() FROM selected WHERE p.id = selected.page_id RETURNING p.id), audited AS (INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, metadata) SELECT $2, $3, 'content.homepage_published', 'page_version', selected.id, jsonb_build_object('versionNumber', selected.version_number) FROM selected, updated_page) SELECT id, introduction, eyebrow, heading, body, state, version_number, image_url, image_alt, image_width, image_height, image_media_id FROM selected`,
      [versionId, randomUUID(), administrator.id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'draft_not_found',
        message: 'Draft could not be published.',
      });
    return this.present(result.rows[0]);
  }
}
