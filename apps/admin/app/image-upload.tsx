'use client';

import type {
  MediaLibraryItem,
  MediaLibraryPage,
  MediaUpload,
  PageImage,
} from '@pcc/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

export function selectedLibraryImage(item: MediaLibraryItem): PageImage {
  return {
    url: item.url,
    alt: item.alt,
    width: item.width,
    height: item.height,
    mediaId: item.id,
  };
}

export function ImageUpload({
  image,
  onChange,
  label = 'Image',
}: {
  image: PageImage | null;
  onChange: (image: PageImage | null) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<MediaLibraryItem[] | null>(null);
  const [libraryError, setLibraryError] = useState('');
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const pageSize = 24;

  const loadLibrary = useCallback(async (page = 1) => {
    setLibraryError('');
    setLibrary(null);
    try {
      const response = await fetch(
        `/api/media?page=${page}&pageSize=${pageSize}`,
        { cache: 'no-store' },
      );
      if (response.status === 401) {
        location.href = '/login';
        return;
      }
      const result = (await response.json()) as
        MediaLibraryPage | { message?: string };
      if (!response.ok || !('media' in result)) {
        setLibraryError(
          ('message' in result ? result.message : undefined) ??
            'The media library could not be loaded.',
        );
        setLibrary([]);
        return;
      }
      setLibrary(result.media);
      setLibraryPage(result.page);
      setLibraryTotal(result.total);
    } catch {
      setLibraryError('The media library could not be loaded.');
      setLibrary([]);
    }
  }, []);

  useEffect(() => {
    void loadLibrary(1);
  }, [loadLibrary]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage('Uploading image…');
    const data = new FormData();
    data.set('image', file);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        body: data,
      });
      const result = (await response.json()) as
        MediaUpload | { message?: string };
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
        alt: '',
        width: result.width,
        height: result.height,
        mediaId: result.id,
      });
      setMessage(
        'Image uploaded and selected. Add alternative text before saving.',
      );
      await loadLibrary(1);
    } catch {
      setMessage('The image could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
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
      <div className="media-library" aria-labelledby="media-library-heading">
        <h3 id="media-library-heading">Media library</h3>
        {library === null ? (
          <p role="status">Loading media libraryâ€¦</p>
        ) : libraryError ? (
          <div role="alert">
            <p>{libraryError}</p>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadLibrary(libraryPage)}
            >
              Try again
            </button>
          </div>
        ) : library.length === 0 ? (
          <p role="status">No images have been uploaded yet.</p>
        ) : (
          <ul>
            {library.map((item) => {
              const selected = image?.url === item.url;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selected ? 'selected' : ''}
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(selectedLibraryImage(item));
                      setMessage(
                        `Selected ${item.originalFilename}. Add alternative text before saving.`,
                      );
                    }}
                  >
                    <img src={item.url} alt="" />
                    <span>{item.originalFilename}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {library && !libraryError && libraryTotal > pageSize && (
          <nav className="media-pagination" aria-label="Media library pages">
            <button
              type="button"
              className="secondary"
              disabled={libraryPage === 1}
              onClick={() => void loadLibrary(libraryPage - 1)}
            >
              Previous images
            </button>
            <span>
              Page {libraryPage} of {Math.ceil(libraryTotal / pageSize)}
            </span>
            <button
              type="button"
              className="secondary"
              disabled={libraryPage * pageSize >= libraryTotal}
              onClick={() => void loadLibrary(libraryPage + 1)}
            >
              Next images
            </button>
          </nav>
        )}
      </div>
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
