import type { Metadata } from 'next';
import { ContentPage } from '../content-page';
export const metadata: Metadata = {
  title: 'About | Pemberton Conservative Club',
  description:
    'Learn about Pemberton Conservative Club and its place in the local community.',
};
export default function Page() {
  return <ContentPage path="/about" />;
}
