export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/content/homepage-introduction`,
    { cache: 'no-store' },
  );
  const content = response.ok
    ? ((await response.json()) as { introduction: string })
    : null;
  return (
    <main>
      <p className="eyebrow">Demonstration environment</p>
      <h1>Pemberton Conservative Club</h1>
      <p>
        {content?.introduction ??
          'Our homepage introduction is temporarily unavailable.'}
      </p>
    </main>
  );
}
