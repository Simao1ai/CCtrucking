import nodemailer from "nodemailer";
import { brandingConfig } from "./branding-config";

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

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  const fromEmail = process.env.SMTP_EMAIL;
  if (!fromEmail || !process.env.SMTP_PASSWORD) {
    throw new Error("Email credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD.");
  }

  const dueDateStr = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "upon receipt";

  const amt = parseFloat(params.amount).toLocaleString("en-US", { minimumFractionDigits: 2 });

  await transporter.sendMail({
    from: `"${brandingConfig.companyName}" <${fromEmail}>`,
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} — $${amt} from ${brandingConfig.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background-color: ${brandingConfig.primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${brandingConfig.companyName}</h1>
          <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 13px;">${brandingConfig.tagline}</p>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
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
                <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #1e3a5f;">$${amt}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Due Date</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dueDateStr}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #64748b;">You can also view this invoice and all your account details by logging into your client portal.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Thank you for your business!<br />
            ${brandingConfig.companyName}
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

interface SendReminderEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  level: "first" | "second" | "final";
}

export async function sendReminderEmail(params: SendReminderEmailParams): Promise<void> {
  const fromEmail = process.env.SMTP_EMAIL;
  if (!fromEmail || !process.env.SMTP_PASSWORD) {
    throw new Error("Email credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD.");
  }

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

  await transporter.sendMail({
    from: `"${brandingConfig.companyName}" <${fromEmail}>`,
    to: params.to,
    subject: subjects[params.level],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background-color: ${brandingConfig.primaryColor}; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${brandingConfig.companyName}</h1>
          <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 13px;">Payment Reminder</p>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
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
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Thank you for your business!<br />
            ${brandingConfig.companyName}
          </p>
        </div>
      </div>
    `,
  });
}
