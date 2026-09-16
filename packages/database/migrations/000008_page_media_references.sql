ALTER TABLE page_versions
  ADD COLUMN image_media_id uuid REFERENCES media(id) ON DELETE RESTRICT;

CREATE INDEX page_versions_image_media_id_index
  ON page_versions (image_media_id)
  WHERE image_media_id IS NOT NULL;
