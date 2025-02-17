import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table remains unchanged
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  role: text("role", { enum: ["client", "service"] }).notNull(),
  name: text("name"),
  phone: text("phone").unique(), 
  county: text("county"),
  city: text("city"),
  companyName: text("company_name"),
  representativeName: text("representative_name"),
  cui: text("cui"),
  tradeRegNumber: text("trade_reg_number"),
  address: text("address"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  cars: many(cars),
  requests: many(requests),
  offers: many(offers)
}));

// Cars table remains unchanged
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

export const carsRelations = relations(cars, ({ one, many }) => ({
  user: one(users, {
    fields: [cars.userId],
    references: [users.id],
  }),
  requests: many(requests)
}));

// Updated requests table with hasReceivedOffer field
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
  hasReceivedOffer: boolean("has_received_offer").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const requestsRelations = relations(requests, ({ one, many }) => ({
  user: one(users, {
    fields: [requests.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [requests.carId],
    references: [cars.id],
  }),
  offers: many(offers)
}));

// New offers table
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id),
  serviceId: integer("service_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  details: text("details").notNull(),
  price: integer("price").notNull(),
  availableDates: text("available_dates").notNull(),
  notes: text("notes"),
  status: text("status", {
    enum: ["Pending", "Accepted", "Rejected"]
  }).default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const offersRelations = relations(offers, ({ one }) => ({
  request: one(requests, {
    fields: [offers.requestId],
    references: [requests.id],
  }),
  service: one(users, {
    fields: [offers.serviceId],
    references: [users.id],
  })
}));

// Schema exports
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verified: true,
  createdAt: true,
  firebaseUid: true
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  status: true,
  hasReceivedOffer: true,
  createdAt: true
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  status: true,
  createdAt: true
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;