import { pgTable, text, serial, boolean, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Add Conversation type definition
export interface Conversation {
  userId: number;
  userName: string;
  requestId: number;
  requestTitle?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
}

const MessageRole = z.enum(["client", "service"]);
export type MessageRole = z.infer<typeof MessageRole>;

// Enums and custom types
export const UserRole = z.enum(["client", "service"]);
export type UserRole = z.infer<typeof UserRole>;

// Base user interface with common properties
export interface BaseUser {
  id: number;
  email: string;
  firebaseUid: string;
  role: UserRole;
  verified: boolean;
  createdAt: Date;
  phone: string;
  county: string;
  city: string;
}

// Client specific interface
export interface ClientUser extends BaseUser {
  role: "client";
  name: string;
}

// Service Provider specific interface
export interface ServiceProviderUser extends BaseUser {
  role: "service";
  companyName: string;
  representativeName: string;
  cui: string;
  tradeRegNumber: string;
  address: string;
}

// Messages table definition
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id),
  senderId: integer("sender_id").notNull(),
  senderRole: text("sender_role", { enum: ["client", "service"] }).notNull(),
  receiverId: integer("receiver_id").notNull(),
  receiverRole: text("receiver_role", { enum: ["client", "service"] }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Add message relations
export const messagesRelations = relations(messages, ({ one }) => ({
  request: one(requests, {
    fields: [messages.requestId],
    references: [requests.id],
  }),
  clientSender: one(clients, {
    fields: [messages.senderId],
    references: [clients.id],
    relationName: "clientSender"
  }),
  serviceSender: one(serviceProviders, {
    fields: [messages.senderId],
    references: [serviceProviders.id],
    relationName: "serviceSender"
  }),
  clientReceiver: one(clients, {
    fields: [messages.receiverId],
    references: [clients.id],
    relationName: "clientReceiver"
  }),
  serviceReceiver: one(serviceProviders, {
    fields: [messages.receiverId],
    references: [serviceProviders.id],
    relationName: "serviceReceiver"
  })
}));

// Clients table definition
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").unique().notNull(),
  county: text("county").notNull(),
  city: text("city").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const clientsRelations = relations(clients, ({ many }) => ({
  cars: many(cars),
  requests: many(requests),
  clientSender: many(messages),
  clientReceiver: many(messages),
  viewedOffers: many(viewedOffers)
}));

// Service Providers table definition
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  companyName: text("company_name").notNull(),
  representativeName: text("representative_name").notNull(),
  phone: text("phone").unique().notNull(),
  cui: text("cui").notNull(),
  tradeRegNumber: text("trade_reg_number").notNull(),
  address: text("address").notNull(),
  county: text("county").notNull(),
  city: text("city").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Cars table definition
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: text("year").notNull(),
  fuelType: text("fuel_type", {
    enum: ["Benzină", "Motorină", "Hibrid", "Electric"]
  }).notNull(),
  transmission: text("transmission", {
    enum: ["Manuală", "Automată"]
  }).notNull(),
  vin: text("vin"),
  mileage: integer("mileage").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const carsRelations = relations(cars, ({ one, many }) => ({
  client: one(clients, {
    fields: [cars.clientId],
    references: [clients.id],
  }),
  requests: many(requests)
}));

// Requests table definition
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  carId: integer("car_id").notNull().references(() => cars.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["Active", "Rezolvat", "Anulat"]
  }).default("Active").notNull(),
  preferredDate: timestamp("preferred_date").notNull(),
  county: text("county").notNull(),
  cities: text("cities").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const requestsRelations = relations(requests, ({ one }) => ({
  client: one(clients, {
    fields: [requests.clientId],
    references: [clients.id],
  }),
  car: one(cars, {
    fields: [requests.carId],
    references: [cars.id],
  }),
}));

// Sent Offers table definition
export const sentOffers = pgTable("sent_offers", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id),
  requestId: integer("request_id").notNull().references(() => requests.id),
  title: text("title").notNull(),
  details: text("details").notNull(),
  availableDates: timestamp("available_dates").array().notNull(),
  price: integer("price").notNull(),
  notes: text("notes"),
  // Request details columns
  requestTitle: text("request_title").notNull(),
  requestDescription: text("request_description").notNull(),
  requestPreferredDate: timestamp("request_preferred_date").notNull(),
  requestCounty: text("request_county").notNull(),
  requestCities: text("request_cities").array().notNull(),
  // Add client information for messaging
  requestUserId: integer("request_user_id").notNull(),
  requestUserName: text("request_user_name").notNull(),
  status: text("status", {
    enum: ["Pending", "Accepted", "Rejected"]
  }).default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations remain unchanged
export const sentOffersRelations = relations(sentOffers, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [sentOffers.serviceProviderId],
    references: [serviceProviders.id],
  }),
  request: one(requests, {
    fields: [sentOffers.requestId],
    references: [requests.id],
  }),
}));


