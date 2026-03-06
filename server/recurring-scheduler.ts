import { db } from "./db";
import { clientRecurringSchedules, recurringTemplates, serviceTickets, clients } from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";

function computeNextDueDate(currentDueDate: Date, frequencyType: string): Date {
  const next = new Date(currentDueDate);
  switch (frequencyType) {
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "biennial":
      next.setFullYear(next.getFullYear() + 2);
      break;
    default:
      next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export async function checkRecurringSchedules() {
  try {
    const activeSchedules = await db
      .select()
      .from(clientRecurringSchedules)
      .where(eq(clientRecurringSchedules.isActive, true));

    const now = new Date();

    for (const schedule of activeSchedules) {
      const [template] = await db
        .select()
        .from(recurringTemplates)
        .where(eq(recurringTemplates.id, schedule.templateId));

      if (!template || !template.isActive) continue;

      const triggerDate = new Date(schedule.nextDueDate);
      triggerDate.setDate(triggerDate.getDate() - template.daysBefore);

      if (now < triggerDate) continue;

      if (schedule.lastGeneratedDate) {
        const lastGen = new Date(schedule.lastGeneratedDate);
        const daysSinceLastGen = Math.floor((now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastGen < 7) continue;
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, schedule.clientId));
      if (!client) continue;

      const dueDate = schedule.nextDueDate;

      await db.insert(serviceTickets).values({
        clientId: schedule.clientId,
        title: `${template.name} - ${client.companyName}`,
        serviceType: template.serviceType,
        status: "open",
        priority: template.priority,
        description: template.description || "",
        dueDate: dueDate,
      });

      const nextDueDate = computeNextDueDate(schedule.nextDueDate, template.frequencyType);

      await db
        .update(clientRecurringSchedules)
        .set({
          lastGeneratedDate: now,
          nextDueDate: nextDueDate,
        })
        .where(eq(clientRecurringSchedules.id, schedule.id));

      console.log(`[Recurring] Auto-created ticket: ${template.name} for ${client.companyName}, next due: ${nextDueDate.toISOString()}`);
    }
  } catch (err) {
    console.error("[Recurring] Error checking schedules:", err);
  }
}

export function startRecurringScheduler() {
  console.log("[Recurring] Compliance schedule checker started (checks every 12 hours)");
  setInterval(checkRecurringSchedules, 12 * 60 * 60 * 1000);
  setTimeout(checkRecurringSchedules, 60000);
}
