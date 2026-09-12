ALTER TABLE users ADD COLUMN password_hash text;

CREATE INDEX sessions_active_token_index
  ON sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;
