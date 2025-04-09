-- Create client_notification_preferences table
CREATE TABLE "client_notification_preferences" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id") UNIQUE,
  "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_offer_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_message_email_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  
  "browser_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_offer_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "new_message_browser_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "browser_permission" BOOLEAN NOT NULL DEFAULT FALSE,
  
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE "client_notification_preferences" IS 'Stores notification preferences for clients';