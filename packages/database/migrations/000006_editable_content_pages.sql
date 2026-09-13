ALTER TABLE page_versions
  ADD COLUMN eyebrow text,
  ADD COLUMN heading text,
  ADD COLUMN body text;

ALTER TABLE page_versions
  DROP CONSTRAINT page_versions_introduction_check,
  ADD CONSTRAINT page_versions_introduction_length CHECK (char_length(introduction) BETWEEN 1 AND 5000);

UPDATE page_versions pv
SET
  eyebrow = 'Welcome to Pemberton',
  heading = p.title,
  body = pv.introduction
FROM pages p
WHERE p.id = pv.page_id;

ALTER TABLE page_versions
  ALTER COLUMN eyebrow SET NOT NULL,
  ALTER COLUMN heading SET NOT NULL,
  ALTER COLUMN body SET NOT NULL,
  ADD CONSTRAINT page_versions_eyebrow_length CHECK (char_length(eyebrow) BETWEEN 1 AND 120),
  ADD CONSTRAINT page_versions_heading_length CHECK (char_length(heading) BETWEEN 1 AND 180),
  ADD CONSTRAINT page_versions_body_length CHECK (char_length(body) BETWEEN 1 AND 5000);
