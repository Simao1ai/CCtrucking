import Twilio from "twilio";
import { db } from "./db";
import { platformSmsConfig, smsMessages, smsPhoneNumbers, smsCampaigns, smsAutomations, clients, invoices } from "@shared/schema";
import { eq, and, lte, gte, sql, isNull } from "drizzle-orm";

let twilioClient: Twilio.Twilio | null = null;
let cachedConfig: any = null;

async function getSmsConfig() {
  const [config] = await db.select().from(platformSmsConfig).limit(1);
  return config || null;
}

async function getTwilioClient() {
  const config = await getSmsConfig();
  if (!config?.enabled || config.provider !== "twilio" || !config.twilioAccountSid || !config.twilioAuthToken) {
    return null;
  }

  if (cachedConfig?.twilioAccountSid !== config.twilioAccountSid ||
      cachedConfig?.twilioAuthToken !== config.twilioAuthToken) {
    twilioClient = new Twilio.Twilio(config.twilioAccountSid, config.twilioAuthToken);
    cachedConfig = config;
  }

  return twilioClient;
}

async function sendViaCommshub(
  toNumber: string,
  fromNumber: string,
  body: string,
  config: { commshubBaseUrl: string; commshubApiKey: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = config.commshubBaseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/api/v1/send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.commshubApiKey}`,
    },
    body: JSON.stringify({
      to: toNumber,
      from: fromNumber,
      message: body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    return { success: false, error: `CommsHub error (${response.status}): ${errorText}` };
  }

  const result = await response.json().catch(() => ({}));
  return { success: true, messageId: result.id || result.messageId || `commshub-${Date.now()}` };
}

export function resolveMergeTokens(body: string, data: Record<string, string>): string {
  let resolved = body;
  for (const [key, value] of Object.entries(data)) {
    resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return resolved;
}

export async function sendSms(
  tenantId: string,
  toNumber: string,
  fromNumber: string,
  body: string,
  options?: { campaignId?: string; automationId?: string; clientId?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getSmsConfig();

  const [msgRecord] = await db.insert(smsMessages).values({
    tenantId,
    toNumber,
    fromNumber,
    body,
    campaignId: options?.campaignId || null,
    automationId: options?.automationId || null,
    clientId: options?.clientId || null,
    status: "queued",
  }).returning();

  if (!config?.enabled) {
    await db.update(smsMessages)
      .set({ status: "failed", errorMessage: "SMS not configured" })
      .where(eq(smsMessages.id, msgRecord.id));
    return { success: false, error: "SMS service not configured" };
  }

  try {
    let result: { success: boolean; messageId?: string; error?: string };

    if (config.provider === "commshub") {
      if (!config.commshubBaseUrl || !config.commshubApiKey) {
        throw new Error("CommsHub credentials not configured");
      }
      result = await sendViaCommshub(toNumber, fromNumber, body, {
        commshubBaseUrl: config.commshubBaseUrl,
        commshubApiKey: config.commshubApiKey,
      });
    } else {
      const client = await getTwilioClient();
      if (!client) {
        throw new Error("Twilio credentials not configured");
      }
      const message = await client.messages.create({
        to: toNumber,
        from: fromNumber,
        body: body,
      });
      result = { success: true, messageId: message.sid };
    }

    if (result.success) {
      await db.update(smsMessages)
        .set({ status: "sent", twilioSid: result.messageId || null, sentAt: new Date() })
        .where(eq(smsMessages.id, msgRecord.id));
    } else {
      await db.update(smsMessages)
        .set({ status: "failed", errorMessage: result.error })
        .where(eq(smsMessages.id, msgRecord.id));
    }

    return result;
  } catch (error: any) {
    await db.update(smsMessages)
      .set({ status: "failed", errorMessage: error.message })
      .where(eq(smsMessages.id, msgRecord.id));
    return { success: false, error: error.message };
  }
}

export async function executeCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  const [campaign] = await db.select().from(smsCampaigns).where(eq(smsCampaigns.id, campaignId));
  if (!campaign) throw new Error("Campaign not found");

  let phoneNumber: string | null = null;
  if (campaign.fromNumberId) {
    const [num] = await db.select().from(smsPhoneNumbers)
      .where(and(eq(smsPhoneNumbers.id, campaign.fromNumberId), eq(smsPhoneNumbers.isActive, true)));
    phoneNumber = num?.phoneNumber || null;
  }

  if (!phoneNumber) {
    const config = await getSmsConfig();
    phoneNumber = config?.defaultFromNumber || null;
  }

  if (!phoneNumber) throw new Error("No sending phone number configured");

  let targetClients: any[] = [];
  const tenantId = campaign.tenantId;

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

  targetClients = targetClients.filter(c => c.phone);

  let sent = 0;
  let failed = 0;

  for (const client of targetClients) {
    const resolvedBody = resolveMergeTokens(campaign.messageBody, {
      clientName: client.contactName,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone,
    });

    const result = await sendSms(tenantId, client.phone, phoneNumber!, resolvedBody, {
      campaignId: campaign.id,
      clientId: client.id,
    });

    if (result.success) sent++;
    else failed++;
  }

  await db.update(smsCampaigns).set({
    status: "sent",
    sentAt: new Date(),
    totalRecipients: targetClients.length,
    delivered: sent,
    failed,
    updatedAt: new Date(),
  }).where(eq(smsCampaigns.id, campaignId));

  return { sent, failed };
}

export async function processAutomations() {
  const now = new Date();

  const activeAutomations = await db.select().from(smsAutomations)
    .where(eq(smsAutomations.isActive, true));

  for (const automation of activeAutomations) {
    try {
      const config = automation.triggerConfig as any;
      const tenantId = automation.tenantId;

      let phoneNumber: string | null = null;
      if (automation.fromNumberId) {
        const [num] = await db.select().from(smsPhoneNumbers)
          .where(and(eq(smsPhoneNumbers.id, automation.fromNumberId), eq(smsPhoneNumbers.isActive, true)));
        phoneNumber = num?.phoneNumber || null;
      }
      if (!phoneNumber) {
        const smsConfig = await getSmsConfig();
        phoneNumber = smsConfig?.defaultFromNumber || null;
      }
      if (!phoneNumber) continue;

      const messageBody = automation.messageBody || "";

      if (automation.triggerType === "invoice_due_reminder") {
        const daysBefore = config.daysBefore || 3;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysBefore);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const dueInvoices = await db.select().from(invoices)
          .where(and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.dueDate, startOfDay),
            lte(invoices.dueDate, endOfDay),
            sql`${invoices.status} != 'paid'`
          ));

        for (const inv of dueInvoices) {
          const alreadySent = await db.select().from(smsMessages)
            .where(and(
              eq(smsMessages.automationId, automation.id),
              eq(smsMessages.clientId, inv.clientId),
              gte(smsMessages.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
            ));
          if (alreadySent.length > 0) continue;

          const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
          if (!client?.phone) continue;

          const resolved = resolveMergeTokens(messageBody, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });

          await sendSms(tenantId, client.phone, phoneNumber, resolved, {
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
          const alreadySent = await db.select().from(smsMessages)
            .where(and(
              eq(smsMessages.automationId, automation.id),
              eq(smsMessages.clientId, inv.clientId),
              gte(smsMessages.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
            ));
          if (alreadySent.length > 0) continue;

          const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
          if (!client?.phone) continue;

          const resolved = resolveMergeTokens(messageBody, {
            clientName: client.contactName,
            companyName: client.companyName,
            invoiceNumber: inv.invoiceNumber,
            amount: `$${parseFloat(String(inv.amount || "0")).toFixed(2)}`,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          });

          await sendSms(tenantId, client.phone, phoneNumber, resolved, {
            automationId: automation.id,
            clientId: client.id,
          });
        }
      } else if (automation.triggerType === "compliance_reminder") {
        const daysBefore = config.daysBefore || 7;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysBefore);
      } else if (automation.triggerType === "welcome_message") {
        const recentClients = await db.select().from(clients)
          .where(and(
            eq(clients.tenantId, tenantId),
            gte(clients.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
          ));

        for (const client of recentClients) {
          if (!client.phone) continue;
          const alreadySent = await db.select().from(smsMessages)
            .where(and(
              eq(smsMessages.automationId, automation.id),
              eq(smsMessages.clientId, client.id),
            ));
          if (alreadySent.length > 0) continue;

          const resolved = resolveMergeTokens(messageBody, {
            clientName: client.contactName,
            companyName: client.companyName,
          });

          await sendSms(tenantId, client.phone, phoneNumber, resolved, {
            automationId: automation.id,
            clientId: client.id,
          });
        }
      }

      await db.update(smsAutomations).set({
        lastTriggeredAt: now,
        updatedAt: now,
      }).where(eq(smsAutomations.id, automation.id));

    } catch (error: any) {
      console.error(`[SMS Automation] Error processing automation ${automation.id}:`, error.message);
    }
  }
}

export async function searchAvailableNumbers(areaCode?: string, country?: string) {
  const client = await getTwilioClient();
  if (!client) return [];

  try {
    const search = client.availablePhoneNumbers(country || "US").local;
    const params: any = { limit: 10 };
    if (areaCode) params.areaCode = areaCode;

    const numbers = await search.list(params);
    return numbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      capabilities: n.capabilities,
    }));
  } catch (error: any) {
    console.error("[SMS] Error searching numbers:", error.message);
    return [];
  }
}

export async function purchaseNumber(tenantId: string, phoneNumber: string, friendlyName?: string) {
  const client = await getTwilioClient();
  if (!client) throw new Error("SMS service not configured");

  try {
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber,
      friendlyName: friendlyName || `CarrierDesk - ${phoneNumber}`,
    });

    const [record] = await db.insert(smsPhoneNumbers).values({
      tenantId,
      phoneNumber: purchased.phoneNumber,
      friendlyName: purchased.friendlyName || friendlyName || phoneNumber,
      twilioSid: purchased.sid,
      capabilities: "sms",
      isActive: true,
    }).returning();

    return record;
  } catch (error: any) {
    throw new Error(`Failed to purchase number: ${error.message}`);
  }
}

export function startSmsAutomationScheduler() {
  setInterval(async () => {
    try {
      await processAutomations();
    } catch (error: any) {
      console.error("[SMS Scheduler] Error:", error.message);
    }
  }, 6 * 60 * 60 * 1000);
  console.log("[SMS Scheduler] Automation scheduler started (checks every 6 hours)");
}
