import type { HomepageContent } from '@pcc/contracts';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/pages/homepage-introduction/preview`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  if (!response.ok) {
    return (
      <main>
        <p className="eyebrow">Draft preview</p>
        <h1>Preview unavailable</h1>
        <p role="alert">This draft could not be loaded. Please try again.</p>
        <Link href="/pages/homepage-introduction">Return to editor</Link>
      </main>
    );
  }
  const { draft } = (await response.json()) as {
    draft: HomepageContent | null;
  };
  return (
    <main>
      <p className="eyebrow">Draft preview</p>
      <h1>Pemberton Conservative Club</h1>
      {draft ? (
        <article className="page-preview">
          <p>{draft.introduction}</p>
          {draft.image && <img src={draft.image.url} alt={draft.image.alt} />}
          <p>Previewing draft version {draft.versionNumber}.</p>
        </article>
      ) : (
        <p role="status">No draft is available. Save a draft first.</p>
      )}
      <p>
        <Link href="/pages/homepage-introduction">Return to editor</Link>
      </p>
    </main>
  );
}
