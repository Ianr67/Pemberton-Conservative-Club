import type { Metadata } from 'next';
import { ContentPage } from '../content-page';
export const metadata: Metadata = {
  title: 'Quiz Nights | Pemberton Conservative Club',
  description:
    'Find out about friendly quiz nights at Pemberton Conservative Club.',
};
export default function Page() {
  return <ContentPage path="/quiz-nights" />;
}
