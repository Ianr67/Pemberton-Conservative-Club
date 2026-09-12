import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/auth/logout`,
    {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    },
  );
  const outgoing = NextResponse.json(
    { status: 'signed_out' },
    { status: response.status },
  );
  const cookie = response.headers.get('set-cookie');
  if (cookie) outgoing.headers.set('set-cookie', cookie);
  return outgoing;
}
