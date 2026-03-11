import { db } from "./db";
import { clients, serviceTickets, documents, invoices, users, serviceItems, recurringTemplates, transactionCategories, customFieldDefinitions, customFieldValues } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { truckingServiceItems, truckingTransactionCategories, truckingRecurringTemplates, truckingSampleClients, truckingCustomFieldDefinitions } from "./industry-packs/trucking-seed-data";

async function seedUsers() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  const platformHash = await bcrypt.hash("platform123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  await db.insert(users).values([
    {
      id: "platform-owner-001",
      username: "platformadmin",
      password: platformHash,
      email: "admin@carrierdeskhq.com",
      firstName: "Platform",
      lastName: "Owner",
      role: "platform_owner",
    },
    {
      username: "admin",
      password: adminHash,
      email: "admin@cctrucking.com",
      firstName: "CC",
      lastName: "Admin",
      role: "tenant_owner",
    },
    {
      username: "staff",
      password: staffHash,
      email: "staff@cctrucking.com",
      firstName: "Staff",
      lastName: "Member",
      role: "admin",
    },
  ]);
  console.log("Default users seeded.");
}

async function seedTransactionCategories() {
  const existing = await db.select().from(transactionCategories);
  if (existing.length > 0) return;

  await db.insert(transactionCategories).values(truckingTransactionCategories);
  console.log("Transaction categories seeded.");
}

async function ensurePlatformOwner() {
  const [existing] = await db.select().from(users).where(eq(users.username, "platformadmin"));
  if (existing) return;

  const platformHash = await bcrypt.hash("platform123", 10);
  await db.insert(users).values({
    id: "platform-owner-001",
    username: "platformadmin",
    password: platformHash,
    email: "admin@carrierdeskhq.com",
    firstName: "Platform",
    lastName: "Owner",
    role: "platform_owner",
  });
  console.log("Platform owner user created.");
}

async function migrateLegacyAdminRole() {
  const [adminUser] = await db.select().from(users).where(eq(users.username, "admin"));
  if (adminUser && adminUser.role === "platform_owner") {
    await db.update(users).set({ role: "tenant_owner" }).where(eq(users.id, adminUser.id));
    console.log("Admin user migrated from platform_owner to tenant_owner.");
  }
}

export async function seedDatabase() {
  await seedUsers();
  await ensurePlatformOwner();
  await migrateLegacyAdminRole();
  await seedServiceItems();
  await seedRecurringTemplates();
  await seedTransactionCategories();
  await seedCustomFieldDefinitions();

  const existingClients = await db.select().from(clients);
  if (existingClients.length > 0) {
    await migrateClientDataToCustomFields();
    return;
  }

  const [c1, c2, c3, c4] = await db.insert(clients).values(truckingSampleClients).returning();

  const now = new Date();
  const futureDate = (days: number) => new Date(now.getTime() + days * 86400000);
  const pastDate = (days: number) => new Date(now.getTime() - days * 86400000);

  const [t1, t2, t3, t4, t5] = await db.insert(serviceTickets).values([
    {
      clientId: c1.id,
      title: "Q1 2026 IFTA Filing",
      serviceType: "IFTA Permit",
      status: "in_progress",
      priority: "high",
      description: "Quarterly IFTA tax return for Q1 2026. Need fuel receipts and mileage records.",
      dueDate: futureDate(14),
      assignedTo: "Sarah Mitchell",
    },
    {
      clientId: c1.id,
      title: "MCS-150 Biennial Update",
      serviceType: "MCS-150 Update",
      status: "open",
      priority: "medium",
      description: "Biennial update due for Lone Star Freight. Verify fleet size and driver count.",
      dueDate: futureDate(45),
      assignedTo: "James Cooper",
    },
    {
      clientId: c2.id,
      title: "Annual DOT Compliance Review",
      serviceType: "DOT Permit",
      status: "open",
      priority: "high",
      description: "Annual DOT compliance audit and documentation review for Summit Logistics.",
      dueDate: futureDate(30),
      assignedTo: "Sarah Mitchell",
    },
    {
      clientId: c3.id,
      title: "Business Entity Setup",
      serviceType: "Business Setup",
      status: "completed",
      priority: "medium",
      description: "LLC formation and EIN application completed for Atlantic Coast Transport.",
      dueDate: pastDate(10),
      assignedTo: "James Cooper",
    },
    {
      clientId: c2.id,
      title: "UCR Annual Registration",
      serviceType: "UCR Registration",
      status: "open",
      priority: "low",
      description: "Unified Carrier Registration renewal for 2026.",
      dueDate: futureDate(60),
      assignedTo: "Sarah Mitchell",
    },
  ]).returning();

  await db.insert(documents).values([
    {
      clientId: c1.id,
      ticketId: t1.id,
      name: "Q1 2026 Fuel Receipts",
      type: "Fuel Records",
      status: "approved",
    },
    {
      clientId: c1.id,
      ticketId: t1.id,
      name: "Q1 2026 Mileage Report",
      type: "Mileage Report",
      status: "pending",
    },
    {
      clientId: c2.id,
      ticketId: t3.id,
      name: "Insurance Certificate 2026",
      type: "Insurance Certificate",
      status: "approved",
    },
    {
      clientId: c2.id,
      ticketId: t3.id,
      name: "DOT Registration Copy",
      type: "DOT Registration",
      status: "approved",
    },
    {
      clientId: c3.id,
      ticketId: t4.id,
      name: "EIN Letter - Atlantic Coast",
      type: "EIN Letter",
      status: "approved",
    },
    {
      clientId: c3.id,
      ticketId: t4.id,
      name: "Operating Agreement Draft",
      type: "Operating Agreement",
      status: "pending",
    },
    {
      clientId: c1.id,
      name: "Power of Attorney Form",
      type: "Power of Attorney",
      status: "pending",
    },
  ]);

  await db.insert(invoices).values([
    {
      clientId: c1.id,
      ticketId: t1.id,
      invoiceNumber: "INV-2026-001",
      amount: "1250.00",
      status: "sent",
      dueDate: futureDate(30),
      description: "Q1 2026 IFTA Filing Service",
    },
    {
      clientId: c1.id,
      ticketId: t2.id,
      invoiceNumber: "INV-2026-002",
      amount: "350.00",
      status: "draft",
      dueDate: futureDate(45),
      description: "MCS-150 Biennial Update Service",
    },
    {
      clientId: c2.id,
      ticketId: t3.id,
      invoiceNumber: "INV-2026-003",
      amount: "2500.00",
      status: "sent",
      dueDate: futureDate(15),
      description: "Annual DOT Compliance Review",
    },
    {
      clientId: c3.id,
      ticketId: t4.id,
      invoiceNumber: "INV-2025-048",
      amount: "1800.00",
      status: "paid",
      dueDate: pastDate(20),
      paidDate: pastDate(5),
      description: "Business Entity Setup - LLC Formation",
    },
    {
      clientId: c2.id,
      ticketId: t5.id,
      invoiceNumber: "INV-2026-004",
      amount: "175.00",
      status: "draft",
      dueDate: futureDate(60),
      description: "UCR Annual Registration Service",
    },
    {
      clientId: c1.id,
      invoiceNumber: "INV-2025-042",
      amount: "950.00",
      status: "overdue",
      dueDate: pastDate(15),
      description: "Q4 2025 Quarterly Tax Preparation",
    },
  ]);

  await migrateClientDataToCustomFields();

  console.log("Database seeded successfully.");
}

