import { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { drivers, driverDocuments, clients, vehicles, maintenanceRecords, insurancePolicies, complianceDeadlines, clientOnboarding, users } from "@shared/schema";
import { eq, and, desc, asc, lte, gte, sql } from "drizzle-orm";

const DQF_DOCUMENT_TYPES = [
  { key: "employment_application", label: "Employment Application", hasExpiration: false },
  { key: "mvr", label: "Motor Vehicle Record (MVR)", hasExpiration: true },
  { key: "medical_certificate", label: "Medical Examiner's Certificate", hasExpiration: true },
  { key: "road_test_certificate", label: "Road Test Certificate / CDL Equivalent", hasExpiration: false },
  { key: "safety_performance_history", label: "Safety Performance History (3 years)", hasExpiration: false },
  { key: "annual_driving_record_review", label: "Annual Review of Driving Record", hasExpiration: true },
  { key: "annual_violations_certification", label: "Annual Certification of Violations", hasExpiration: true },
  { key: "drug_alcohol_consent", label: "Drug & Alcohol Testing Consent", hasExpiration: false },
  { key: "clearinghouse_consent", label: "FMCSA Clearinghouse Consent & Query", hasExpiration: true },
  { key: "pre_employment_drug_test", label: "Pre-Employment Drug Test Result", hasExpiration: false },
  { key: "road_test_certificate_cdl", label: "Certificate of Road Test (or CDL in lieu)", hasExpiration: false },
  { key: "drivers_license_copy", label: "Driver's License Copy", hasExpiration: true },
];

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ADMIN_ROLES = ["admin", "owner", "tenant_admin", "tenant_owner", "platform_owner", "platform_admin"];
  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    (req as any).dbUser = dbUser;
    (req as any).tenantId = dbUser.tenantId;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).userId) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

