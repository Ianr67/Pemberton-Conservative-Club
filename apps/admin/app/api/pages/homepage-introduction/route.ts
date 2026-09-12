import { type NextRequest, NextResponse } from 'next/server';
const base = () => process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
async function proxy(request: NextRequest, path: string, method = 'GET') {
  const response = await fetch(
    `${base()}/admin/pages/homepage-introduction${path}`,
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
export function GET(request: NextRequest) {
  return proxy(request, '');
}
export function POST(request: NextRequest) {
  return proxy(request, '/drafts', 'POST');
}
