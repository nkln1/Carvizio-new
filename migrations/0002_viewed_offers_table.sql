-- Create viewed_offers table if it doesn't exist
CREATE TABLE IF NOT EXISTS viewed_offers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    offer_id INTEGER NOT NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT viewed_offers_client_id_fk FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT viewed_offers_offer_id_fk FOREIGN KEY (offer_id) REFERENCES sent_offers(id),
    CONSTRAINT viewed_offers_client_offer_unique UNIQUE (client_id, offer_id)
);
