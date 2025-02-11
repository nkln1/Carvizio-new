import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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