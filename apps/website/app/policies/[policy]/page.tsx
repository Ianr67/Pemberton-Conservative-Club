import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHero, SiteShell, readApi, type ClubSettings } from '../../site';
const policies = {
  privacy: {
    title: 'Privacy notice',
    description: 'How this demonstration website handles information.',
    sections: [
      [
        'About this demonstration',
        'This is a demonstration service. It uses fictional records and must not be used to submit real personal or payment-card information.',
      ],
      [
        'Contacting us',
        'If you contact the club, only provide information needed to answer your enquiry. Details about retention and your rights will be confirmed before a production launch.',
      ],
    ],
  },
  cookies: {
    title: 'Cookie notice',
    description: 'Cookies used by this demonstration website.',
    sections: [
      [
        'Essential cookies',
        'This public demonstration does not use advertising or analytics cookies. Essential session cookies may be introduced for secure account features in later steps.',
      ],
      [
        'Your choices',
        'Any optional cookies added before launch will require a clear choice and this notice will be updated.',
      ],
    ],
  },
  accessibility: {
    title: 'Accessibility statement',
    description:
      'Our approach to accessible use of this demonstration website.',
    sections: [
      [
        'Our commitment',
        'We aim for WCAG 2.2 AA, including keyboard access, visible focus, clear headings, sufficient contrast, zoom and reflow support.',
      ],
      [
        'Tell us about a problem',
        'If you find an accessibility barrier, use the published telephone or email details on the contact page so the club can help.',
      ],
    ],
  },
} as const;
export function generateStaticParams() {
  return Object.keys(policies).map((policy) => ({ policy }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<Metadata> {
  const { policy } = await params;
  const item = policies[policy as keyof typeof policies];
  return item
    ? {
        title: `${item.title} | Pemberton Conservative Club`,
        description: item.description,
      }
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const item = policies[policy as keyof typeof policies];
  if (!item) notFound();
  const settings = await readApi<ClubSettings>('/club-settings');
  const name = settings.status === 'ready' ? settings.data.clubName : undefined;
  return (
    <SiteShell current="" clubName={name}>
      <PageHero eyebrow="Website information" title={item.title}>
        <p className="lead">{item.description}</p>
      </PageHero>
      <article className="policy-content">
        {item.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </article>
    </SiteShell>
  );
}
