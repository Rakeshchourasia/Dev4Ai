import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MEMBER",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  email: varchar("email", {
    length: 255,
  }).notNull(),

  password: varchar("password", {
    length: 255,
  }).notNull(),

  role: userRoleEnum("role")
    .default("MEMBER")
    .notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});