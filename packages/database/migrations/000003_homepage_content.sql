CREATE TABLE pages (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE page_versions (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  state text NOT NULL CHECK (state IN ('draft', 'published')),
  introduction text NOT NULL CHECK (char_length(introduction) BETWEEN 1 AND 1000),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (page_id, version_number),
  CHECK ((state = 'published' AND published_at IS NOT NULL) OR state = 'draft')
);

ALTER TABLE pages ADD CONSTRAINT pages_published_version_foreign_key
  FOREIGN KEY (published_version_id) REFERENCES page_versions(id);
CREATE INDEX page_versions_page_state_index ON page_versions (page_id, state, version_number DESC);
