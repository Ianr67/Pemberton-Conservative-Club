import { type NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const response = await fetch(
    `${process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1'}/admin/pages/homepage-introduction/preview`,
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