export function registerDriverRoutes(app: Express) {

  app.get("/api/admin/dqf-document-types", isAuthenticated, isAdmin, (req, res) => {
    res.json(DQF_DOCUMENT_TYPES);
  });

  // ─── DRIVER COMPLIANCE DASHBOARD (must be before :id route) ────────
  app.get("/api/admin/drivers/compliance/summary", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allDrivers = await db.select().from(drivers).where(eq(drivers.tenantId, tenantId));
      const allDocs = await db.select().from(driverDocuments).where(eq(driverDocuments.tenantId, tenantId));
      const now = new Date();

      let totalCompliant = 0, totalExpiringSoon = 0, totalNonCompliant = 0;
      const expiringDocuments: any[] = [];

      for (const driver of allDrivers) {
        const driverDocs = allDocs.filter(d => d.driverId === driver.id);
        const uploaded = driverDocs.filter(d => d.status === "uploaded" || d.status === "valid").length;
        const expired = driverDocs.filter(d => d.expirationDate && new Date(d.expirationDate) < now).length;
        const expiring = driverDocs.filter(d => {
          if (!d.expirationDate) return false;
          const days = (new Date(d.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return days > 0 && days <= 30;
        });

        if (expired > 0 || uploaded < DQF_DOCUMENT_TYPES.length / 2) totalNonCompliant++;
        else if (expiring.length > 0) totalExpiringSoon++;
        else totalCompliant++;

        for (const doc of expiring) {
          expiringDocuments.push({
            driverId: driver.id,
            driverName: `${driver.firstName} ${driver.lastName}`,
            documentType: doc.documentType,
            expirationDate: doc.expirationDate,
            daysUntilExpiry: Math.ceil((new Date(doc.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      res.json({
        totalDrivers: allDrivers.length,
        compliant: totalCompliant,
        expiringSoon: totalExpiringSoon,
        nonCompliant: totalNonCompliant,
        expiringDocuments: expiringDocuments.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── DRIVERS CRUD ───────────────────────────────────────────────────
  app.get("/api/admin/drivers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allDrivers = await db.select().from(drivers)
        .where(eq(drivers.tenantId, tenantId))
        .orderBy(desc(drivers.createdAt));

      const driverIds = allDrivers.map(d => d.id);
      let docs: any[] = [];
      if (driverIds.length > 0) {
        docs = await db.select().from(driverDocuments)
          .where(eq(driverDocuments.tenantId, tenantId));
      }

      const clientIds = [...new Set(allDrivers.map(d => d.clientId))];
      let clientMap: Record<string, any> = {};
      if (clientIds.length > 0) {
        const allClients = await db.select().from(clients)
          .where(eq(clients.tenantId, tenantId));
        for (const c of allClients) {
          clientMap[c.id] = c;
        }
      }

      const now = new Date();
      const result = allDrivers.map(driver => {
        const driverDocs = docs.filter(d => d.driverId === driver.id);
        const totalRequired = DQF_DOCUMENT_TYPES.length;
        const uploaded = driverDocs.filter(d => d.status === "uploaded" || d.status === "valid").length;
        const expiringSoon = driverDocs.filter(d => {
          if (!d.expirationDate) return false;
          const exp = new Date(d.expirationDate);
          const daysUntil = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntil > 0 && daysUntil <= 30;
        }).length;
        const expired = driverDocs.filter(d => {
          if (!d.expirationDate) return false;
          return new Date(d.expirationDate) < now;
        }).length;
        const missing = totalRequired - uploaded;

        let complianceStatus = "compliant";
        if (expired > 0 || missing > uploaded) complianceStatus = "non_compliant";
        else if (expiringSoon > 0) complianceStatus = "expiring_soon";

        return {
          ...driver,
          client: clientMap[driver.clientId] || null,
          compliance: { totalRequired, uploaded, expiringSoon, expired, missing, status: complianceStatus },
          documents: driverDocs,
        };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/drivers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [driver] = await db.select().from(drivers)
        .where(and(eq(drivers.id, req.params.id), eq(drivers.tenantId, tenantId)));
      if (!driver) return res.status(404).json({ message: "Driver not found" });

      const [client] = await db.select().from(clients).where(and(eq(clients.id, driver.clientId), eq(clients.tenantId, tenantId)));
      const docs = await db.select().from(driverDocuments)
        .where(and(eq(driverDocuments.driverId, driver.id), eq(driverDocuments.tenantId, tenantId)));

      const now = new Date();
      const docsByType = DQF_DOCUMENT_TYPES.map(dtype => {
        const doc = docs.find(d => d.documentType === dtype.key);
        let status = "missing";
        let daysUntilExpiry: number | null = null;
        if (doc) {
          if (doc.expirationDate) {
            const exp = new Date(doc.expirationDate);
            daysUntilExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry < 0) status = "expired";
            else if (daysUntilExpiry <= 30) status = "expiring_soon";
            else status = "valid";
          } else {
            status = "valid";
          }
        }
        return {
          ...dtype,
          document: doc || null,
          status,
          daysUntilExpiry,
        };
      });

      res.json({ ...driver, client, documents: docsByType });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/drivers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { firstName, lastName, email, phone, cdlNumber, cdlState, cdlClass, cdlExpiration, dateOfBirth, dateOfHire, clientId, notes } = req.body;
      if (!firstName || !lastName || !clientId) {
        return res.status(400).json({ message: "First name, last name, and carrier are required" });
      }
      const [ownerCheck] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
      if (!ownerCheck) return res.status(403).json({ message: "Client does not belong to your tenant" });
      const [driver] = await db.insert(drivers).values({
        clientId, firstName, lastName, email, phone, cdlNumber, cdlState, cdlClass,
        cdlExpiration: cdlExpiration ? new Date(cdlExpiration) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        dateOfHire: dateOfHire ? new Date(dateOfHire) : null,
        notes, tenantId,
      }).returning();
      res.json(driver);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/drivers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const data: any = { ...req.body, updatedAt: new Date() };
      if (data.cdlExpiration) data.cdlExpiration = new Date(data.cdlExpiration);
      if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
      if (data.dateOfHire) data.dateOfHire = new Date(data.dateOfHire);
      delete data.id; delete data.tenantId; delete data.createdAt;
      const [updated] = await db.update(drivers).set(data)
        .where(and(eq(drivers.id, req.params.id), eq(drivers.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Driver not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/drivers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      await db.delete(driverDocuments).where(and(eq(driverDocuments.driverId, req.params.id), eq(driverDocuments.tenantId, tenantId)));
      const [deleted] = await db.delete(drivers)
        .where(and(eq(drivers.id, req.params.id), eq(drivers.tenantId, tenantId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Driver not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── DRIVER DOCUMENTS ──────────────────────────────────────────────
  app.post("/api/admin/drivers/:driverId/documents", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { documentType, fileName, fileData, expirationDate, issuedDate, notes } = req.body;
      const [existing] = await db.select().from(driverDocuments)
        .where(and(
          eq(driverDocuments.driverId, req.params.driverId),
          eq(driverDocuments.documentType, documentType),
          eq(driverDocuments.tenantId, tenantId)
        ));

      if (existing) {
        const [updated] = await db.update(driverDocuments).set({
          fileName, fileData, status: "uploaded",
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          issuedDate: issuedDate ? new Date(issuedDate) : null,
          notes, uploadedBy: (req as any).dbUser?.id, updatedAt: new Date(),
        }).where(eq(driverDocuments.id, existing.id)).returning();
        return res.json(updated);
      }

      const [doc] = await db.insert(driverDocuments).values({
        driverId: req.params.driverId, documentType, fileName, fileData, status: "uploaded",
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        notes, uploadedBy: (req as any).dbUser?.id, tenantId,
      }).returning();
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/drivers/:driverId/documents/:docId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [deleted] = await db.delete(driverDocuments)
        .where(and(eq(driverDocuments.id, req.params.docId), eq(driverDocuments.tenantId, tenantId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Document not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── VEHICLES CRUD ─────────────────────────────────────────────────
  app.get("/api/admin/vehicles", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allVehicles = await db.select().from(vehicles)
        .where(eq(vehicles.tenantId, tenantId))
        .orderBy(desc(vehicles.createdAt));
      const allClients = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
      const clientMap: Record<string, any> = {};
      for (const c of allClients) clientMap[c.id] = c;
      res.json(allVehicles.map(v => ({ ...v, client: clientMap[v.clientId] || null })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/vehicles", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (req.body.clientId) {
        const [ownerCheck] = await db.select().from(clients).where(and(eq(clients.id, req.body.clientId), eq(clients.tenantId, tenantId)));
        if (!ownerCheck) return res.status(403).json({ message: "Client does not belong to your tenant" });
      }
      const data = { ...req.body, tenantId };
      if (data.lastInspectionDate) data.lastInspectionDate = new Date(data.lastInspectionDate);
      if (data.nextInspectionDue) data.nextInspectionDue = new Date(data.nextInspectionDue);
      const [vehicle] = await db.insert(vehicles).values(data).returning();
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/vehicles/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const data: any = { ...req.body, updatedAt: new Date() };
      if (data.lastInspectionDate) data.lastInspectionDate = new Date(data.lastInspectionDate);
      if (data.nextInspectionDue) data.nextInspectionDue = new Date(data.nextInspectionDue);
      delete data.id; delete data.tenantId; delete data.createdAt;
      const [updated] = await db.update(vehicles).set(data)
        .where(and(eq(vehicles.id, req.params.id), eq(vehicles.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Vehicle not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/vehicles/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      await db.delete(maintenanceRecords).where(and(eq(maintenanceRecords.vehicleId, req.params.id), eq(maintenanceRecords.tenantId, tenantId)));
      const [deleted] = await db.delete(vehicles)
        .where(and(eq(vehicles.id, req.params.id), eq(vehicles.tenantId, tenantId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Vehicle not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── MAINTENANCE RECORDS ───────────────────────────────────────────
  app.get("/api/admin/vehicles/:vehicleId/maintenance", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const records = await db.select().from(maintenanceRecords)
        .where(and(eq(maintenanceRecords.vehicleId, req.params.vehicleId), eq(maintenanceRecords.tenantId, tenantId)))
        .orderBy(desc(maintenanceRecords.serviceDate));
      res.json(records.map(r => ({ ...r, serviceType: r.recordType })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/vehicles/:vehicleId/maintenance", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [vehicle] = await db.select().from(vehicles)
        .where(and(eq(vehicles.id, req.params.vehicleId), eq(vehicles.tenantId, tenantId)));
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

      const { serviceType, description, serviceDate, nextServiceDue, mileage, cost, vendor, notes } = req.body;
      const [record] = await db.insert(maintenanceRecords).values({
        vehicleId: req.params.vehicleId,
        recordType: serviceType || "Other",
        description: description || serviceType || "Maintenance",
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
        mileage: mileage ? parseInt(mileage) : null,
        cost: cost || null,
        vendor: vendor || null,
        notes,
        tenantId,
      }).returning();
      res.json({ ...record, serviceType: record.recordType });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── INSURANCE POLICIES ────────────────────────────────────────────
  app.get("/api/admin/insurance", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const policies = await db.select().from(insurancePolicies)
        .where(eq(insurancePolicies.tenantId, tenantId))
        .orderBy(desc(insurancePolicies.createdAt));
      const allClients = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
      const clientMap: Record<string, any> = {};
      for (const c of allClients) clientMap[c.id] = c;
      res.json(policies.map(p => ({ ...p, client: clientMap[p.clientId] || null })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/insurance", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (req.body.clientId) {
        const [ownerCheck] = await db.select().from(clients).where(and(eq(clients.id, req.body.clientId), eq(clients.tenantId, tenantId)));
        if (!ownerCheck) return res.status(403).json({ message: "Client does not belong to your tenant" });
      }
      const data = { ...req.body, tenantId };
      if (data.effectiveDate) data.effectiveDate = new Date(data.effectiveDate);
      if (data.expirationDate) data.expirationDate = new Date(data.expirationDate);
      const [policy] = await db.insert(insurancePolicies).values(data).returning();
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/insurance/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const data: any = { ...req.body, updatedAt: new Date() };
      if (data.effectiveDate) data.effectiveDate = new Date(data.effectiveDate);
      if (data.expirationDate) data.expirationDate = new Date(data.expirationDate);
      delete data.id; delete data.tenantId; delete data.createdAt;
      const [updated] = await db.update(insurancePolicies).set(data)
        .where(and(eq(insurancePolicies.id, req.params.id), eq(insurancePolicies.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Policy not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/insurance/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [deleted] = await db.delete(insurancePolicies)
        .where(and(eq(insurancePolicies.id, req.params.id), eq(insurancePolicies.tenantId, tenantId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Policy not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── COMPLIANCE DEADLINES / CALENDAR ───────────────────────────────
  app.get("/api/admin/compliance-calendar", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const deadlines = await db.select().from(complianceDeadlines)
        .where(eq(complianceDeadlines.tenantId, tenantId))
        .orderBy(asc(complianceDeadlines.dueDate));
      const allClients = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
      const clientMap: Record<string, any> = {};
      for (const c of allClients) clientMap[c.id] = c;

      const now = new Date();
      const result = deadlines.map(d => {
        const daysUntil = Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let urgency = "green";
        if (daysUntil < 0) urgency = "red";
        else if (daysUntil <= 7) urgency = "orange";
        else if (daysUntil <= 30) urgency = "yellow";
        return { ...d, client: clientMap[d.clientId] || null, daysUntil, urgency };
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/compliance-calendar", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (req.body.clientId) {
        const [ownerCheck] = await db.select().from(clients).where(and(eq(clients.id, req.body.clientId), eq(clients.tenantId, tenantId)));
        if (!ownerCheck) return res.status(403).json({ message: "Client does not belong to your tenant" });
      }
      const data = { ...req.body, tenantId };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.completedAt) data.completedAt = new Date(data.completedAt);
      const [deadline] = await db.insert(complianceDeadlines).values(data).returning();
      res.json(deadline);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/compliance-calendar/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const data: any = { ...req.body, updatedAt: new Date() };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.completedAt) data.completedAt = new Date(data.completedAt);
      delete data.id; delete data.tenantId; delete data.createdAt;
      const [updated] = await db.update(complianceDeadlines).set(data)
        .where(and(eq(complianceDeadlines.id, req.params.id), eq(complianceDeadlines.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Deadline not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/compliance-calendar/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [deleted] = await db.delete(complianceDeadlines)
        .where(and(eq(complianceDeadlines.id, req.params.id), eq(complianceDeadlines.tenantId, tenantId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Deadline not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/compliance-calendar/auto-generate", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { clientId } = req.body;
      const [client] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
      if (!client) return res.status(404).json({ message: "Client not found" });

      const now = new Date();
      const year = now.getFullYear();
      const deadlinesToCreate = [];

      deadlinesToCreate.push(
        { title: `UCR Annual Registration — ${client.companyName}`, deadlineType: "ucr_annual", dueDate: new Date(year, 11, 31), clientId, tenantId, autoGenerated: true, description: "Annual UCR registration due" },
        { title: `IFTA Q1 Return — ${client.companyName}`, deadlineType: "ifta_quarterly", dueDate: new Date(year, 3, 30), clientId, tenantId, autoGenerated: true, description: "IFTA Q1 quarterly return due" },
        { title: `IFTA Q2 Return — ${client.companyName}`, deadlineType: "ifta_quarterly", dueDate: new Date(year, 6, 31), clientId, tenantId, autoGenerated: true, description: "IFTA Q2 quarterly return due" },
        { title: `IFTA Q3 Return — ${client.companyName}`, deadlineType: "ifta_quarterly", dueDate: new Date(year, 9, 31), clientId, tenantId, autoGenerated: true, description: "IFTA Q3 quarterly return due" },
        { title: `IFTA Q4 Return — ${client.companyName}`, deadlineType: "ifta_quarterly", dueDate: new Date(year + 1, 0, 31), clientId, tenantId, autoGenerated: true, description: "IFTA Q4 quarterly return due" },
        { title: `Form 2290 HVUT — ${client.companyName}`, deadlineType: "hvut_2290", dueDate: new Date(year, 7, 31), clientId, tenantId, autoGenerated: true, description: "Annual heavy vehicle use tax due" },
      );

      if (client.dotNumber) {
        const lastDigit = parseInt(client.dotNumber.replace(/\D/g, "").slice(-1));
        const mcsMonth = lastDigit === 0 ? 10 : lastDigit;
        deadlinesToCreate.push({
          title: `MCS-150 Biennial Update — ${client.companyName}`,
          deadlineType: "mcs150_biennial",
          dueDate: new Date(year, mcsMonth - 1, 28),
          clientId, tenantId, autoGenerated: true,
          description: `Biennial MCS-150 update (based on USDOT last digit: ${lastDigit})`,
        });
      }

      const existing = await db.select().from(complianceDeadlines)
        .where(and(eq(complianceDeadlines.clientId, clientId), eq(complianceDeadlines.tenantId, tenantId), eq(complianceDeadlines.autoGenerated, true)));

      let created = 0;
      for (const deadline of deadlinesToCreate) {
        const exists = existing.find(e => e.deadlineType === deadline.deadlineType && new Date(e.dueDate).getFullYear() === new Date(deadline.dueDate).getFullYear());
        if (!exists) {
          await db.insert(complianceDeadlines).values(deadline);
          created++;
        }
      }

      res.json({ created, total: deadlinesToCreate.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── CLIENT ONBOARDING ─────────────────────────────────────────────
  const ONBOARDING_STEPS = [
    { step: 1, title: "Company Information", description: "Legal name, DBA, EIN, address" },
    { step: 2, title: "USDOT Number", description: "Application or existing USDOT number" },
    { step: 3, title: "Operating Authority", description: "MC number / OP-1 filing ($300 fee)" },
    { step: 4, title: "BOC-3 Filing", description: "Process agent designation" },
    { step: 5, title: "Insurance Requirements", description: "Auto liability, cargo, general liability" },
    { step: 6, title: "Drug & Alcohol Program", description: "Testing program enrollment" },
    { step: 7, title: "ELD Selection & Setup", description: "Electronic logging device" },
    { step: 8, title: "UCR Registration", description: "Unified Carrier Registration" },
    { step: 9, title: "IFTA/IRP Registration", description: "Interstate fuel tax & registration" },
    { step: 10, title: "First Driver DQF", description: "Driver qualification file setup" },
  ];

  app.get("/api/admin/onboarding", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const records = await db.select().from(clientOnboarding)
        .where(eq(clientOnboarding.tenantId, tenantId))
        .orderBy(desc(clientOnboarding.createdAt));
      const allClients = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
      const clientMap: Record<string, any> = {};
      for (const c of allClients) clientMap[c.id] = c;
      res.json(records.map(r => ({ ...r, client: clientMap[r.clientId] || null })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/onboarding", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { clientId } = req.body;
      const [ownerCheck] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
      if (!ownerCheck) return res.status(403).json({ message: "Client does not belong to your tenant" });
      const steps = ONBOARDING_STEPS.map(s => ({ ...s, status: "pending", completedAt: null, notes: "" }));
      const [record] = await db.insert(clientOnboarding).values({
        clientId, steps, currentStep: 1, tenantId,
      }).returning();
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/onboarding/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const data: any = { ...req.body, updatedAt: new Date() };
      if (data.completedAt) data.completedAt = new Date(data.completedAt);
      delete data.id; delete data.tenantId; delete data.createdAt; delete data.status;
      const [updated] = await db.update(clientOnboarding).set(data)
        .where(and(eq(clientOnboarding.id, req.params.id), eq(clientOnboarding.tenantId, tenantId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Onboarding record not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/onboarding/steps", isAuthenticated, isAdmin, (req, res) => {
    res.json(ONBOARDING_STEPS);
  });
}
