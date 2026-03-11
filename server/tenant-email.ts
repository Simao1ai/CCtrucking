import nodemailer from "nodemailer";
import { brandingConfig } from "./branding-config";
import { storage } from "./storage";

interface TenantBranding {
  companyName: string;
  tagline: string;
  primaryColor: string;
  supportEmail: string;
}

async function getTenantBranding(tenantId?: string): Promise<TenantBranding> {
  if (tenantId) {
    const b = await storage.getTenantBrandingByTenantId(tenantId);
    if (b) {
      return {
        companyName: b.companyName || brandingConfig.companyName,
        tagline: b.tagline || brandingConfig.tagline,
        primaryColor: b.primaryColor || brandingConfig.primaryColor,
        supportEmail: b.supportEmail || brandingConfig.contactEmail,
      };
    }
  }
  return {
    companyName: brandingConfig.companyName,
    tagline: brandingConfig.tagline,
    primaryColor: brandingConfig.primaryColor,
    supportEmail: brandingConfig.contactEmail,
  };
}

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  requireTLS: true,
});

function emailWrapper(branding: TenantBranding, subtitle: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background-color: ${branding.primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${branding.companyName}</h1>
        <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 13px;">${subtitle || branding.tagline}</p>
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

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  branding: TenantBranding;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<void> {
  const fromEmail = process.env.SMTP_EMAIL;
  if (!fromEmail || !process.env.SMTP_PASSWORD) {
    throw new Error("Email credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD.");
  }

  const replyTo = opts.branding.supportEmail || undefined;

  await transporter.sendMail({
    from: `"${opts.branding.companyName}" <${fromEmail}>`,
    replyTo: replyTo || undefined,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });
}

export interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  pdfBuffer: Buffer;
  tenantId?: string;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  const branding = await getTenantBranding(params.tenantId);
  const amt = parseFloat(params.amount).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const dueDateStr = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "upon receipt";

  const bodyHtml = `
    <p style="font-size: 16px;">Hello ${params.clientName},</p>
    <p>Please find your invoice attached to this email.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Amount Due</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${branding.primaryColor};">$${amt}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dueDateStr}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b;">You can also view this invoice and all your account details by logging into your client portal.</p>
  `;

  await sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} — $${amt} from ${branding.companyName}`,
    html: emailWrapper(branding, branding.tagline, bodyHtml),
    branding,
    attachments: [{
      filename: `${params.invoiceNumber}.pdf`,
      content: params.pdfBuffer,
      contentType: "application/pdf",
    }],
  });
}

export interface SendReminderEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  level: "first" | "second" | "final";
  tenantId?: string;
}

export async function sendReminderEmail(params: SendReminderEmailParams): Promise<void> {
  const branding = await getTenantBranding(params.tenantId);
  const amt = parseFloat(params.amount).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const dueDateStr = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "upon receipt";

  const subjects: Record<string, string> = {
    first: `Payment Reminder: Invoice ${params.invoiceNumber} — $${amt}`,
    second: `Second Notice: Invoice ${params.invoiceNumber} — $${amt} Past Due`,
    final: `Final Notice: Invoice ${params.invoiceNumber} — $${amt} Overdue`,
  };

  const messages: Record<string, string> = {
    first: `This is a friendly reminder that invoice <strong>${params.invoiceNumber}</strong> for <strong>$${amt}</strong> is due on <strong>${dueDateStr}</strong>. Please arrange payment at your earliest convenience.`,
    second: `This is a second notice regarding invoice <strong>${params.invoiceNumber}</strong> for <strong>$${amt}</strong>, which was due on <strong>${dueDateStr}</strong>. We kindly request immediate attention to this outstanding balance.`,
    final: `This is a final notice regarding invoice <strong>${params.invoiceNumber}</strong> for <strong>$${amt}</strong>, which is now significantly past due (original due date: <strong>${dueDateStr}</strong>). Please contact us immediately to arrange payment and avoid any disruption to services.`,
  };

  const urgencyColors: Record<string, string> = {
    first: "#f59e0b",
    second: "#f97316",
    final: "#ef4444",
  };

  const bodyHtml = `
    <div style="background-color: ${urgencyColors[params.level]}15; border-left: 4px solid ${urgencyColors[params.level]}; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <strong style="color: ${urgencyColors[params.level]};">${params.level === "first" ? "Payment Reminder" : params.level === "second" ? "Second Notice" : "Final Notice"}</strong>
    </div>
    <p style="font-size: 16px;">Hello ${params.clientName},</p>
    <p>${messages[params.level]}</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Amount Due</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${urgencyColors[params.level]};">$${amt}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dueDateStr}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b;">If you have already made this payment, please disregard this notice. You can also view all your invoices by logging into your client portal.</p>
  `;

  await sendEmail({
    to: params.to,
    subject: subjects[params.level],
    html: emailWrapper(branding, "Payment Reminder", bodyHtml),
    branding,
  });
}

export interface SendSignatureEmailParams {
  to: string;
  clientName: string;
  documentName: string;
  tenantId?: string;
}

export async function sendSignatureEmail(params: SendSignatureEmailParams): Promise<void> {
  const branding = await getTenantBranding(params.tenantId);

  const bodyHtml = `
    <p style="font-size: 16px;">Hello ${params.clientName},</p>
    <p>You have a document that requires your signature.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Document</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.documentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Status</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f59e0b;">Awaiting Signature</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b;">Please log into your client portal to review and sign this document at your earliest convenience.</p>
  `;

  await sendEmail({
    to: params.to,
    subject: `Signature Required: ${params.documentName} — ${branding.companyName}`,
    html: emailWrapper(branding, "Signature Request", bodyHtml),
    branding,
  });
}

export interface SendNotarizationEmailParams {
  to: string;
  clientName: string;
  documentName: string;
  notaryName: string;
  status: string;
  notarizationDate?: string | null;
  tenantId?: string;
}

export async function sendNotarizationEmail(params: SendNotarizationEmailParams): Promise<void> {
  const branding = await getTenantBranding(params.tenantId);

  const statusLabels: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Scheduled", color: "#3b82f6" },
    completed: { label: "Completed", color: "#22c55e" },
    pending: { label: "Pending", color: "#f59e0b" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
  };

  const statusInfo = statusLabels[params.status] || { label: params.status, color: "#64748b" };
  const dateStr = params.notarizationDate
    ? new Date(params.notarizationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "To be determined";

  const bodyHtml = `
    <p style="font-size: 16px;">Hello ${params.clientName},</p>
    <p>Here is an update on your notarization request.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Document</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.documentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Notary</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.notaryName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Status</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${statusInfo.color};">${statusInfo.label}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dateStr}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b;">You can view the full details by logging into your client portal.</p>
  `;

  await sendEmail({
    to: params.to,
    subject: `Notarization ${statusInfo.label}: ${params.documentName} — ${branding.companyName}`,
    html: emailWrapper(branding, "Notarization Update", bodyHtml),
    branding,
  });
}
