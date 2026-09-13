CREATE TABLE venues (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  address_line_1 text NOT NULL CHECK (char_length(address_line_1) BETWEEN 1 AND 160),
  address_line_2 text,
  town text NOT NULL CHECK (char_length(town) BETWEEN 1 AND 80),
  postcode text NOT NULL CHECK (char_length(postcode) BETWEEN 2 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES venues(id),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  doors_at timestamptz NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted')),
  capacity integer NOT NULL CHECK (capacity > 0),
  artwork_url text,
  artwork_alt text,
  artwork_width integer CHECK (artwork_width > 0),
  artwork_height integer CHECK (artwork_height > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  updated_by uuid NOT NULL REFERENCES users(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_slug_unique UNIQUE (slug),
  CONSTRAINT events_time_order CHECK (doors_at <= starts_at AND starts_at < ends_at),
  CONSTRAINT events_artwork_metadata CHECK (
    (artwork_url IS NULL AND artwork_alt IS NULL AND artwork_width IS NULL AND artwork_height IS NULL) OR
    (artwork_url ~ '^https://' AND artwork_alt IS NOT NULL AND char_length(artwork_alt) BETWEEN 1 AND 300)
  ),
  CONSTRAINT events_published_at CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR status = 'draft'
  )
);

CREATE INDEX events_public_listing_index ON events (starts_at, id)
  WHERE status = 'published' AND visibility = 'public';

INSERT INTO permissions (id, code, description)
VALUES ('30000000-0000-4000-8000-000000000004', 'events.manage', 'Create, edit and publish events');

INSERT INTO role_permissions (role_id, permission_id)
SELECT id, '30000000-0000-4000-8000-000000000004' FROM roles WHERE code = 'administrator';
