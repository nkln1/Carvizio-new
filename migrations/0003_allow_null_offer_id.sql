
-- Allow null values for offer_id in reviews table
ALTER TABLE reviews ALTER COLUMN offer_id DROP NOT NULL;
