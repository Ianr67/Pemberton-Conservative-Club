import type { Metadata } from 'next';
import {
  ContactSummary,
  Intro,
  PageHero,
  Placeholder,
  SiteShell,
  readSharedContent,
} from '../site';
export const metadata: Metadata = {
  title: 'Contact and Opening Times | Pemberton Conservative Club',
  description:
    'Contact Pemberton Conservative Club and check the latest published opening times.',
};
export default async function Page() {
  const { content, settings } = await readSharedContent();
  const name = settings.status === 'ready' ? settings.data.clubName : undefined;
  return (
    <SiteShell current="/contact" clubName={name}>
      <PageHero eyebrow="Come and see us" title="Contact and opening times">
        <Intro result={content} />
      </PageHero>
      <ContactSummary result={settings} />
      <Placeholder title="Upcoming events">
        Our published events and entertainment programme will appear here in a
        later demonstration step.
      </Placeholder>
      <Placeholder title="Function-room enquiries">
        Full function-room details and the enquiry journey will be available
        soon.
      </Placeholder>
    </SiteShell>
  );
}
