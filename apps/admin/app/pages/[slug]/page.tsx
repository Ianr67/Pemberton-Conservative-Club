'use client';

import type { PageContent } from '@pcc/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PageImage } from '@pcc/contracts';
import { ImageUpload } from '../../image-upload';

export default function PageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const [published, setPublished] = useState<PageContent | null>(null);
  const [draft, setDraft] = useState<PageContent | null>(null);
  const [eyebrow, setEyebrow] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<PageImage | null>(null);
  const [message, setMessage] = useState('Loading…');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
      if (response.status === 401) {
        location.href = '/login';
        return;
      }
      if (!response.ok) {
        setMessage('This page could not be loaded.');
        return;
      }
      const result = (await response.json()) as {
        published: PageContent;
        draft: PageContent | null;
      };
      const current = result.draft ?? result.published;
      setPublished(result.published);
      setDraft(result.draft);
      setEyebrow(current.eyebrow);
      setHeading(current.heading);
      setBody(current.body);
      setImage(current.image);
      setMessage('');
    })();
  }, [slug]);

  async function save() {
    setPending(true);
    setMessage('Saving draft…');
    const response = await fetch(`/api/pages/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eyebrow, heading, body, image }),
    });
    const result = (await response.json()) as {
      draft?: PageContent;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !result.draft) {
      setMessage(result.message ?? 'The draft could not be saved.');
      return;
    }
    setDraft(result.draft);
    setMessage('Draft saved. The public website is unchanged.');
  }

  async function publish() {
    if (!draft) return;
    setPending(true);
    setMessage('Publishing…');
    const response = await fetch(
      `/api/pages/${encodeURIComponent(slug)}/publish`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versionId: draft.id }),
      },
    );
    const result = (await response.json()) as {
      published?: PageContent;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !result.published) {
      setMessage(result.message ?? 'The draft could not be published.');
      return;
    }
    setPublished(result.published);
    setDraft(null);
    setMessage('Published. The public website now displays this version.');
  }

  return (
    <main>
      <p className="eyebrow">Content editor</p>
      <h1>{published?.title ?? 'Website page'}</h1>
      <p>
        Published version: {published?.versionNumber ?? '—'}{' '}
        {draft ? `· Draft version ${draft.versionNumber}` : ''}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor="eyebrow">
          Eyebrow
          <input
            id="eyebrow"
            value={eyebrow}
            maxLength={120}
            required
            onChange={(event) => setEyebrow(event.target.value)}
          />
        </label>
        <label htmlFor="heading">
          Page heading
          <input
            id="heading"
            value={heading}
            maxLength={180}
            required
            onChange={(event) => setHeading(event.target.value)}
          />
        </label>
        <label htmlFor="body">
          Introduction
          <textarea
            id="body"
            value={body}
            maxLength={5000}
            rows={10}
            required
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <ImageUpload
          label="Page image (optional)"
          image={image}
          onChange={setImage}
        />
        <div className="actions">
          <button disabled={pending} type="submit">
            Save draft
          </button>
          <button
            disabled={pending || !draft}
            type="button"
            onClick={() => void publish()}
          >
            Publish draft
          </button>
          {draft && (
            <Link className="button-link" href={`/pages/${slug}/preview`}>
              Preview draft
            </Link>
          )}
          <a className="button-link" href={`http://localhost:3000/${slug}`}>
            View published page
          </a>
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
