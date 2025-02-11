import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with expanded fields for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verified: true,
  createdAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Keep the cars table as is
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  year: integer("year").notNull(),
  mileage: integer("mileage").notNull(),
  category: text("category").notNull(),
  features: text("features").array(),
  images: text("images").array(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertCarSchema = createInsertSchema(cars).omit({ 
  id: true,
  createdAt: true 
});

export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;