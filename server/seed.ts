import { db } from "./db";
import { clients, serviceTickets, documents, invoices, users, serviceItems, recurringTemplates } from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedUsers() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  const adminHash = await bcrypt.hash("admin123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  await db.insert(users).values([
    {
      username: "admin",
      password: adminHash,
      email: "admin@cctrucking.com",
      firstName: "CC",
      lastName: "Admin",
      role: "owner",
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

export async function seedDatabase() {
  await seedUsers();
  await seedServiceItems();
  await seedRecurringTemplates();

  const existingClients = await db.select().from(clients);
  if (existingClients.length > 0) return;

  const [c1, c2, c3, c4] = await db.insert(clients).values([
    {
      companyName: "Lone Star Freight LLC",
      contactName: "Marcus Johnson",
      email: "marcus@lonestarfreight.com",
      phone: "(214) 555-0187",
      dotNumber: "DOT-3845291",
      mcNumber: "MC-982145",
      einNumber: "75-4821930",
      address: "4520 Industrial Blvd",
      city: "Dallas",
      state: "TX",
      zipCode: "75247",
      status: "active",
      notes: "Long-haul carrier, 12 trucks. Priority client.",
    },
    {
      companyName: "Summit Logistics Inc",
      contactName: "Rachel Chen",
      email: "rachel@summitlogistics.net",
      phone: "(303) 555-0294",
      dotNumber: "DOT-2917384",
      mcNumber: "MC-743829",
      einNumber: "84-3719285",
      address: "890 Mountain View Dr",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      status: "active",
      notes: "Regional carrier, specializes in refrigerated goods.",
    },
    {
      companyName: "Atlantic Coast Transport",
      contactName: "David Williams",
      email: "david@atlanticcoast.com",
      phone: "(404) 555-0341",
      dotNumber: "DOT-4829175",
      mcNumber: "MC-291847",
      einNumber: "58-9281734",
      address: "2100 Peachtree Rd NE",
      city: "Atlanta",
      state: "GA",
      zipCode: "30309",
      status: "active",
      notes: "Flatbed and dry van fleet. 8 vehicles.",
    },
    {
      companyName: "Pacific Route Carriers",
      contactName: "Lisa Park",
      email: "lisa@pacificroute.com",
      phone: "(206) 555-0412",
      dotNumber: "DOT-5738291",
      mcNumber: "MC-483921",
      einNumber: "91-8374625",
      address: "750 Harbor Ave SW",
      city: "Seattle",
      state: "WA",
      zipCode: "98126",
      status: "prospect",
      notes: "New prospect, interested in quarterly tax services.",
    },
  ]).returning();

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

  console.log("Database seeded successfully.");
}

async function seedServiceItems() {
  const existing = await db.select().from(serviceItems);
  if (existing.length > 0) return;

  await db.insert(serviceItems).values([
    {
      name: "IFTA Quarterly Filing",
      description: "International Fuel Tax Agreement quarterly tax return preparation and filing for interstate carriers.",
      category: "Tax & Compliance",
      defaultPrice: "450.00",
    },
    {
      name: "MCS-150 Biennial Update",
      description: "Mandatory biennial update of motor carrier information with FMCSA.",
      category: "DOT Compliance",
      defaultPrice: "150.00",
    },
    {
      name: "UCR Annual Registration",
      description: "Unified Carrier Registration annual renewal for interstate operations.",
      category: "Registration",
      defaultPrice: "175.00",
    },
    {
      name: "Annual DOT Compliance Review",
      description: "Comprehensive annual review of DOT compliance documentation, driver files, and vehicle records.",
      category: "DOT Compliance",
      defaultPrice: "1250.00",
    },
    {
      name: "Business Entity Setup",
      description: "LLC formation, EIN application, and initial business structure setup for new trucking companies.",
      category: "Business Setup",
      defaultPrice: "1800.00",
    },
    {
      name: "Quarterly Tax Preparation",
      description: "Quarterly estimated tax calculation and filing for trucking businesses.",
      category: "Tax & Compliance",
      defaultPrice: "350.00",
    },
    {
      name: "Bookkeeping - Monthly Service",
      description: "Monthly bookkeeping service including bank reconciliation, expense categorization, and financial reporting.",
      category: "Bookkeeping",
      defaultPrice: "50.00",
    },
    {
      name: "Permit & Authority Filing",
      description: "Filing for operating authority, permits, and interstate carrier credentials.",
      category: "Registration",
      defaultPrice: "500.00",
    },
    {
      name: "Insurance Filing (Form E/H)",
      description: "Filing of insurance certificates and endorsements with FMCSA.",
      category: "DOT Compliance",
      defaultPrice: "125.00",
    },
    {
      name: "BOC-3 Process Agent Filing",
      description: "Designation of process agents (BOC-3) filing required for interstate carriers.",
      category: "Registration",
      defaultPrice: "75.00",
    },
  ]);
  console.log("Service catalog items seeded.");
}

async function seedRecurringTemplates() {
  const existing = await db.select().from(recurringTemplates);
  if (existing.length > 0) return;

  await db.insert(recurringTemplates).values([
    {
      name: "IFTA Quarterly Filing",
      serviceType: "IFTA Permit",
      description: "Quarterly IFTA tax return filing. Requires fuel receipts and mileage records.",
      priority: "high",
      frequencyType: "quarterly",
      daysBefore: 30,
      requiredDocuments: JSON.stringify(["Fuel Receipts", "Mileage Report"]),
    },
    {
      name: "UCR Annual Registration",
      serviceType: "UCR Registration",
      description: "Annual Unified Carrier Registration renewal.",
      priority: "medium",
      frequencyType: "annual",
      daysBefore: 60,
      requiredDocuments: JSON.stringify(["Current UCR Certificate"]),
    },
    {
      name: "MCS-150 Biennial Update",
      serviceType: "MCS-150 Update",
      description: "Biennial update of motor carrier census information.",
      priority: "medium",
      frequencyType: "biennial",
      daysBefore: 60,
      requiredDocuments: JSON.stringify(["Fleet Size Report", "Driver Count"]),
    },
    {
      name: "Annual DOT Compliance Review",
      serviceType: "DOT Permit",
      description: "Comprehensive annual DOT compliance audit and documentation review.",
      priority: "high",
      frequencyType: "annual",
      daysBefore: 45,
      requiredDocuments: JSON.stringify(["Insurance Certificate", "Vehicle Inspection Reports", "Driver Qualification Files"]),
    },
  ]);
  console.log("Recurring templates seeded.");
}
