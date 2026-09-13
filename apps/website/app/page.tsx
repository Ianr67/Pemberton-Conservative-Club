export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const [response, settingsResponse] = await Promise.all([
    fetch(`${base}/content/homepage-introduction`, { cache: 'no-store' }),
    fetch(`${base}/club-settings`, { cache: 'no-store' }),
  ]);
  const content = response.ok
    ? ((await response.json()) as { introduction: string })
    : null;
  const settings = settingsResponse.ok
    ? ((await settingsResponse.json()) as {
        clubName: string;
        addressLine1: string;
        addressLine2: string;
        town: string;
        postcode: string;
        telephone: string;
        email: string;
        openingTimes: {
          day: string;
          isClosed: boolean;
          opensAt: string | null;
          closesAt: string | null;
        }[];
        socialLinks: { platform: string; url: string }[];
      })
    : null;
  return (
    <main>
      <p className="eyebrow">Demonstration environment</p>
      <h1>{settings?.clubName ?? 'Pemberton Conservative Club'}</h1>
      <p>
        {content?.introduction ??
          'Our homepage introduction is temporarily unavailable.'}
      </p>
      {settings && (
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading">Visit and contact us</h2>
          <address>
            {settings.addressLine1}
            <br />
            {settings.addressLine2 && (
              <>
                {settings.addressLine2}
                <br />
              </>
            )}
            {settings.town}
            <br />
            {settings.postcode}
          </address>
          <p>
            <a href={`tel:${settings.telephone}`}>{settings.telephone}</a>
            <br />
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
          <h3>Opening times</h3>
          <dl>
            {settings.openingTimes.map((h) => (
              <div key={h.day}>
                <dt>{h.day}</dt>
                <dd>{h.isClosed ? 'Closed' : `${h.opensAt}–${h.closesAt}`}</dd>
              </div>
            ))}
          </dl>
          {settings.socialLinks.length > 0 && (
            <>
              <h3>Follow the club</h3>
              <ul>
                {settings.socialLinks.map((link) => (
                  <li key={link.platform}>
                    <a href={link.url}>{link.platform}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </main>
  );
}
