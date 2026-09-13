import { cookies } from 'next/headers';
import Link from 'next/link';
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
      <h1>Website pages</h1>
      <p>
        Edit a draft safely, then publish it to the shared API and public
        website.
      </p>
      <ul className="event-list">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={
                page.slug === 'homepage'
                  ? '/pages/homepage-introduction'
                  : `/pages/${page.slug}`
              }
            >
              {page.title}
            </Link>
            {' — '}
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
