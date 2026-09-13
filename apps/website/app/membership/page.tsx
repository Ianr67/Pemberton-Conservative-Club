import type { Metadata } from 'next';
import { ContentPage } from '../content-page';
export const metadata: Metadata = {
  title: 'Membership Information | Pemberton Conservative Club',
  description: 'Learn about belonging to Pemberton Conservative Club.',
};
export default function Page() {
  return <ContentPage path="/membership" />;
}
