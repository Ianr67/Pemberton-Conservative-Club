import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './styles.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://pemberton-club.example.test'),
  title: 'Pemberton Conservative Club | Welcome',
  description:
    'Discover Pemberton Conservative Club, including opening times, contact details and what is coming up at the club.',
  applicationName: 'Pemberton Conservative Club',
  openGraph: {
    title: 'Pemberton Conservative Club',
    description: 'A welcoming local club at the heart of Pemberton.',
    type: 'website',
    locale: 'en_GB',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
