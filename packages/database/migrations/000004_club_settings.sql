CREATE TABLE club_settings (
  id uuid PRIMARY KEY,
  published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_setting_versions (
  id uuid PRIMARY KEY,
  club_settings_id uuid NOT NULL REFERENCES club_settings(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  state text NOT NULL CHECK (state IN ('draft', 'published')),
  club_name text NOT NULL CHECK (char_length(club_name) BETWEEN 1 AND 120),
  address_line_1 text NOT NULL CHECK (char_length(address_line_1) BETWEEN 1 AND 120),
  address_line_2 text CHECK (address_line_2 IS NULL OR char_length(address_line_2) <= 120),
  town text NOT NULL CHECK (char_length(town) BETWEEN 1 AND 80),
  postcode text NOT NULL CHECK (char_length(postcode) BETWEEN 2 AND 12),
  telephone text NOT NULL CHECK (char_length(telephone) BETWEEN 7 AND 30),
  email text NOT NULL CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (club_settings_id, version_number),
  CHECK ((state = 'published' AND published_at IS NOT NULL) OR state = 'draft')
);

CREATE TABLE club_opening_times (
  version_id uuid NOT NULL REFERENCES club_setting_versions(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  is_closed boolean NOT NULL DEFAULT false,
  opens_at time,
  closes_at time,
  PRIMARY KEY (version_id, day_of_week),
  CHECK (
    (is_closed AND opens_at IS NULL AND closes_at IS NULL) OR
    (NOT is_closed AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
  )
);

CREATE TABLE club_social_links (
  version_id uuid NOT NULL REFERENCES club_setting_versions(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'x', 'youtube')),
  url text NOT NULL CHECK (url ~ '^https://'),
  PRIMARY KEY (version_id, platform)
);

ALTER TABLE club_settings ADD CONSTRAINT club_settings_published_version_foreign_key
  FOREIGN KEY (published_version_id) REFERENCES club_setting_versions(id);
CREATE INDEX club_setting_versions_state_index
  ON club_setting_versions (club_settings_id, state, version_number DESC);
