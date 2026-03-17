import { db } from "./db";
import { emailMessages, emailCampaigns, emailAutomations, emailTemplates, clients, invoices } from "@shared/schema";
import { eq, and, lte, gte, sql, desc } from "drizzle-orm";
import { resolveMergeTokens } from "./sms-service";
import { storage } from "./storage";
import { brandingConfig } from "./branding-config";
import nodemailer from "nodemailer";

let _cachedTransporter: nodemailer.Transporter | null = null;
let _cachedConfigHash: string | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const config = await storage.getPlatformEmailConfig();
  const smtpUser = config?.smtpUser || process.env.SMTP_EMAIL;
  const smtpPass = config?.smtpPass || process.env.SMTP_PASSWORD;
  const smtpHost = config?.smtpHost || "smtp.office365.com";
  const smtpPort = config?.smtpPort || 587;
  const smtpSecure = config?.smtpSecure || false;

  if (!smtpUser || !smtpPass) return null;

  const configHash = `${smtpHost}:${smtpPort}:${smtpUser}:${smtpSecure}`;
  if (_cachedTransporter && _cachedConfigHash === configHash) {
    return _cachedTransporter;
  }

  _cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    requireTLS: !smtpSecure,
  });
  _cachedConfigHash = configHash;
  return _cachedTransporter;
}

async function getTenantBranding(tenantId: string) {
  const b = await storage.getTenantBrandingByTenantId(tenantId);
  return {
    companyName: b?.companyName || brandingConfig.companyName,
    tagline: b?.tagline || brandingConfig.tagline,
    primaryColor: b?.primaryColor || brandingConfig.primaryColor,
    supportEmail: b?.supportEmail || brandingConfig.contactEmail,
  };
}

