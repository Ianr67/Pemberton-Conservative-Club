import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './styles.css';
import { AdminFrame } from './admin-frame';

export const metadata: Metadata = {
  title: 'Club administration — Demo',
  description: 'Demonstration administration portal.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <AdminFrame>{children}</AdminFrame>
      </body>
    </html>
  );
}