async function seedServiceItems() {
  const existing = await db.select().from(serviceItems);
  if (existing.length > 0) return;

  await db.insert(serviceItems).values(truckingServiceItems);
  console.log("Service catalog items seeded.");
}

async function seedRecurringTemplates() {
  const existing = await db.select().from(recurringTemplates);
  if (existing.length > 0) return;

  await db.insert(recurringTemplates).values(truckingRecurringTemplates);
  console.log("Recurring templates seeded.");
}

async function seedCustomFieldDefinitions() {
  const existing = await db.select().from(customFieldDefinitions);
  const truckingFields = existing.filter(f => f.industryPackSource === "trucking");
  if (truckingFields.length >= truckingCustomFieldDefinitions.length) return;

  for (const fieldDef of truckingCustomFieldDefinitions) {
    const alreadyExists = existing.find(f => f.name === fieldDef.name && f.industryPackSource === "trucking");
    if (!alreadyExists) {
      await db.insert(customFieldDefinitions).values(fieldDef);
    }
  }
  console.log("Trucking custom field definitions seeded.");
}

async function migrateClientDataToCustomFields() {
  const definitions = await db.select().from(customFieldDefinitions);
  const dotDef = definitions.find(d => d.name === "dotNumber" && d.industryPackSource === "trucking");
  const mcDef = definitions.find(d => d.name === "mcNumber" && d.industryPackSource === "trucking");
  const einDef = definitions.find(d => d.name === "einNumber" && d.industryPackSource === "trucking");

  if (!dotDef || !mcDef || !einDef) return;

  const allClients = await db.select().from(clients);
  const existingValues = await db.select().from(customFieldValues);

  for (const client of allClients) {
    const fieldMap: Array<{ def: typeof dotDef; value: string | null }> = [
      { def: dotDef, value: client.dotNumber },
      { def: mcDef, value: client.mcNumber },
      { def: einDef, value: client.einNumber },
    ];

    for (const { def, value } of fieldMap) {
      if (!value) continue;
      const alreadyExists = existingValues.find(
        v => v.fieldDefinitionId === def.id && v.entityId === client.id && v.entityType === "client"
      );
      if (!alreadyExists) {
        await db.insert(customFieldValues).values({
          fieldDefinitionId: def.id,
          entityType: "client",
          entityId: client.id,
          value,
        });
      }
    }
  }
  console.log("Client DOT/MC/EIN data migrated to custom field values.");
}
