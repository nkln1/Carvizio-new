import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with expanded fields for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  role: text("role", { enum: ["client", "service"] }).notNull(),
  name: text("name"),
  phone: text("phone"),
  county: text("county"),
  city: text("city"),
  // Service specific fields
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
  requests: many(requests)
}));

// Cars table definition
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

// Requests table definition
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  carId: integer("car_id").notNull().references(() => cars.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["În așteptare", "Acceptat", "Finalizat"]
  }).default("În așteptare").notNull(),
  preferredDate: timestamp("preferred_date").notNull(),
  county: text("county").notNull(),
  cities: text("cities").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const requestsRelations = relations(requests, ({ one }) => ({
  user: one(users, {
    fields: [requests.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [requests.carId],
    references: [cars.id],
  }),
}));

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
  createdAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;