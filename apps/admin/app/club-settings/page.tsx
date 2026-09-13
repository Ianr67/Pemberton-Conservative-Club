'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type {
  ClubSettings,
  ClubSettingsInput,
  SocialPlatform,
} from '@pcc/contracts';
import { clubDays } from '@pcc/contracts';
const empty: ClubSettingsInput = {
  clubName: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  postcode: '',
  telephone: '',
  email: '',
  openingTimes: clubDays.map((day) => ({
    day,
    isClosed: true,
    opensAt: null,
    closesAt: null,
  })),
  socialLinks: [],
};
export default function SettingsEditor() {
  const [form, setForm] = useState<ClubSettingsInput>(empty),
    [draft, setDraft] = useState<ClubSettings | null>(null),
    [published, setPublished] = useState<ClubSettings | null>(null),
    [message, setMessage] = useState('Loading…'),
    [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    void fetch('/api/club-settings').then(async (r) => {
      if (!r.ok) {
        location.href = '/login';
        return;
      }
      const b = (await r.json()) as {
        draft: ClubSettings | null;
        published: ClubSettings;
      };
      setDraft(b.draft);
      setPublished(b.published);
      setForm(b.draft ?? b.published);
      setMessage('');
    });
  }, []);
  const field = (key: keyof ClubSettingsInput, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    setErrors([]);
    const r = await fetch('/api/club-settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const b = (await r.json()) as {
      draft?: ClubSettings;
      errors?: string[];
      message?: string;
    };
    if (!r.ok) {
      setErrors(b.errors ?? [b.message ?? 'Unable to save settings.']);
      return;
    }
    setDraft(b.draft!);
    setMessage('Draft saved. Public details are unchanged.');
  }
  async function publish() {
    if (!draft) return;
    const r = await fetch('/api/club-settings/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ versionId: draft.id }),
    });
    if (!r.ok) {
      setErrors(['Unable to publish settings.']);
      return;
    }
    const b = (await r.json()) as { published: ClubSettings };
    setPublished(b.published);
    setDraft(null);
    setMessage('Published. The website and public API now show these details.');
  }
  return (
    <main>
      <p className="eyebrow">Administration editor</p>
      <h1>Club settings</h1>
      <p>Published version: {published?.versionNumber ?? '—'}</p>
      {errors.length > 0 && (
        <div role="alert">
          <p>Please correct the following:</p>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          Club name
          <input
            required
            maxLength={120}
            value={form.clubName}
            onChange={(e) => field('clubName', e.target.value)}
          />
        </label>
        <label>
          Address line 1
          <input
            required
            maxLength={120}
            value={form.addressLine1}
            onChange={(e) => field('addressLine1', e.target.value)}
          />
        </label>
        <label>
          Address line 2
          <input
            maxLength={120}
            value={form.addressLine2}
            onChange={(e) => field('addressLine2', e.target.value)}
          />
        </label>
        <label>
          Town
          <input
            required
            maxLength={80}
            value={form.town}
            onChange={(e) => field('town', e.target.value)}
          />
        </label>
        <label>
          Postcode
          <input
            required
            maxLength={12}
            value={form.postcode}
            onChange={(e) => field('postcode', e.target.value)}
          />
        </label>
        <label>
          Telephone
          <input
            required
            type="tel"
            maxLength={30}
            value={form.telephone}
            onChange={(e) => field('telephone', e.target.value)}
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => field('email', e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Opening times</legend>
          {form.openingTimes.map((h, i) => (
            <div className="hours" key={h.day}>
              <strong>{h.day}</strong>
              <label>
                <input
                  type="checkbox"
                  checked={h.isClosed}
                  onChange={(e) =>
                    field(
                      'openingTimes',
                      form.openingTimes.map((x, n) =>
                        n === i
                          ? {
                              ...x,
                              isClosed: e.target.checked,
                              opensAt: e.target.checked ? null : '12:00',
                              closesAt: e.target.checked ? null : '22:00',
                            }
                          : x,
                      ),
                    )
                  }
                />{' '}
                Closed
              </label>
              <label>
                Opens
                <input
                  aria-label={`${h.day} opens`}
                  type="time"
                  disabled={h.isClosed}
                  value={h.opensAt ?? ''}
                  onChange={(e) =>
                    field(
                      'openingTimes',
                      form.openingTimes.map((x, n) =>
                        n === i ? { ...x, opensAt: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Closes
                <input
                  aria-label={`${h.day} closes`}
                  type="time"
                  disabled={h.isClosed}
                  value={h.closesAt ?? ''}
                  onChange={(e) =>
                    field(
                      'openingTimes',
                      form.openingTimes.map((x, n) =>
                        n === i ? { ...x, closesAt: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </fieldset>
        <fieldset>
          <legend>Social links</legend>
          {(['facebook', 'instagram', 'x', 'youtube'] as SocialPlatform[]).map(
            (platform) => {
              const link = form.socialLinks.find(
                (l) => l.platform === platform,
              );
              return (
                <label key={platform}>
                  {platform}
                  <input
                    type="url"
                    placeholder="https://"
                    value={link?.url ?? ''}
                    onChange={(e) =>
                      field('socialLinks', [
                        ...form.socialLinks.filter(
                          (l) => l.platform !== platform,
                        ),
                        ...(e.target.value
                          ? [{ platform, url: e.target.value }]
                          : []),
                      ])
                    }
                  />
                </label>
              );
            },
          )}
        </fieldset>
        <div className="actions">
          <button type="submit">Save draft</button>
          <button
            type="button"
            disabled={!draft}
            onClick={() => void publish()}
          >
            Publish draft
          </button>
        </div>
      </form>
      <p role="status">{message}</p>
      <p>
        <Link href="/">Back to dashboard</Link>
      </p>
    </main>
  );
}
