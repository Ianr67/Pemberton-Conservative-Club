'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Version {
  id: string;
  introduction: string;
  state: string;
  versionNumber: number;
}
export default function IntroductionEditor() {
  const [introduction, setIntroduction] = useState('');
  const [draft, setDraft] = useState<Version | null>(null);
  const [published, setPublished] = useState<Version | null>(null);
  const [message, setMessage] = useState('Loading…');
  async function load() {
    const response = await fetch('/api/pages/homepage-introduction');
    if (!response.ok) {
      location.href = '/login';
      return;
    }
    const body = (await response.json()) as {
      draft: Version | null;
      published: Version;
    };
    setDraft(body.draft);
    setPublished(body.published);
    setIntroduction(body.draft?.introduction ?? body.published.introduction);
    setMessage('');
  }
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    const response = await fetch('/api/pages/homepage-introduction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ introduction }),
    });
    const body = (await response.json()) as { draft: Version };
    setDraft(body.draft);
    setMessage('Draft saved. The public website is unchanged.');
  }
  async function publish() {
    if (!draft) return;
    const response = await fetch('/api/pages/homepage-introduction/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ versionId: draft.id }),
    });
    const body = (await response.json()) as { published: Version };
    setPublished(body.published);
    setDraft(null);
    setMessage('Published. The public website now uses this introduction.');
  }
  return (
    <main>
      <p className="eyebrow">Content editor</p>
      <h1>Homepage introduction</h1>
      <p>Published version: {published?.versionNumber ?? '—'}</p>
      <label htmlFor="introduction">Introduction</label>
      <textarea
        id="introduction"
        value={introduction}
        maxLength={1000}
        rows={7}
        onChange={(event) => setIntroduction(event.target.value)}
      />
      <div className="actions">
        <button type="button" onClick={save}>
          Save draft
        </button>
        <Link
          className="button-link"
          href="/pages/homepage-introduction/preview"
        >
          Preview draft
        </Link>
        <button type="button" disabled={!draft} onClick={publish}>
          Publish
        </button>
      </div>
      <p role="status">{message}</p>
      <p>
        <Link href="/pages">Back to pages</Link>
      </p>
    </main>
  );
}