function wrapEmailHtml(branding: { companyName: string; tagline: string; primaryColor: string }, subject: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background-color: ${branding.primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${branding.companyName}</h1>
        <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 13px;">${subject || branding.tagline}</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
        ${bodyHtml}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Thank you for your business!<br />
          ${branding.companyName}
        </p>
      </div>
    </div>
  `;
}

export async function sendCampaignEmail(
  tenantId: string,
  toEmail: string,
  subject: string,
  bodyHtml: string,
  options?: { campaignId?: string; automationId?: string; clientId?: string }
): Promise<{ success: boolean; error?: string }> {
  const branding = await getTenantBranding(tenantId);

  const [msgRecord] = await db.insert(emailMessages).values({
    tenantId,
    toEmail,
    subject,
    bodyHtml,
    campaignId: options?.campaignId || null,
    automationId: options?.automationId || null,
    clientId: options?.clientId || null,
    status: "queued",
  }).returning();

  const transporter = await getTransporter();
  if (!transporter) {
    await db.update(emailMessages)
      .set({ status: "failed", errorMessage: "Email not configured - SMTP credentials not set" })
      .where(eq(emailMessages.id, msgRecord.id));
    return { success: false, error: "Email service not configured" };
  }

  try {
    const config = await storage.getPlatformEmailConfig();
    const fromEmail = config?.smtpUser || process.env.SMTP_EMAIL;
    const fromName = branding.companyName || config?.fromName || "CarrierDeskHQ";
    const wrappedHtml = wrapEmailHtml(branding, subject, bodyHtml);

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: branding.supportEmail || undefined,
      to: toEmail,
      subject,
      html: wrappedHtml,
    });

    await db.update(emailMessages)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(emailMessages.id, msgRecord.id));

    return { success: true };
  } catch (error: any) {
    await db.update(emailMessages)
      .set({ status: "failed", errorMessage: error.message })
      .where(eq(emailMessages.id, msgRecord.id));
    return { success: false, error: error.message };
  }
}

export async function executeEmailCampaign(campaignId: string, requestTenantId?: string): Promise<{ sent: number; failed: number }> {
  const conditions = requestTenantId
    ? and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.tenantId, requestTenantId))
    : eq(emailCampaigns.id, campaignId);
  const [campaign] = await db.select().from(emailCampaigns).where(conditions);
  if (!campaign) throw new Error("Campaign not found");

  const tenantId = campaign.tenantId;
  let targetClients: any[] = [];

  if (campaign.audienceType === "all") {
    targetClients = await db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.status, "active")));
  } else if (campaign.audienceType === "selected" && campaign.clientIds?.length) {
    targetClients = await db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.status, "active")));
    targetClients = targetClients.filter(c => campaign.clientIds?.includes(c.id));
  } else if (campaign.audienceType === "filter" && campaign.audienceFilter) {
    targetClients = await db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.status, "active")));
    const filter = campaign.audienceFilter as any;
    if (filter.status) {
      targetClients = targetClients.filter(c => c.status === filter.status);
    }
  }

  targetClients = targetClients.filter(c => c.email);

  let sent = 0;
  let failed = 0;

  for (const client of targetClients) {
    const resolvedSubject = resolveMergeTokens(campaign.subject, {
      clientName: client.contactName,
      companyName: client.companyName,
      email: client.email,
    });
    const resolvedBody = resolveMergeTokens(campaign.bodyHtml, {
      clientName: client.contactName,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone || "",
    });

    const result = await sendCampaignEmail(tenantId, client.email, resolvedSubject, resolvedBody, {
      campaignId: campaign.id,
      clientId: client.id,
    });

    if (result.success) sent++;
    else failed++;
  }

  await db.update(emailCampaigns).set({
    status: "sent",
    sentAt: new Date(),
    totalRecipients: targetClients.length,
    delivered: sent,
    failed,
    updatedAt: new Date(),
  }).where(eq(emailCampaigns.id, campaignId));

  return { sent, failed };
}

export async function processEmailAutomations() {
  const now = new Date();

  const activeAutomations = await db.select().from(emailAutomations)
    .where(eq(emailAutomations.isActive, true));

  for (const automation of activeAutomations) {
    try {
      const config = automation.triggerConfig as any;
      const tenantId = automation.tenantId;
      const subject = automation.subject || "";
      const bodyHtml = automation.bodyHtml || "";

      if (automation.triggerType === "invoice_due_reminder") {
        const daysBefore = config.daysBefore || 3;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysBefore);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dueInvoices = await db.select().from(invoices)
          .where(and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.dueDate, startOfDay),
            lte(invoices.dueDate, endOfDay),
            sql`${invoices.status} != 'paid'`
          ));

        for (const inv of dueInvoices) {
          const alreadySent = await db.select().from(emailMessages)
            .where(and(
              eq(emailMessages.automationId, automation.id),
              eq(emailMessages.clientId, inv.clientId),
              gte(emailMessages.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
            ));
          if (alreadySent.length > 0) continue;

          const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
          if (!client?.email) continue;

          const resolvedSubject = resolveMergeTokens(subject, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });
          const resolvedBody = resolveMergeTokens(bodyHtml, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });

          await sendCampaignEmail(tenantId, client.email, resolvedSubject, resolvedBody, {
            automationId: automation.id,
            clientId: client.id,
          });
        }
      } else if (automation.triggerType === "overdue_invoice") {
        const daysOverdue = config.daysOverdue || 1;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - daysOverdue);

        const overdueInvoices = await db.select().from(invoices)
          .where(and(
            eq(invoices.tenantId, tenantId),
            lte(invoices.dueDate, targetDate),
            sql`${invoices.status} != 'paid'`
          ));

        for (const inv of overdueInvoices) {
          const alreadySent = await db.select().from(emailMessages)
            .where(and(
              eq(emailMessages.automationId, automation.id),
              eq(emailMessages.clientId, inv.clientId),
              gte(emailMessages.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
            ));
          if (alreadySent.length > 0) continue;

          const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
          if (!client?.email) continue;

          const resolvedSubject = resolveMergeTokens(subject, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });
          const resolvedBody = resolveMergeTokens(bodyHtml, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });

          await sendCampaignEmail(tenantId, client.email, resolvedSubject, resolvedBody, {
            automationId: automation.id,
            clientId: client.id,
          });
        }
      } else if (automation.triggerType === "welcome_message") {
        const recentClients = await db.select().from(clients)
          .where(and(
            eq(clients.tenantId, tenantId),
            gte(clients.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
          ));

        for (const client of recentClients) {
          if (!client.email) continue;
          const alreadySent = await db.select().from(emailMessages)
            .where(and(
              eq(emailMessages.automationId, automation.id),
              eq(emailMessages.clientId, client.id),
            ));
          if (alreadySent.length > 0) continue;

          const resolvedSubject = resolveMergeTokens(subject, {
            clientName: client.contactName,
            companyName: client.companyName,
          });
          const resolvedBody = resolveMergeTokens(bodyHtml, {
            clientName: client.contactName,
            companyName: client.companyName,
          });

          await sendCampaignEmail(tenantId, client.email, resolvedSubject, resolvedBody, {
            automationId: automation.id,
            clientId: client.id,
          });
        }
      } else if (automation.triggerType === "compliance_reminder") {
        const daysBefore = config.daysBefore || 7;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysBefore);
      }

      await db.update(emailAutomations).set({
        lastTriggeredAt: now,
        updatedAt: now,
      }).where(eq(emailAutomations.id, automation.id));

    } catch (error: any) {
      console.error(`[Email Automation] Error processing automation ${automation.id}:`, error.message);
    }
  }
}

export function startEmailAutomationScheduler() {
  setInterval(async () => {
    try {
      await processEmailAutomations();
    } catch (error: any) {
      console.error("[Email Scheduler] Error:", error.message);
    }
  }, 6 * 60 * 60 * 1000);
  console.log("[Email Scheduler] Email automation scheduler started (checks every 6 hours)");
}
