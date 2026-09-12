import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { LogoutButton } from './logout-button';
import Link from 'next/link';

interface User {
  displayName: string;
  email: string;
}

export default async function DashboardPage() {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/dashboard`,
    { headers: { cookie: cookieHeader }, cache: 'no-store' },
  );
  if (!response.ok) redirect('/login');
  const user = ((await response.json()) as { user: User }).user;

  return (
    <main>
      <p className="eyebrow">Demonstration environment</p>
      <h1>Club administration</h1>
      <section>
        <p>
          Signed in as {user.displayName} ({user.email}).
        </p>
        <LogoutButton />
        <Link href="/pages">Manage pages</Link>
      </section>
    </main>
  );
}
