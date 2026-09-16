import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const response = await fetch(`${base}/admin/media`, {
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
