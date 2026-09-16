import { type NextRequest, NextResponse } from 'next/server';

const base = () => process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const response = await fetch(
    `${base()}/admin/pages/${encodeURIComponent(slug)}`,
    {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const response = await fetch(
    `${base()}/admin/pages/${encodeURIComponent(slug)}/drafts`,
    {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        'content-type': 'application/json',
      },
      body: await request.text(),
      cache: 'no-store',
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const response = await fetch(
    `${base()}/admin/pages/${encodeURIComponent(slug)}`,
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
