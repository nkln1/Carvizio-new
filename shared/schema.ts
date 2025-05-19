import { pgTable, text, serial, boolean, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Message validation schema
export const MessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  senderId: z.number(),
  senderRole: z.enum(["client", "service"]),
  receiverId: z.number(),
  receiverRole: z.enum(["client", "service"]),
  requestId: z.number(),
  offerId: z.number().optional(),
});

// Conversation validation schema
export const ConversationSchema = z.object({
  userId: z.number(),
  userName: z.string(),
  requestId: z.number(),
  requestTitle: z.string().optional(),
  lastMessage: z.string().optional(),
  lastMessageDate: z.string().optional(),
  unreadCount: z.number(),
  offerId: z.number().optional(),
});

// Add Conversation type definition
export interface Conversation {
  userId: number;
  userName: string;
  requestId: number;
  offerId?: number;
  lastMessage: string;
  lastMessageDate: string;
  lastMessageSenderId?: number;
  unreadCount: number;
  requestTitle?: string;
  sourceTab?: string;
  hasNewMessages: boolean;
  serviceProviderUsername?: string; // Add this field for service profile links
}

const MessageRole = z.enum(["client", "service"]);
export type MessageRole = z.infer<typeof MessageRole>;

// Enums and custom types
export const UserRole = z.enum(["client", "service", "admin"]);
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
// Client Notification preferences interface
export interface ClientNotificationPreferences {
  id: number;
  clientId: number;
  emailNotificationsEnabled: boolean;
  newOfferEmailEnabled: boolean;
  newMessageEmailEnabled: boolean;
  
  browserNotificationsEnabled: boolean;
  newOfferBrowserEnabled: boolean;
  newMessageBrowserEnabled: boolean;
  browserPermission: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientUser extends BaseUser {
  role: "client";
  name: string;
  notificationPreferences?: ClientNotificationPreferences;
}

// Service Provider specific interface
// Notification preferences interface
export interface NotificationPreferences {
  id: number;
  serviceProviderId: number;
  emailNotificationsEnabled: boolean;
  newRequestEmailEnabled: boolean;
  acceptedOfferEmailEnabled: boolean;
  newMessageEmailEnabled: boolean;
  newReviewEmailEnabled: boolean;
  
  browserNotificationsEnabled: boolean;
  newRequestBrowserEnabled: boolean;
  acceptedOfferBrowserEnabled: boolean;
  newMessageBrowserEnabled: boolean;
  newReviewBrowserEnabled: boolean;
  browserPermission: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceProviderUser extends BaseUser {
  role: "service";
  companyName: string;
  representativeName: string;
  cui: string;
  tradeRegNumber: string;
  address: string;
  username: string; // Add username field
  notificationPreferences?: NotificationPreferences;
}

// Messages table definition
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id),
  offerId: integer("offer_id").references(() => sentOffers.id),
  senderId: integer("sender_id").notNull(),
  senderRole: text("sender_role", { enum: ["client", "service"] }).notNull(),
  receiverId: integer("receiver_id").notNull(),
  receiverRole: text("receiver_role", { enum: ["client", "service"] }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isNew: boolean("is_new").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Add message relations
export const messagesRelations = relations(messages, ({ one }) => ({
  request: one(requests, {
    fields: [messages.requestId],
    references: [requests.id],
  }),
  offer: one(sentOffers, {
    fields: [messages.offerId],
    references: [sentOffers.id],
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

// Forward references are defined below

export const clientsRelations = relations(clients, ({ many, one }) => ({
  cars: many(cars),
  requests: many(requests),
  clientSender: many(messages),
  clientReceiver: many(messages),
  viewedOffers: many(viewedOffers)
  // Client notification preferences relation will be added after the table is defined
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
  username: text("username").notNull().unique(),
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
    enum: ["Pending", "Accepted", "Rejected", "Completed"]
  }).default("Pending").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
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
  requestCities: true,
  completedAt: true //Corrected: keep completedAt optional in insert schema
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


// Working Hours table definition
export const workingHours = pgTable("working_hours", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id),
  dayOfWeek: text("day_of_week", {
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  }).notNull(),
  openTime: text("open_time").notNull(),
  closeTime: text("close_time").notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Update reviews table definition with modified constraints
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  requestId: integer("request_id").references(() => requests.id),
  offerId: integer("offer_id").references(() => sentOffers.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  reported: boolean("reported").default(false).notNull(),
  reportReason: text("report_reason"),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  offerCompletedAt: timestamp("offer_completed_at") // Nullable
}, (table) => {
  return {
    // Modificarea constrângerii: clientul poate lăsa o singură recenzie per service provider
    uniqueClientService: unique().on(table.clientId, table.serviceProviderId)
  };
});

// Update review validation schema
export const insertReviewSchema = z.object({
  serviceProviderId: z.number(),
  clientId: z.number(),
  requestId: z.number().optional().nullable(),
  offerId: z.number().optional().nullable(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Review must be at least 5 characters long"),
  offerCompletedAt: z.date().optional().nullable()
});

// Review relations remain unchanged
export const reviewsRelations = relations(reviews, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [reviews.serviceProviderId],
    references: [serviceProviders.id],
  }),
  client: one(clients, {
    fields: [reviews.clientId],
    references: [clients.id],
  }),
  request: one(requests, {
    fields: [reviews.requestId],
    references: [requests.id],
  }),
  offer: one(sentOffers, {
    fields: [reviews.offerId],
    references: [sentOffers.id],
  })
}));

// Add review types
export type Review = typeof reviews.$inferSelect;

// Add review report schema
export const reviewReportSchema = z.object({
  reviewId: z.number(),
  reason: z.string().min(10, "Please provide a detailed reason for reporting")
});

// Add type for review with related data
export type ReviewWithClient = Review & {
  clientName: string;
  lastModified: Date;
};

// Add relations for working hours and reviews
export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [workingHours.serviceProviderId],
    references: [serviceProviders.id],
  })
}));

