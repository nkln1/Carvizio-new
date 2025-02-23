-- Add foreign key constraints
ALTER TABLE viewed_offers
ADD CONSTRAINT viewed_offers_client_id_fk
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE viewed_offers
ADD CONSTRAINT viewed_offers_offer_id_fk
FOREIGN KEY (offer_id) REFERENCES sent_offers(id);

-- Add unique constraint for client_id and offer_id combination
ALTER TABLE viewed_offers
ADD CONSTRAINT viewed_offers_client_offer_unique
UNIQUE (client_id, offer_id);
