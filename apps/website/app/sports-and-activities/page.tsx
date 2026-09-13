import type { Metadata } from 'next';
import { ContentPage } from '../content-page';
export const metadata: Metadata = {
  title: 'Sports and Activities | Pemberton Conservative Club',
  description:
    'Explore sports, social groups and activities at Pemberton Conservative Club.',
};
export default function Page() {
  return <ContentPage path="/sports-and-activities" />;
}
