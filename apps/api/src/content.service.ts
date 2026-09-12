import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedAdministrator } from './auth.service.js';
import { DatabaseService } from './database.service.js';

interface VersionRow {
  id: string;
  introduction: string;
  state: 'draft' | 'published';
  version_number: number;
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
    };
  }

  async publishedHomepage() {
    const result = await this.database.query<VersionRow>(
      `SELECT pv.id, pv.introduction, pv.state, pv.version_number FROM pages p JOIN page_versions pv ON pv.id = p.published_version_id WHERE p.slug = 'homepage'`,
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
      `SELECT p.id, p.slug, p.title, pv.version_number AS published_version FROM pages p LEFT JOIN page_versions pv ON pv.id = p.published_version_id WHERE p.slug = 'homepage'`,
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
  async latestDraft() {
    const result = await this.database.query<VersionRow>(
      `SELECT pv.id, pv.introduction, pv.state, pv.version_number FROM pages p JOIN page_versions pv ON pv.page_id = p.id WHERE p.slug = 'homepage' AND pv.state = 'draft' ORDER BY pv.version_number DESC LIMIT 1`,
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
    introduction: string,
    administrator: AuthenticatedAdministrator,
  ) {
    const result = await this.database.query<VersionRow>(
      `INSERT INTO page_versions (id, page_id, version_number, state, introduction, created_by) SELECT $1, p.id, COALESCE(max(pv.version_number), 0) + 1, 'draft', $2, $3 FROM pages p LEFT JOIN page_versions pv ON pv.page_id = p.id WHERE p.slug = 'homepage' GROUP BY p.id RETURNING id, introduction, state, version_number`,
      [randomUUID(), introduction, administrator.id],
    );
    if (!result.rows[0]) throw new NotFoundException();
    return this.present(result.rows[0]);
  }
  async publish(versionId: string, administrator: AuthenticatedAdministrator) {
    const result = await this.database.query<VersionRow>(
      `WITH selected AS (UPDATE page_versions pv SET state = 'published', published_at = now() FROM pages p WHERE pv.id = $1 AND pv.page_id = p.id AND p.slug = 'homepage' AND pv.state = 'draft' RETURNING pv.id, pv.page_id, pv.introduction, pv.state, pv.version_number), updated_page AS (UPDATE pages p SET published_version_id = selected.id, updated_at = now() FROM selected WHERE p.id = selected.page_id RETURNING p.id), audited AS (INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, metadata) SELECT $2, $3, 'content.homepage_published', 'page_version', selected.id, jsonb_build_object('versionNumber', selected.version_number) FROM selected, updated_page) SELECT id, introduction, state, version_number FROM selected`,
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
