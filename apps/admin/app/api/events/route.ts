import { type NextRequest, NextResponse } from 'next/server';
const base = () => process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
async function proxy(request: NextRequest, method: string) {
  const response = await fetch(`${base()}/admin/events`, {
    method,
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      'content-type': 'application/json',
    },
    body: method === 'GET' ? undefined : await request.text(),
    cache: 'no-store',
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
export function GET(request: NextRequest) {
  return proxy(request, 'GET');
}
export function POST(request: NextRequest) {
  return proxy(request, 'POST');
}
