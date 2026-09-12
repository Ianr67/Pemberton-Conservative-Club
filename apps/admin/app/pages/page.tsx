import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function PageList() {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/pages`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (!response.ok) redirect('/login');
  const { pages } = (await response.json()) as {
    pages: { slug: string; title: string; publishedVersion: number | null }[];
  };
  return (
    <main>
      <p className="eyebrow">Content</p>
      <h1>Pages</h1>
      <ul>
        {pages.map((page) => (
          <li key={page.slug}>
            <Link href="/pages/homepage-introduction">{page.title}</Link> —
            published version {page.publishedVersion ?? 'none'}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/">Back to dashboard</Link>
      </p>
    </main>
  );
}
