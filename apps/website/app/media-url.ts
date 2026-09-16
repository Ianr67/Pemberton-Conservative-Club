const uploadedMediaPath = /^\/api\/v1\/media\/([0-9a-f-]{36})$/i;

export function browserImageUrl(url: string): string {
  try {
    const match = uploadedMediaPath.exec(new URL(url).pathname);
    return match ? `/api/media/${match[1]}` : url;
  } catch {
    return url;
  }
}
