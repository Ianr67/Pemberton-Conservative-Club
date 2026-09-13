import type { PoolClient } from 'pg';

import { hashPassword } from './index.js';

const ids = {
  adminPermission: '30000000-0000-4000-8000-000000000001',
  auditPermission: '30000000-0000-4000-8000-000000000002',
  contentPermission: '30000000-0000-4000-8000-000000000003',
  eventsPermission: '30000000-0000-4000-8000-000000000004',
  administratorRole: '20000000-0000-4000-8000-000000000001',
  editorRole: '20000000-0000-4000-8000-000000000002',
  administratorUser: '10000000-0000-4000-8000-000000000001',
  editorUser: '10000000-0000-4000-8000-000000000002',
  auditEvent: '40000000-0000-4000-8000-000000000001',
  homepage: '50000000-0000-4000-8000-000000000001',
  homepagePublishedVersion: '60000000-0000-4000-8000-000000000001',
  clubSettings: '70000000-0000-4000-8000-000000000001',
  clubSettingsPublishedVersion: '71000000-0000-4000-8000-000000000001',
  venue: '80000000-0000-4000-8000-000000000001',
} as const;

const editablePages = [
  {
    id: '50000000-0000-4000-8000-000000000002',
    versionId: '60000000-0000-4000-8000-000000000002',
    slug: 'about',
    title: 'About the club',
    eyebrow: 'At the heart of Pemberton',
    heading: 'About the club',
    body: 'A familiar local meeting place with a proud past and a warm, forward-looking welcome. Learn about our place in the community and the people who make the club special.',
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    versionId: '60000000-0000-4000-8000-000000000003',
    slug: 'membership',
    title: 'Membership information',
    eyebrow: 'Belong locally',
    heading: 'Membership information',
    body: 'Membership is about good company, a friendly welcome and supporting a long-standing part of the Pemberton community.',
  },
  {
    id: '50000000-0000-4000-8000-000000000004',
    versionId: '60000000-0000-4000-8000-000000000004',
    slug: 'quiz-nights',
    title: 'Quiz nights',
    eyebrow: 'Questions, teams, good company',
    heading: 'Quiz nights',
    body: 'Settle in for a friendly evening of general knowledge, conversation and a little healthy competition.',
  },
  {
    id: '50000000-0000-4000-8000-000000000005',
    versionId: '60000000-0000-4000-8000-000000000005',
    slug: 'function-room',
    title: 'Function room',
    eyebrow: 'Celebrate together',
    heading: 'A room for your occasion',
    body: 'Our function room is a welcoming setting for family celebrations, community gatherings and special occasions.',
  },
  {
    id: '50000000-0000-4000-8000-000000000006',
    versionId: '60000000-0000-4000-8000-000000000006',
    slug: 'sports-and-activities',
    title: 'Sports and activities',
    eyebrow: 'Something for everyone',
    heading: 'Sports and activities',
    body: 'The club brings people together through regular activities, social groups and live sport in comfortable surroundings.',
  },
] as const;

