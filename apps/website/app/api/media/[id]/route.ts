import { type NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json(
      { message: 'Image was not found.' },
      { status: 404 },
    );
  }

  const base = process.env.API_BASE_URL ?? 'http://localhost:3002/api/v1';
  const response = await fetch(`${base}/media/${encodeURIComponent(id)}`, {
    cache: 'force-cache',
  });
  if (!response.ok) {
    return NextResponse.json(
      { message: 'Image was not found.' },
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'content-type':
        response.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}
