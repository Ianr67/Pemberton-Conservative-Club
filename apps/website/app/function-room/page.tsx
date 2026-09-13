import type { Metadata } from 'next';
import { ContentPage } from '../content-page';
export const metadata: Metadata = {
  title: 'Function Room | Pemberton Conservative Club',
  description:
    'Discover the function room at Pemberton Conservative Club for celebrations and community gatherings.',
};
export default function Page() {
  return <ContentPage path="/function-room" />;
}