export async function seedDevelopmentData(
  client: PoolClient,
  nodeEnvironment: string | undefined,
): Promise<void> {
  if (nodeEnvironment !== 'development') {
    throw new Error('Development fixtures require NODE_ENV=development');
  }

  await client.query('BEGIN');
  try {
    const administratorPasswordHash = await hashPassword(
      'PembertonDemo!2026',
      Buffer.from('pcc-admin-demo-salt'),
    );
    const editorPasswordHash = await hashPassword(
      'NotForLoginDemo!2026',
      Buffer.from('pcc-editor-demo-salt'),
    );
    await client.query(
      `INSERT INTO users (id, email, display_name, password_hash)
       VALUES
         ($1, 'admin@pemberton-club.example.test', 'Alex Demo', $3),
         ($2, 'editor@pemberton-club.example.test', 'Morgan Demo', $4)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         password_hash = EXCLUDED.password_hash`,
      [
        ids.administratorUser,
        ids.editorUser,
        administratorPasswordHash,
        editorPasswordHash,
      ],
    );
    await client.query(
      `INSERT INTO roles (id, code, name)
       VALUES ($1, 'administrator', 'Administrator'), ($2, 'content_editor', 'Content editor')
       ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name`,
      [ids.administratorRole, ids.editorRole],
    );
    await client.query(
      `INSERT INTO permissions (id, code, description)
       VALUES
         ($1, 'administration.access', 'Access the administration portal'),
         ($2, 'audit.read', 'Read audit activity'),
         ($3, 'content.manage', 'Manage website content'),
         ($4, 'events.manage', 'Create, edit and publish events')
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         description = EXCLUDED.description`,
      [
        ids.adminPermission,
        ids.auditPermission,
        ids.contentPermission,
        ids.eventsPermission,
      ],
    );
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $3), ($1, $4), ($1, $5), ($1, $6), ($2, $3), ($2, $5)
       ON CONFLICT DO NOTHING`,
      [
        ids.administratorRole,
        ids.editorRole,
        ids.adminPermission,
        ids.auditPermission,
        ids.contentPermission,
        ids.eventsPermission,
      ],
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $3), ($2, $4)
       ON CONFLICT DO NOTHING`,
      [
        ids.administratorUser,
        ids.editorUser,
        ids.administratorRole,
        ids.editorRole,
      ],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'demo.seeded', 'database', NULL, '{"source":"development-seed"}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [ids.auditEvent, ids.administratorUser],
    );
    await client.query(
      `INSERT INTO pages (id, slug, title) VALUES ($1, 'homepage', 'Homepage introduction')
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [ids.homepage],
    );
    await client.query(
      `INSERT INTO page_versions (id, page_id, version_number, state, introduction, eyebrow, heading, body, created_by, published_at)
       VALUES ($1, $2, 1, 'published', $3, 'Welcome to Pemberton', 'Homepage introduction', $3, $4, now()) ON CONFLICT (id) DO NOTHING`,
      [
        ids.homepagePublishedVersion,
        ids.homepage,
        'A welcoming local club at the heart of Pemberton, bringing people together for good company, activities and community events.',
        ids.administratorUser,
      ],
    );
    await client.query(
      `UPDATE pages SET published_version_id = $1, updated_at = now() WHERE id = $2`,
      [ids.homepagePublishedVersion, ids.homepage],
    );
    for (const page of editablePages) {
      await client.query(
        `INSERT INTO pages (id, slug, title) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title`,
        [page.id, page.slug, page.title],
      );
      await client.query(
        `INSERT INTO page_versions (id, page_id, version_number, state, introduction, eyebrow, heading, body, created_by, published_at)
         VALUES ($1, $2, 1, 'published', $5, $3, $4, $5, $6, now()) ON CONFLICT (id) DO NOTHING`,
        [
          page.versionId,
          page.id,
          page.eyebrow,
          page.heading,
          page.body,
          ids.administratorUser,
        ],
      );
      await client.query(
        `UPDATE pages SET published_version_id = $1, updated_at = now() WHERE id = $2`,
        [page.versionId, page.id],
      );
    }
    await client.query(
      `INSERT INTO club_settings (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [ids.clubSettings],
    );
    await client.query(
      `INSERT INTO club_setting_versions (id,club_settings_id,version_number,state,club_name,address_line_1,address_line_2,town,postcode,telephone,email,created_by,published_at) VALUES ($1,$2,1,'published','Pemberton Conservative Club','Fictional 12 Club Lane',NULL,'Pemberton','WN5 0AA','01942 000 123','hello@pemberton-club.example.test',$3,now()) ON CONFLICT (id) DO NOTHING`,
      [
        ids.clubSettingsPublishedVersion,
        ids.clubSettings,
        ids.administratorUser,
      ],
    );
    await client.query(
      `INSERT INTO club_opening_times (version_id,day_of_week,is_closed,opens_at,closes_at) VALUES ($1,1,true,NULL,NULL),($1,2,false,'18:00','23:00'),($1,3,false,'18:00','23:00'),($1,4,false,'18:00','23:00'),($1,5,false,'16:00','23:30'),($1,6,false,'12:00','23:30'),($1,7,false,'12:00','22:30') ON CONFLICT DO NOTHING`,
      [ids.clubSettingsPublishedVersion],
    );
    await client.query(
      `INSERT INTO club_social_links (version_id,platform,url) VALUES ($1,'facebook','https://www.facebook.com/pembertonclubdemo'),($1,'instagram','https://www.instagram.com/pembertonclubdemo') ON CONFLICT DO NOTHING`,
      [ids.clubSettingsPublishedVersion],
    );
    await client.query(
      `UPDATE club_settings SET published_version_id=$1,updated_at=now() WHERE id=$2`,
      [ids.clubSettingsPublishedVersion, ids.clubSettings],
    );
    await client.query(
      `INSERT INTO venues(id,name,address_line_1,town,postcode) VALUES($1,'Pemberton Conservative Club','Fictional 12 Club Lane','Pemberton','WN5 0AA') ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,
      [ids.venue],
    );
    const events = [
      [
        '81000000-0000-4000-8000-000000000001',
        'pemberton-autumn-social',
        'Pemberton Autumn Social',
        'An easy-going evening of live local entertainment and good company.',
        14,
        18,
        19,
        22,
        'published',
        'public',
        180,
      ],
      [
        '81000000-0000-4000-8000-000000000002',
        'friday-quiz-night',
        'Friday Quiz Night',
        'A friendly team quiz with questions for every generation.',
        21,
        19,
        19.5,
        22,
        'published',
        'public',
        96,
      ],
      [
        '81000000-0000-4000-8000-000000000003',
        'festive-quiz-night',
        'Festive Quiz Night',
        'Seasonal questions, table challenges and a cheerful club atmosphere.',
        35,
        19,
        19.5,
        22,
        'published',
        'public',
        96,
      ],
      [
        '81000000-0000-4000-8000-000000000004',
        'northern-soul-evening',
        'Northern Soul Evening',
        'Classic floor-fillers and a welcoming dance floor.',
        49,
        18.5,
        19.5,
        23,
        'published',
        'public',
        220,
      ],
      [
        '81000000-0000-4000-8000-000000000005',
        'community-comedy-night',
        'Community Comedy Night',
        'A fictional line-up of rising North West comedy performers.',
        63,
        19,
        20,
        22.5,
        'published',
        'public',
        150,
      ],
      [
        '81000000-0000-4000-8000-000000000006',
        'winter-brass-concert',
        'Winter Brass Concert',
        'An afternoon concert from the fictional Pemberton Borough Brass Band.',
        77,
        13.5,
        14,
        16.5,
        'published',
        'public',
        180,
      ],
      [
        '81000000-0000-4000-8000-000000000007',
        'spring-programme-preview',
        'Spring Programme Preview',
        'Draft programme announcement for administrator preview.',
        91,
        18,
        19,
        21,
        'draft',
        'public',
        120,
      ],
    ] as const;
    for (const [
      id,
      slug,
      title,
      description,
      days,
      doors,
      start,
      end,
      status,
      visibility,
      capacity,
    ] of events) {
      await client.query(
        `INSERT INTO events(id,venue_id,slug,title,description,doors_at,starts_at,ends_at,status,visibility,capacity,artwork_url,artwork_alt,artwork_width,artwork_height,created_by,updated_by,published_at)
         VALUES($1,$2,$3,$4,$5,date_trunc('day',now())+($6||' days')::interval+($7||' hours')::interval,date_trunc('day',now())+($6||' days')::interval+($8||' hours')::interval,date_trunc('day',now())+($6||' days')::interval+($9||' hours')::interval,$10,$11,$12,$13,$14,1600,900,$15,$15,CASE WHEN $10='published' THEN now() ELSE NULL END)
         ON CONFLICT(id) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,description=EXCLUDED.description,doors_at=EXCLUDED.doors_at,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,visibility=EXCLUDED.visibility,capacity=EXCLUDED.capacity,published_at=EXCLUDED.published_at`,
        [
          id,
          ids.venue,
          slug,
          title,
          description,
          days,
          doors,
          start,
          end,
          status,
          visibility,
          capacity,
          `https://images.pemberton-club.example.test/events/${slug}.jpg`,
          `${title} demonstration artwork`,
          ids.administratorUser,
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function resetDevelopmentData(
  client: PoolClient,
  nodeEnvironment: string | undefined,
): Promise<void> {
  if (nodeEnvironment !== 'development') {
    throw new Error(
      'Database reset is permitted only when NODE_ENV=development',
    );
  }

  await client.query('BEGIN');
  try {
    await client.query(
      `TRUNCATE TABLE
         events,
         venues,
         club_social_links,
         club_opening_times,
         club_setting_versions,
         club_settings,
         page_versions,
         pages,
         audit_events,
         sessions,
         user_roles,
         role_permissions,
         permissions,
         roles,
         users`,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  await seedDevelopmentData(client, nodeEnvironment);
}
