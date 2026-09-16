'use client';

import type { EventArtwork, MediaUpload } from '@pcc/contracts';
import { useRef, useState } from 'react';

export function ImageUpload({
  image,
  onChange,
  label = 'Image',
}: {
  image: EventArtwork | null;
  onChange: (image: EventArtwork | null) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage('Uploading image…');
    const data = new FormData();
    data.set('image', file);
    const response = await fetch('/api/media', { method: 'POST', body: data });
    const result = (await response.json()) as
      MediaUpload | { message?: string };
    setUploading(false);
    if (!response.ok || !('url' in result)) {
      setMessage(
        'message' in result && result.message
          ? result.message
          : 'The image could not be uploaded.',
      );
      return;
    }
    onChange({
      url: result.url,
      alt: image?.alt ?? '',
      width: result.width,
      height: result.height,
    });
    setMessage('Image uploaded. Add alternative text, then save your changes.');
  }

  return (
    <fieldset className="image-upload">
      <legend>{label}</legend>
      {image && <img src={image.url} alt="" />}
      <label>
        Upload image
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      <small>JPEG, PNG, WebP or GIF, up to 5 MB.</small>
      {image && (
        <>
          <label>
            Alternative text
            <input
              required
              maxLength={300}
              value={image.alt}
              onChange={(event) =>
                onChange({ ...image, alt: event.target.value })
              }
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onChange(null);
              if (input.current) input.current.value = '';
              setMessage(
                'Image removed from this item. Save to apply the change.',
              );
            }}
          >
            Remove image
          </button>
        </>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </fieldset>
  );
}
