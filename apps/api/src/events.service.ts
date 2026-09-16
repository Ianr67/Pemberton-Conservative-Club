import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { EventInput, EventRecord } from '@pcc/contracts';
import type { AuthenticatedAdministrator } from './auth.service.js';
import { DatabaseService } from './database.service.js';

interface EventRow {
  id: string;
  venue_id: string;
  venue_name: string;
  slug: string;
  title: string;
  description: string;
  doors_at: Date | string;
  starts_at: Date | string;
  ends_at: Date | string;
  status: 'draft' | 'published';
  visibility: 'public' | 'unlisted';
  capacity: number;
  artwork_url: string | null;
  artwork_alt: string | null;
  artwork_width: number | null;
  artwork_height: number | null;
  published_at: Date | string | null;
  updated_at: Date | string;
}
const select = `SELECT e.id,e.venue_id,v.name venue_name,e.slug,e.title,e.description,e.doors_at,e.starts_at,e.ends_at,e.status,e.visibility,e.capacity,e.artwork_url,e.artwork_alt,e.artwork_width,e.artwork_height,e.published_at,e.updated_at FROM events e JOIN venues v ON v.id=e.venue_id`;
function iso(value: Date | string) {
  return new Date(value).toISOString();
}
function map(row: EventRow): EventRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    venue: { id: row.venue_id, name: row.venue_name },
    slug: row.slug,
    title: row.title,
    description: row.description,
    doorsAt: iso(row.doors_at),
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    status: row.status,
    visibility: row.visibility,
    capacity: row.capacity,
    artwork: row.artwork_url
      ? {
          url: row.artwork_url,
          alt: row.artwork_alt!,
          width: row.artwork_width,
          height: row.artwork_height,
        }
      : null,
    publishedAt: row.published_at ? iso(row.published_at) : null,
    updatedAt: iso(row.updated_at),
  };
}

@Injectable()
export class EventsService {
  constructor(private readonly database: DatabaseService) {}
  async venues() {
    return (
      await this.database.query<{ id: string; name: string }>(
        'SELECT id,name FROM venues ORDER BY name',
      )
    ).rows;
  }
  async adminList() {
    return (
      await this.database.query<EventRow>(`${select} ORDER BY e.starts_at,e.id`)
    ).rows.map(map);
  }
  async adminDetail(id: string) {
    const row = (
      await this.database.query<EventRow>(`${select} WHERE e.id=$1`, [id])
    ).rows[0];
    if (!row) this.notFound();
    return map(row!);
  }
  async publicList() {
    return (
      await this.database.query<EventRow>(
        `${select} WHERE e.status='published' AND e.visibility='public' ORDER BY e.starts_at,e.id`,
      )
    ).rows.map(map);
  }
  async publicDetail(slug: string) {
    const row = (
      await this.database.query<EventRow>(
        `${select} WHERE e.slug=$1 AND e.status='published'`,
        [slug],
      )
    ).rows[0];
    if (!row) this.notFound();
    return map(row!);
  }
  async create(input: EventInput, actor: AuthenticatedAdministrator) {
    return this.write('create', randomUUID(), input, actor);
  }
  async update(
    id: string,
    input: EventInput,
    actor: AuthenticatedAdministrator,
  ) {
    return this.write('update', id, input, actor);
  }
  private async write(
    mode: 'create' | 'update',
    id: string,
    input: EventInput,
    actor: AuthenticatedAdministrator,
  ) {
    const a = input.artwork;
    const params = [
      id,
      input.venueId,
      input.slug,
      input.title.trim(),
      input.description.trim(),
      input.doorsAt,
      input.startsAt,
      input.endsAt,
      input.visibility,
      input.capacity,
      a?.url ?? null,
      a?.alt.trim() ?? null,
      a?.width ?? null,
      a?.height ?? null,
      actor.id,
      randomUUID(),
    ];
    const mutation =
      mode === 'create'
        ? `INSERT INTO events(id,venue_id,slug,title,description,doors_at,starts_at,ends_at,visibility,capacity,artwork_url,artwork_alt,artwork_width,artwork_height,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING id`
        : `UPDATE events SET venue_id=$2,slug=$3,title=$4,description=$5,doors_at=$6,starts_at=$7,ends_at=$8,visibility=$9,capacity=$10,artwork_url=$11,artwork_alt=$12,artwork_width=$13,artwork_height=$14,updated_by=$15,updated_at=now() WHERE id=$1 RETURNING id`;
    const result = await this.database.query<{ id: string }>(
      `WITH changed AS (${mutation}), audited AS (INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $16,$15,'event.${mode === 'create' ? 'created' : 'updated'}','event',id,'{}'::jsonb FROM changed) SELECT id FROM changed`,
      params,
    );
    if (!result.rows[0]) this.notFound();
    return this.adminDetail(id);
  }
  async setPublished(
    id: string,
    published: boolean,
    actor: AuthenticatedAdministrator,
  ) {
    const action = published ? 'published' : 'unpublished';
    const result = await this.database.query<{ id: string }>(
      `WITH changed AS (UPDATE events SET status=$2,published_at=${published ? 'COALESCE(published_at,now())' : 'NULL'},updated_by=$3,updated_at=now() WHERE id=$1 AND status<>$2 RETURNING id), audited AS (INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $4,$3,'event.${action}','event',id,'{}'::jsonb FROM changed) SELECT id FROM changed`,
      [id, published ? 'published' : 'draft', actor.id, randomUUID()],
    );
    if (!result.rows[0]) this.notFound();
    return this.adminDetail(id);
  }
  async delete(id: string, actor: AuthenticatedAdministrator) {
    const result = await this.database.query<{ id: string }>(
      `WITH removed AS (DELETE FROM events WHERE id=$1 RETURNING id,slug,title), audited AS (INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,metadata) SELECT $2,$3,'event.deleted','event',id,jsonb_build_object('slug',slug,'title',title) FROM removed) SELECT id FROM removed`,
      [id, randomUUID(), actor.id],
    );
    if (!result.rows[0]) this.notFound();
    return { deleted: true, id };
  }
  private notFound(): never {
    throw new NotFoundException({
      code: 'event_not_found',
      message: 'Event was not found.',
    });
  }
}
