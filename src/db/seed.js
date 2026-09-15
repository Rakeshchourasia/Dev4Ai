import dotenv from "dotenv";
dotenv.config();

import { db } from "./index.js";
import { users } from "./schema/users.schema.js";
import { companies } from "./schema/companies.schema.js";
import { squads } from "./schema/squads.schema.js";
import { squadMembers } from "./schema/squadMembers.schema.js";
import { sprints } from "./schema/sprints.schema.js";
import { tickets } from "./schema/tickets.schema.js";
import { activityLogs } from "./schema/activityLogs.schema.js";
import { hashPassword } from "../shared/utils/password.js";
import { eq, and } from "drizzle-orm";

export async function seed() {
  console.log("🌱 Starting database seeding...");

  // ==========================================
  // 1. SEED USERS
  // ==========================================
  const adminPasswordHash = await hashPassword("Admin@123");
  const memberPasswordHash = await hashPassword("Member@123");

  let [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@dev4ai.com"))
    .limit(1);

  if (!adminUser) {
    [adminUser] = await db
      .insert(users)
      .values({
        name: "Admin User",
        email: "admin@dev4ai.com",
        password: adminPasswordHash,
        role: "ADMIN",
      })
      .returning();
    console.log("  ✓ Created Admin: admin@dev4ai.com");
  } else {
    console.log("  ℹ Admin already exists: admin@dev4ai.com");
  }

  let [memberUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "member@dev4ai.com"))
    .limit(1);

  if (!memberUser) {
    [memberUser] = await db
      .insert(users)
      .values({
        name: "Alice Developer",
        email: "member@dev4ai.com",
        password: memberPasswordHash,
        role: "MEMBER",
      })
      .returning();
    console.log("  ✓ Created Member 1: member@dev4ai.com");
  } else {
    console.log("  ℹ Member 1 already exists: member@dev4ai.com");
  }

  let [memberUser2] = await db
    .select()
    .from(users)
    .where(eq(users.email, "member2@dev4ai.com"))
    .limit(1);

  if (!memberUser2) {
    [memberUser2] = await db
      .insert(users)
      .values({
        name: "Bob Engineer",
        email: "member2@dev4ai.com",
        password: memberPasswordHash,
        role: "MEMBER",
      })
      .returning();
    console.log("  ✓ Created Member 2: member2@dev4ai.com");
  } else {
    console.log("  ℹ Member 2 already exists: member2@dev4ai.com");
  }

  // ==========================================
  // 2. SEED COMPANY
  // ==========================================
  let [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.name, "Dev4AI Technologies"))
    .limit(1);

  if (!company) {
    [company] = await db
      .insert(companies)
      .values({
        name: "Dev4AI Technologies",
      })
      .returning();
    console.log("  ✓ Created Company: Dev4AI Technologies");
  } else {
    console.log("  ℹ Company already exists: Dev4AI Technologies");
  }

  // ==========================================
  // 3. SEED SQUAD
  // ==========================================
  let [squad] = await db
    .select()
    .from(squads)
    .where(
      and(
        eq(squads.companyId, company.id),
        eq(squads.name, "Core Platform")
      )
    )
    .limit(1);

  if (!squad) {
    [squad] = await db
      .insert(squads)
      .values({
        companyId: company.id,
        name: "Core Platform",
      })
      .returning();
    console.log("  ✓ Created Squad: Core Platform");
  } else {
    console.log("  ℹ Squad already exists: Core Platform");
  }

  // ==========================================
  // 4. SEED SQUAD MEMBERS
  // ==========================================
  const memberEntries = [
    { squadId: squad.id, userId: adminUser.id },
    { squadId: squad.id, userId: memberUser.id },
    { squadId: squad.id, userId: memberUser2.id },
  ];

  for (const entry of memberEntries) {
    const [existing] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, entry.squadId),
          eq(squadMembers.userId, entry.userId)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(squadMembers).values(entry);
      console.log(`  ✓ Added User (${entry.userId}) to Squad (${entry.squadId})`);
    }
  }

  // ==========================================
  // 5. SEED SPRINT
  // ==========================================
  let [sprint] = await db
    .select()
    .from(sprints)
    .where(
      and(
        eq(sprints.squadId, squad.id),
        eq(sprints.name, "Sprint 1")
      )
    )
    .limit(1);

  if (!sprint) {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days later

    [sprint] = await db
      .insert(sprints)
      .values({
        squadId: squad.id,
        name: "Sprint 1",
        startDate,
        endDate,
        status: "ACTIVE",
      })
      .returning();
    console.log("  ✓ Created Sprint: Sprint 1 (ACTIVE)");
  } else {
    console.log("  ℹ Sprint already exists: Sprint 1");
  }

  // ==========================================
  // 6. SEED TICKETS
  // ==========================================
  const seedTickets = [
    {
      squadId: squad.id,
      sprintId: sprint.id,
      title: "Set up PostgreSQL and Drizzle schema",
      description: "Define all database tables with proper relationships and indexes",
      status: "DONE",
      priority: "HIGH",
      createdBy: adminUser.id,
      assignedTo: memberUser.id,
    },
    {
      squadId: squad.id,
      sprintId: sprint.id,
      title: "Implement Authentication Module",
      description: "JWT access and refresh tokens, bcrypt password hashing",
      status: "DONE",
      priority: "URGENT",
      createdBy: adminUser.id,
      assignedTo: memberUser.id,
    },
    {
      squadId: squad.id,
      sprintId: sprint.id,
      title: "Build Dashboard Summary Aggregations",
      description: "Provide company and squad level metrics for tickets and sprints",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      createdBy: adminUser.id,
      assignedTo: memberUser2.id,
    },
    {
      squadId: squad.id,
      sprintId: sprint.id,
      title: "Write End-to-End Test Suite",
      description: "Comprehensive verification of all 28 requirements",
      status: "TODO",
      priority: "HIGH",
      createdBy: adminUser.id,
      assignedTo: memberUser2.id,
    },
  ];

  for (const t of seedTickets) {
    const [existing] = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.squadId, t.squadId),
          eq(tickets.title, t.title)
        )
      )
      .limit(1);

    if (!existing) {
      const [inserted] = await db.insert(tickets).values(t).returning();
      console.log(`  ✓ Created Ticket: "${t.title}" (${t.status})`);

      // Seed activity log for this ticket
      await db.insert(activityLogs).values({
        userId: adminUser.id,
        action: "TICKET_CREATED",
        entityType: "TICKET",
        entityId: inserted.id,
        squadId: squad.id,
        sprintId: sprint.id,
        ticketId: inserted.id,
        description: `Ticket "${inserted.title}" created during seeding`,
      });
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

// Allow direct execution
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/db/seed.js")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
