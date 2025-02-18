import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Base users table with common fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  role: text("role", { enum: ["client", "service"] }).notNull(),
  name: text("name"),
  phone: text("phone").unique(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Client-specific information
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  county: text("county"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Service provider-specific information
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  companyName: text("company_name"),
  representativeName: text("representative_name"),
  cui: text("cui"),
  tradeRegNumber: text("trade_reg_number"),
  address: text("address"),
  county: text("county"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Cars table definition (unchanged)
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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

// Requests table definition (unchanged)
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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

// Messages table for future messaging functionality
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  requestId: integer("request_id").references(() => requests.id),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  client: one(clients, {
    fields: [users.id],
    references: [clients.userId],
  }),
  serviceProvider: one(serviceProviders, {
    fields: [users.id],
    references: [serviceProviders.userId],
  }),
  cars: many(cars),
  requests: many(requests),
  sentMessages: many(messages),
  receivedMessages: many(messages)
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  })
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ one }) => ({
  user: one(users, {
    fields: [serviceProviders.userId],
    references: [users.id],
  })
}));

export const carsRelations = relations(cars, ({ one, many }) => ({
  user: one(users, {
    fields: [cars.userId],
    references: [users.id],
  }),
  requests: many(requests)
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  user: one(users, {
    fields: [requests.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [requests.carId],
    references: [cars.id],
  }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  }),
  request: one(requests, {
    fields: [messages.requestId],
    references: [requests.id],
  })
}));

// Schema types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verified: true,
  createdAt: true,
  firebaseUid: true
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  status: true,
  createdAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;