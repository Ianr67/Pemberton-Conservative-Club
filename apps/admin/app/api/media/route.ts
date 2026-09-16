import { type NextRequest, NextResponse } from 'next/server';

const base = () => process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  const response = await fetch(
    `${base()}/admin/media?${request.nextUrl.searchParams.toString()}`,
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

export async function POST(request: NextRequest) {
  const response = await fetch(`${base()}/admin/media`, {
    method: 'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
    body: await request.formData(),
    cache: 'no-store',
  });
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'content-type':
        response.headers.get('content-type') ?? 'application/json',
    },
  });
}
