import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ClubSettings,
  ClubSettingsInput,
  OpeningTime,
  SocialLink,
} from '@pcc/contracts';
import { clubDays } from '@pcc/contracts';
import type { AuthenticatedAdministrator } from './auth.service.js';
import { DatabaseService } from './database.service.js';

interface SettingsRow {
  id: string;
  club_name: string;
  address_line_1: string;
  address_line_2: string | null;
  town: string;
  postcode: string;
  telephone: string;
  email: string;
  state: 'draft' | 'published';
  version_number: number;
}
@Injectable()
export class ClubSettingsService {
  constructor(private readonly database: DatabaseService) {}
  private async hydrate(row: SettingsRow): Promise<ClubSettings> {
    const hours = await this.database.query<{
      day_of_week: number;
      is_closed: boolean;
      opens_at: string | null;
      closes_at: string | null;
    }>(
      'SELECT day_of_week, is_closed, opens_at::text, closes_at::text FROM club_opening_times WHERE version_id = $1 ORDER BY day_of_week',
      [row.id],
    );
    const links = await this.database.query<{
      platform: SocialLink['platform'];
      url: string;
    }>(
      'SELECT platform, url FROM club_social_links WHERE version_id = $1 ORDER BY platform',
      [row.id],
    );
    return {
      id: row.id,
      clubName: row.club_name,
      addressLine1: row.address_line_1,
      addressLine2: row.address_line_2 ?? '',
      town: row.town,
      postcode: row.postcode,
      telephone: row.telephone,
      email: row.email,
      state: row.state,
      versionNumber: row.version_number,
      openingTimes: hours.rows.map((h) => ({
        day: clubDays[h.day_of_week - 1]!,
        isClosed: h.is_closed,
        opensAt: h.opens_at?.slice(0, 5) ?? null,
        closesAt: h.closes_at?.slice(0, 5) ?? null,
      })),
      socialLinks: links.rows,
    };
  }
  private async version(where: string, values: unknown[]) {
    const result = await this.database.query<SettingsRow>(
      `SELECT v.id, v.club_name, v.address_line_1, v.address_line_2, v.town, v.postcode, v.telephone, v.email, v.state, v.version_number FROM club_settings s JOIN club_setting_versions v ON ${where}`,
      values,
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'club_settings_not_found',
        message: 'Club settings are unavailable.',
      });
    return this.hydrate(result.rows[0]);
  }
  published() {
    return this.version('v.id = s.published_version_id', []);
  }
  async editorState() {
    const published = await this.published();
    const draftResult = await this.database.query<SettingsRow>(
      `SELECT v.id, v.club_name, v.address_line_1, v.address_line_2, v.town, v.postcode, v.telephone, v.email, v.state, v.version_number FROM club_setting_versions v JOIN club_settings s ON s.id=v.club_settings_id WHERE v.state='draft' ORDER BY v.version_number DESC LIMIT 1`,
    );
    return {
      published,
      draft: draftResult.rows[0]
        ? await this.hydrate(draftResult.rows[0])
        : null,
    };
  }
  async saveDraft(input: ClubSettingsInput, actor: AuthenticatedAdministrator) {
    const id = randomUUID();
    const hours = input.openingTimes.map((h: OpeningTime) => ({
      day_of_week: clubDays.indexOf(h.day) + 1,
      is_closed: h.isClosed,
      opens_at: h.opensAt,
      closes_at: h.closesAt,
    }));
    const values = [
      id,
      input.clubName.trim(),
      input.addressLine1.trim(),
      input.addressLine2.trim() || null,
      input.town.trim(),
      input.postcode.trim(),
      input.telephone.trim(),
      input.email.trim().toLowerCase(),
      actor.id,
      JSON.stringify(hours),
      JSON.stringify(input.socialLinks),
      randomUUID(),
    ];
    const result = await this.database.query<SettingsRow>(
      `WITH inserted AS (INSERT INTO club_setting_versions (id,club_settings_id,version_number,state,club_name,address_line_1,address_line_2,town,postcode,telephone,email,created_by) SELECT $1,s.id,COALESCE(max(v.version_number),0)+1,'draft',$2,$3,$4,$5,$6,$7,$8,$9 FROM club_settings s LEFT JOIN club_setting_versions v ON v.club_settings_id=s.id GROUP BY s.id RETURNING *), inserted_hours AS (INSERT INTO club_opening_times (version_id,day_of_week,is_closed,opens_at,closes_at) SELECT inserted.id,h.day_of_week,h.is_closed,h.opens_at::time,h.closes_at::time FROM inserted,jsonb_to_recordset($10::jsonb) AS h(day_of_week smallint,is_closed boolean,opens_at text,closes_at text)), inserted_links AS (INSERT INTO club_social_links (version_id,platform,url) SELECT inserted.id,l.platform,l.url FROM inserted,jsonb_to_recordset($11::jsonb) AS l(platform text,url text)), audited AS (INSERT INTO audit_events (id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $12,$9,'club_settings.draft_saved','club_setting_version',inserted.id,'{}' FROM inserted) SELECT id,club_name,address_line_1,address_line_2,town,postcode,telephone,email,state,version_number FROM inserted`,
      values,
    );
    if (!result.rows[0]) throw new NotFoundException();
    return this.hydrate(result.rows[0]);
  }
  async publish(id: string, actor: AuthenticatedAdministrator) {
    const result = await this.database.query<SettingsRow>(
      `WITH selected AS (UPDATE club_setting_versions SET state='published',published_at=now() WHERE id=$1 AND state='draft' RETURNING *), updated AS (UPDATE club_settings s SET published_version_id=selected.id,updated_at=now() FROM selected WHERE s.id=selected.club_settings_id RETURNING s.id), audited AS (INSERT INTO audit_events (id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $2,$3,'club_settings.published','club_setting_version',selected.id,jsonb_build_object('versionNumber',selected.version_number) FROM selected,updated) SELECT id,club_name,address_line_1,address_line_2,town,postcode,telephone,email,state,version_number FROM selected`,
      [id, randomUUID(), actor.id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'draft_not_found',
        message: 'Draft settings could not be published.',
      });
    return this.hydrate(result.rows[0]);
  }
}
