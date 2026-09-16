'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteRecordButton({
  endpoint,
  name,
}: {
  endpoint: string;
  name: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function remove() {
    if (
      !window.confirm(
        `Delete “${name}”? This cannot be undone and it will be removed from the public website.`,
      )
    )
      return;
    setPending(true);
    setMessage('Deleting…');
    const response = await fetch(endpoint, { method: 'DELETE' });
    const body = (await response.json()) as { message?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(body.message ?? 'The record could not be deleted.');
      return;
    }
    setMessage('Deleted.');
    router.refresh();
  }
  return (
    <span className="delete-control">
      <button
        className="danger-button"
        disabled={pending}
        type="button"
        onClick={() => void remove()}
      >
        Delete
      </button>
      <span role="status" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
