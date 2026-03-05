import nodemailer from "nodemailer";

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
    from: `"CC Trucking Services" <${fromEmail}>`,
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} — $${amt} from CC Trucking Services`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background-color: #1e3a5f; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CC Trucking Services</h1>
          <p style="color: #cbd5e1; margin: 5px 0 0 0; font-size: 13px;">Professional Trucking Operations &amp; Compliance</p>
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
            CC Trucking Services
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
