'use client';

import type { HomepageContent, PageImage } from '@pcc/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ImageUpload } from '../../image-upload';

export default function IntroductionEditor() {
  const [introduction, setIntroduction] = useState('');
  const [image, setImage] = useState<PageImage | null>(null);
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [published, setPublished] = useState<HomepageContent | null>(null);
  const [message, setMessage] = useState('Loading…');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/pages/homepage-introduction');
      if (response.status === 401) {
        location.href = '/login';
        return;
      }
      if (!response.ok) {
        setMessage('The homepage content could not be loaded.');
        return;
      }
      const body = (await response.json()) as {
        draft: HomepageContent | null;
        published: HomepageContent;
      };
      const current = body.draft ?? body.published;
      setDraft(body.draft);
      setPublished(body.published);
      setIntroduction(current.introduction);
      setImage(current.image ?? null);
      setMessage('');
    })();
  }, []);

  async function save() {
    setPending(true);
    setMessage('Saving draft…');
    const response = await fetch('/api/pages/homepage-introduction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ introduction, image }),
    });
    const body = (await response.json()) as {
      draft?: HomepageContent;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !body.draft) {
      setMessage(body.message ?? 'The draft could not be saved.');
      return;
    }
    setDraft(body.draft);
    setMessage('Draft saved. The public website is unchanged.');
  }

  async function publish() {
    if (!draft) return;
    setPending(true);
    setMessage('Publishing…');
    const response = await fetch('/api/pages/homepage-introduction/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ versionId: draft.id }),
    });
    const body = (await response.json()) as {
      published?: HomepageContent;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !body.published) {
      setMessage(body.message ?? 'The draft could not be published.');
      return;
    }
    setPublished(body.published);
    setDraft(null);
    setMessage('Published. The public website now uses this introduction.');
  }

  return (
    <main>
      <p className="eyebrow">Content editor</p>
      <h1>Homepage introduction</h1>
      <p>Published version: {published?.versionNumber ?? '—'}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor="introduction">Introduction</label>
        <textarea
          id="introduction"
          value={introduction}
          maxLength={1000}
          rows={7}
          required
          onChange={(event) => setIntroduction(event.target.value)}
        />
        <ImageUpload
          label="Homepage image (optional)"
          image={image}
          onChange={setImage}
        />
        <div className="actions">
          <button disabled={pending} type="submit">
            Save draft
          </button>
          {draft && (
            <Link
              className="button-link"
              href="/pages/homepage-introduction/preview"
            >
              Preview draft
            </Link>
          )}
          <button
            type="button"
            disabled={pending || !draft}
            onClick={() => void publish()}
          >
            Publish
          </button>
        </div>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <p>
        <Link href="/pages">Back to pages</Link>
      </p>
    </main>
  );
}
