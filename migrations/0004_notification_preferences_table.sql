-- Create notification_preferences table
CREATE TABLE "notification_preferences" (
  "id" SERIAL PRIMARY KEY,
  "service_provider_id" INTEGER NOT NULL REFERENCES "service_providers"("id") UNIQUE,
  "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_request_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "accepted_offer_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_message_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_review_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  
  "browser_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_request_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "accepted_offer_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_message_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_review_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "browser_permission" BOOLEAN NOT NULL DEFAULT FALSE,
  
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE "notification_preferences" IS 'Stores notification preferences for service providers';