// Client notification preferences table definition
export const clientNotificationPreferences = pgTable("client_notification_preferences", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id).unique(),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  newOfferEmailEnabled: boolean("new_offer_email_enabled").default(true).notNull(),
  newMessageEmailEnabled: boolean("new_message_email_enabled").default(true).notNull(),
  
  browserNotificationsEnabled: boolean("browser_notifications_enabled").default(true).notNull(),
  newOfferBrowserEnabled: boolean("new_offer_browser_enabled").default(true).notNull(),
  newMessageBrowserEnabled: boolean("new_message_browser_enabled").default(true).notNull(),
  browserPermission: boolean("browser_permission").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations for client notification preferences
export const clientNotificationPreferencesRelations = relations(clientNotificationPreferences, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotificationPreferences.clientId],
    references: [clients.id],
  })
}));

// Update clients relations to include notification preferences
export const clientsNotificationRelations = relations(clients, ({ one }) => ({
  notificationPreferences: one(clientNotificationPreferences, {
    fields: [clients.id],
    references: [clientNotificationPreferences.clientId],
  })
}));

// Admins table definition
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").unique().notNull(),
  county: text("county").notNull(),
  city: text("city").notNull(),
  verified: boolean("verified").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Admin schema for insertion and validation
export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  verified: true,
  createdAt: true
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

// Notification preferences table definition
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  serviceProviderId: integer("service_provider_id").notNull().references(() => serviceProviders.id).unique(),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  newRequestEmailEnabled: boolean("new_request_email_enabled").default(true).notNull(),
  acceptedOfferEmailEnabled: boolean("accepted_offer_email_enabled").default(true).notNull(),
  newMessageEmailEnabled: boolean("new_message_email_enabled").default(true).notNull(), 
  newReviewEmailEnabled: boolean("new_review_email_enabled").default(true).notNull(),
  
  browserNotificationsEnabled: boolean("browser_notifications_enabled").default(true).notNull(),
  newRequestBrowserEnabled: boolean("new_request_browser_enabled").default(true).notNull(),
  acceptedOfferBrowserEnabled: boolean("accepted_offer_browser_enabled").default(true).notNull(),
  newMessageBrowserEnabled: boolean("new_message_browser_enabled").default(true).notNull(),
  newReviewBrowserEnabled: boolean("new_review_browser_enabled").default(true).notNull(),
  browserPermission: boolean("browser_permission").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations for notification preferences
export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  serviceProvider: one(serviceProviders, {
    fields: [notificationPreferences.serviceProviderId],
    references: [serviceProviders.id],
  })
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ many, one }) => ({
  viewedRequests: many(viewedRequests),
  sentOffers: many(sentOffers),
  viewedAcceptedOffers: many(viewedAcceptedOffers),
  workingHours: many(workingHours),
  reviews: many(reviews),
  notificationPreferences: one(notificationPreferences)
}));

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


// Add schemas for inserting working hours and reviews
export const insertWorkingHourSchema = createInsertSchema(workingHours).omit({
  id: true,
  createdAt: true
});

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


// Add type exports for working hours
export type InsertWorkingHour = z.infer<typeof insertWorkingHourSchema>;
export type WorkingHour = typeof workingHours.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Add schema for notification preferences
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// Add schema for client notification preferences
export const insertClientNotificationPreferencesSchema = createInsertSchema(clientNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertClientNotificationPreference = z.infer<typeof insertClientNotificationPreferencesSchema>;
export type ClientNotificationPreference = typeof clientNotificationPreferences.$inferSelect;

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
  firebaseUid: true,
  username: true // Omit username as it will be generated automatically
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

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  isNew: true,
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

// Admin user interface
export interface AdminUser extends BaseUser {
  role: "admin";
  name: string;
}

// Type guards for user types
export const isClientUser = (user: User): user is ClientUser => {
  return user.role === "client";
};

export const isServiceProviderUser = (user: User): user is ServiceProviderUser => {
  return user.role === "service";
};

export const isAdminUser = (user: User): user is AdminUser => {
  return user.role === "admin";
};

export type User = ClientUser | ServiceProviderUser | AdminUser;

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
  serviceProviderUsername: string; // Add username for profile URL
};