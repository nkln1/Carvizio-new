
-- Allow null values for offer_id and request_id in reviews table
ALTER TABLE reviews ALTER COLUMN offer_id DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN request_id DROP NOT NULL;
