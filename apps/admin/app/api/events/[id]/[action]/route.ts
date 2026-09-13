import { type NextRequest, NextResponse } from 'next/server';
const allowed = new Set(['publish', 'unpublish']);
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!allowed.has(action))
    return NextResponse.json(
      { code: 'not_found', message: 'Not found.' },
      { status: 404 },
    );
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const response = await fetch(
    `${base}/admin/events/${encodeURIComponent(id)}/${action}`,
    {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
