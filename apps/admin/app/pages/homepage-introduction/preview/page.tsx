import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function PreviewPage() {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/pages/homepage-introduction/preview`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  const { draft } = (await response.json()) as {
    draft: { introduction: string; versionNumber: number } | null;
  };
  return (
    <main>
      <p className="eyebrow">Draft preview</p>
      <h1>Pemberton Conservative Club</h1>
      {draft ? (
        <>
          <p>{draft.introduction}</p>
          <p>Previewing draft version {draft.versionNumber}.</p>
        </>
      ) : (
        <p>No draft is available.</p>
      )}
      <p>
        <Link href="/pages/homepage-introduction">Return to editor</Link>
      </p>
    </main>
  );
}
