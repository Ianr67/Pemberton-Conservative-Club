import {
  ContactSummary,
  Intro,
  PageHero,
  Placeholder,
  SiteShell,
  readSharedContent,
  readApi,
} from './site';
import type { PageContent as PageContentRecord } from '@pcc/contracts';
import { browserImageUrl } from './media-url';

const copy = {
  '/function-room': {
    eyebrow: 'Celebrate together',
    title: 'A room for your occasion',
    body: 'Our function room is a welcoming setting for family celebrations, community gatherings and special occasions.',
    placeholder:
      'Function-room availability and enquiry details will be added in a later demonstration step.',
  },
  '/quiz-nights': {
    eyebrow: 'Questions, teams, good company',
    title: 'Quiz nights',
    body: 'Settle in for a friendly evening of general knowledge, conversation and a little healthy competition.',
    placeholder:
      'Upcoming quiz nights will appear here when event publishing is introduced.',
  },
  '/sports-and-activities': {
    eyebrow: 'Something for everyone',
    title: 'Sports and activities',
    body: 'The club brings people together through regular activities, social groups and live sport in comfortable surroundings.',
    placeholder:
      'The current programme of sports and club activities will be published here soon.',
  },
  '/membership': {
    eyebrow: 'Belong locally',
    title: 'Membership information',
    body: 'Membership is about good company, a friendly welcome and supporting a long-standing part of the Pemberton community.',
    placeholder:
      'Membership types, eligibility and how to apply will be added in a later demonstration step.',
  },
  '/about': {
    eyebrow: 'At the heart of Pemberton',
    title: 'About the club',
    body: 'A familiar local meeting place with a proud past and a warm, forward-looking welcome.',
    placeholder:
      'More of the club’s story and history will be published here soon.',
  },
} as const;

export async function ContentPage({ path }: { path: keyof typeof copy }) {
  const [{ content, settings }, pageContent] = await Promise.all([
    readSharedContent(),
    readApi<PageContentRecord>(`/content/pages/${path.slice(1)}`),
  ]);
  const page = copy[path];
  const displayed = pageContent.status === 'ready' ? pageContent.data : page;
  const clubName =
    settings.status === 'ready' ? settings.data.clubName : undefined;
  return (
    <SiteShell current={path} clubName={clubName}>
      <PageHero
        eyebrow={displayed.eyebrow}
        title={'heading' in displayed ? displayed.heading : displayed.title}
      >
        <p className="lead">{displayed.body}</p>
        {pageContent.status === 'error' && (
          <p className="content-notice" role="alert">
            Published page content is temporarily unavailable. Showing fallback
            content.
          </p>
        )}
        {pageContent.status === 'ready' && pageContent.data.image && (
          <img
            className="content-page-image"
            src={browserImageUrl(pageContent.data.image.url)}
            alt={pageContent.data.image.alt}
          />
        )}
      </PageHero>
      <section
        className="intro-panel"
        aria-labelledby="club-introduction-heading"
      >
        <h2 id="club-introduction-heading">Welcome to our club</h2>
        <Intro result={content} />
      </section>
      <Placeholder
        title={
          path === '/function-room'
            ? 'Plan your celebration'
            : 'What’s coming up'
        }
      >
        {page.placeholder}
      </Placeholder>
      <ContactSummary result={settings} />
    </SiteShell>
  );
}