// Add viewed requests table definition
export const viewedRequests = pgTable("viewed_requests", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id),
  requestId: integer("request_id").notNull().references(() => requests.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull()
}, (table) => {
  return {
    // Ensure unique combination of service provider and request
    uniqueServiceRequest: unique().on(table.serviceProviderId, table.requestId)
  };
});

// Add viewed requests relations
export const viewedRequestsRelations = relations(viewedRequests, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [viewedRequests.serviceProviderId],
    references: [serviceProviders.id],
  }),
  request: one(requests, {
    fields: [viewedRequests.requestId],
    references: [requests.id],
  }),
}));

// Add viewed offers table definition
export const viewedOffers = pgTable("viewed_offers", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  offerId: integer("offer_id").notNull().references(() => sentOffers.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull()
}, (table) => {
  return {
    // Ensure unique combination of client and offer
    uniqueClientOffer: unique().on(table.clientId, table.offerId)
  };
});

// Add viewed offers relations
export const viewedOffersRelations = relations(viewedOffers, ({ one }) => ({
  client: one(clients, {
    fields: [viewedOffers.clientId],
    references: [clients.id],
  }),
  offer: one(sentOffers, {
    fields: [viewedOffers.offerId],
    references: [sentOffers.id],
  }),
}));

// Add after the viewedOffers table definition

// Add viewed accepted offers table definition
export const viewedAcceptedOffers = pgTable("viewed_accepted_offers", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id),
  offerId: integer("offer_id").notNull().references(() => sentOffers.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull()
}, (table) => {
  return {
    // Ensure unique combination of service provider and offer
    uniqueServiceOffer: unique().on(table.serviceProviderId, table.offerId)
  };
});

// Add viewed accepted offers relations
export const viewedAcceptedOffersRelations = relations(viewedAcceptedOffers, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [viewedAcceptedOffers.serviceProviderId],
    references: [serviceProviders.id],
  }),
  offer: one(sentOffers, {
    fields: [viewedAcceptedOffers.offerId],
    references: [sentOffers.id],
  }),
}));

// Update service providers relations to include viewed accepted offers
export const serviceProvidersRelations = relations(serviceProviders, ({ many }) => ({
  viewedRequests: many(viewedRequests),
  sentOffers: many(sentOffers),
  viewedAcceptedOffers: many(viewedAcceptedOffers)
}));

// Add viewed accepted offers schemas
export const insertViewedAcceptedOfferSchema = createInsertSchema(viewedAcceptedOffers).omit({
  id: true,
  viewedAt: true
});

// Add to exports
export type InsertViewedAcceptedOffer = z.infer<typeof insertViewedAcceptedOfferSchema>;
export type ViewedAcceptedOffer = typeof viewedAcceptedOffers.$inferSelect;

// Add viewed requests schemas
export const insertViewedRequestSchema = createInsertSchema(viewedRequests).omit({
  id: true,
  viewedAt: true
});

// Add to exports
export type InsertViewedRequest = z.infer<typeof insertViewedRequestSchema>;
export type ViewedRequest = typeof viewedRequests.$inferSelect;


// Define a type for accepted offer with client details
export type AcceptedOfferWithClient = SentOffer & {
  clientName: string;
  clientPhone: string;
};

// Schema for client registration
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  verified: true,
  createdAt: true,
  firebaseUid: true
});

// Schema for service provider registration
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  verified: true,
  createdAt: true,
  firebaseUid: true
});

// Car and request schemas remain the same
export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  status: true,
  createdAt: true
});

// Add the insertSentOfferSchema
export const insertSentOfferSchema = createInsertSchema(sentOffers).omit({
  id: true,
  status: true,
  createdAt: true,
  // These fields will be filled automatically from the request
  requestTitle: true,
  requestDescription: true,
  requestPreferredDate: true,
  requestCounty: true,
  requestCities: true
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true
});

// Export types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertSentOffer = z.infer<typeof insertSentOfferSchema>;
export type SentOffer = typeof sentOffers.$inferSelect;
// Export message types
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Type guards for user types
export const isClientUser = (user: User): user is ClientUser => {
  return user.role === "client";
};

export const isServiceProviderUser = (user: User): user is ServiceProviderUser => {
  return user.role === "service";
};

export type User = ClientUser | ServiceProviderUser;

// Add viewed offer schemas
export const insertViewedOfferSchema = createInsertSchema(viewedOffers).omit({
  id: true,
  viewedAt: true
});

// Add to exports
export type InsertViewedOffer = z.infer<typeof insertViewedOfferSchema>;
export type ViewedOffer = typeof viewedOffers.$inferSelect;

// Add OfferWithProvider type that was missing
export type OfferWithProvider = SentOffer & {
  serviceProviderName: string;
  serviceProviderId: number;
};