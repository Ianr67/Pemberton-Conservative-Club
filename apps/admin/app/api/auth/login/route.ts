import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/auth/login`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for':
          request.headers.get('x-forwarded-for') ?? '127.0.0.1',
      },
      body: await request.text(),
      cache: 'no-store',
    },
  );
  const outgoing = new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
  const cookie = response.headers.get('set-cookie');
  if (cookie) outgoing.headers.set('set-cookie', cookie);
  return outgoing;
}
