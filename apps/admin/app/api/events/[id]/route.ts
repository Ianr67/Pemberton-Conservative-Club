import { type NextRequest, NextResponse } from 'next/server';
const base = () => process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxy(request, (await params).id, 'GET');
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxy(request, (await params).id, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await fetch(
    `${base()}/admin/events/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
async function proxy(request: NextRequest, id: string, method: string) {
  const response = await fetch(
    `${base()}/admin/events/${encodeURIComponent(id)}`,
    {
      method,
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        'content-type': 'application/json',
      },
      body: method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
