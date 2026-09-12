import type { PoolClient } from 'pg';

import { hashPassword } from './index.js';

const ids = {
  adminPermission: '30000000-0000-4000-8000-000000000001',
  auditPermission: '30000000-0000-4000-8000-000000000002',
  contentPermission: '30000000-0000-4000-8000-000000000003',
  administratorRole: '20000000-0000-4000-8000-000000000001',
  editorRole: '20000000-0000-4000-8000-000000000002',
  administratorUser: '10000000-0000-4000-8000-000000000001',
  editorUser: '10000000-0000-4000-8000-000000000002',
  auditEvent: '40000000-0000-4000-8000-000000000001',
  homepage: '50000000-0000-4000-8000-000000000001',
  homepagePublishedVersion: '60000000-0000-4000-8000-000000000001',
} as const;

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
         ($3, 'content.manage', 'Manage website content')
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         description = EXCLUDED.description`,
      [ids.adminPermission, ids.auditPermission, ids.contentPermission],
    );
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $3), ($1, $4), ($1, $5), ($2, $3), ($2, $5)
       ON CONFLICT DO NOTHING`,
      [
        ids.administratorRole,
        ids.editorRole,
        ids.adminPermission,
        ids.auditPermission,
        ids.contentPermission,
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
      `INSERT INTO page_versions (id, page_id, version_number, state, introduction, created_by, published_at)
       VALUES ($1, $2, 1, 'published', $3, $4, now()) ON CONFLICT (id) DO NOTHING`,
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
