CREATE TABLE media (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE page_versions
  ADD COLUMN image_url text,
  ADD COLUMN image_alt text,
  ADD COLUMN image_width integer CHECK (image_width > 0),
  ADD COLUMN image_height integer CHECK (image_height > 0),
  ADD CONSTRAINT page_versions_image_metadata CHECK (
    (image_url IS NULL AND image_alt IS NULL AND image_width IS NULL AND image_height IS NULL) OR
    ((image_url ~ '^https://' OR image_url ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?/') AND image_alt IS NOT NULL AND char_length(image_alt) BETWEEN 1 AND 300)
  );

ALTER TABLE events
  DROP CONSTRAINT events_artwork_metadata,
  ADD CONSTRAINT events_artwork_metadata CHECK (
    (artwork_url IS NULL AND artwork_alt IS NULL AND artwork_width IS NULL AND artwork_height IS NULL) OR
    ((artwork_url ~ '^https://' OR artwork_url ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?/') AND artwork_alt IS NOT NULL AND char_length(artwork_alt) BETWEEN 1 AND 300)
  );
