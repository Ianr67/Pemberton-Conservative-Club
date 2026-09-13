import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { EventRecord } from '@pcc/contracts';
import { EventForm } from '../event-form';
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/events/${encodeURIComponent(id)}`,
    { headers: { cookie: (await cookies()).toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  if (response.status === 404) notFound();
  return <EventForm event={(await response.json()) as EventRecord} />;
}
