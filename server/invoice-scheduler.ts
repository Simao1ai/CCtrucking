import { db } from "./db";
import { invoices, clients } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendReminderEmail } from "./invoice-email";

export async function checkAndSendReminders() {
  try {
    const unpaidInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          sql`${invoices.status} IN ('sent', 'overdue')`,
          sql`${invoices.dueDate} IS NOT NULL`
        )
      );

    const now = new Date();

    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;

      const dueDate = new Date(invoice.dueDate);
      if (now < dueDate) continue;

      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let targetReminderLevel = 0;
      if (daysOverdue >= 7) targetReminderLevel = 1;
      if (daysOverdue >= 14) targetReminderLevel = 2;
      if (daysOverdue >= 21) targetReminderLevel = 3;

      if (targetReminderLevel <= 0 || targetReminderLevel <= invoice.reminderCount) continue;

      const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
      if (!client?.email) continue;

      const level = targetReminderLevel === 1 ? "first" : targetReminderLevel === 2 ? "second" : "final";

      try {
        await sendReminderEmail({
          to: client.email,
          clientName: client.contactName,
          invoiceNumber: invoice.invoiceNumber,
          amount: String(invoice.amount),
          dueDate: String(invoice.dueDate),
          level,
        });

        await db
          .update(invoices)
          .set({
            reminderCount: targetReminderLevel,
            lastReminderSent: now,
            status: "overdue",
          })
          .where(eq(invoices.id, invoice.id));

        console.log(`[Scheduler] Sent ${level} reminder for invoice ${invoice.invoiceNumber} to ${client.email} (${daysOverdue} days overdue)`);
      } catch (err) {
        console.error(`[Scheduler] Failed to send reminder for ${invoice.invoiceNumber}:`, err);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error checking reminders:", err);
  }
}

export function startInvoiceScheduler() {
  console.log("[Scheduler] Invoice reminder scheduler started (checks every 6 hours)");
  setInterval(checkAndSendReminders, 6 * 60 * 60 * 1000);
  setTimeout(checkAndSendReminders, 30000);
}
