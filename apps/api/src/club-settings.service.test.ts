import { describe, expect, it, vi } from 'vitest';
import { ClubSettingsService } from './club-settings.service.js';
const row = {
  id: 'version-id',
  club_name: 'Demo Club',
  address_line_1: '1 Road',
  address_line_2: null,
  town: 'Pemberton',
  postcode: 'WN5',
  telephone: '01942 000000',
  email: 'hello@example.test',
  state: 'published' as const,
  version_number: 1,
};
describe('club settings publication', () => {
  it('saves structured edits and their audit event in one statement', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ ...row, state: 'draft' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await new ClubSettingsService({ query } as never).saveDraft(
      {
        clubName: 'Demo Club',
        addressLine1: '1 Road',
        addressLine2: '',
        town: 'Pemberton',
        postcode: 'WN5',
        telephone: '01942 000000',
        email: 'hello@example.test',
        openingTimes: [
          { day: 'Monday', isClosed: true, opensAt: null, closesAt: null },
        ],
        socialLinks: [],
      },
      { id: 'admin', displayName: 'Admin', email: 'admin@example.test' },
    );
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('jsonb_to_recordset');
    expect(sql).toContain('club_settings.draft_saved');
  });
  it('reads only the selected public version and structured children', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({
        rows: [
          { day_of_week: 1, is_closed: true, opens_at: null, closes_at: null },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const result = await new ClubSettingsService({
      query,
    } as never).published();
    expect(result.clubName).toBe('Demo Club');
    expect(result.openingTimes[0]).toMatchObject({
      day: 'Monday',
      isClosed: true,
    });
    expect(String(query.mock.calls[0]?.[0])).toContain('published_version_id');
  });
  it('publishes and audits in one statement', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await new ClubSettingsService({ query } as never).publish('version-id', {
      id: 'admin',
      displayName: 'Admin',
      email: 'admin@example.test',
    });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("state='published'");
    expect(sql).toContain('club_settings.published');
    expect(sql).toContain('published_version_id');
  });
});
