CREATE TABLE "cars" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" text NOT NULL,
	"fuel_type" text NOT NULL,
	"transmission" text NOT NULL,
	"vin" text,
	"mileage" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"firebase_uid" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"county" text NOT NULL,
	"city" text NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_email_unique" UNIQUE("email"),
	CONSTRAINT "clients_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "clients_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_role" text NOT NULL,
	"receiver_id" integer NOT NULL,
	"receiver_role" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"car_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"preferred_date" timestamp NOT NULL,
	"county" text NOT NULL,
	"cities" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_provider_id" integer NOT NULL,
	"request_id" integer NOT NULL,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"available_dates" timestamp[] NOT NULL,
	"price" integer NOT NULL,
	"notes" text,
	"request_title" text NOT NULL,
	"request_description" text NOT NULL,
	"request_preferred_date" timestamp NOT NULL,
	"request_county" text NOT NULL,
	"request_cities" text[] NOT NULL,
	"request_user_id" integer NOT NULL,
	"request_user_name" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"firebase_uid" text NOT NULL,
	"company_name" text NOT NULL,
	"representative_name" text NOT NULL,
	"phone" text NOT NULL,
	"cui" text NOT NULL,
	"trade_reg_number" text NOT NULL,
	"address" text NOT NULL,
	"county" text NOT NULL,
	"city" text NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_providers_email_unique" UNIQUE("email"),
	CONSTRAINT "service_providers_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "service_providers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_offers" ADD CONSTRAINT "sent_offers_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_offers" ADD CONSTRAINT "sent_offers_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;