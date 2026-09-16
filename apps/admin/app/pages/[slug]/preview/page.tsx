import type { PageContent } from '@pcc/contracts';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PagePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/pages/${encodeURIComponent(slug)}`,
    {
      headers: { cookie: (await cookies()).toString() },
      cache: 'no-store',
    },
  );
  if (response.status === 401) redirect('/login');

  if (!response.ok) {
    return (
      <main>
        <p className="eyebrow">Draft preview</p>
        <h1>Preview unavailable</h1>
        <p role="alert">This draft could not be loaded. Please try again.</p>
        <Link href={`/pages/${slug}`}>Return to editor</Link>
      </main>
    );
  }

  const { draft } = (await response.json()) as {
    draft: PageContent | null;
  };

  return (
    <main>
      <p className="eyebrow">Draft preview</p>
      {draft ? (
        <article className="page-preview">
          <p className="eyebrow">{draft.eyebrow}</p>
          <h1>{draft.heading}</h1>
          <p>{draft.body}</p>
          {draft.image && <img src={draft.image.url} alt={draft.image.alt} />}
          <p>Previewing draft version {draft.versionNumber}.</p>
        </article>
      ) : (
        <>
          <h1>No draft available</h1>
          <p role="status">Save a draft before opening its preview.</p>
        </>
      )}
      <p>
        <Link href={`/pages/${slug}`}>Return to editor</Link>
      </p>
    </main>
  );
}
