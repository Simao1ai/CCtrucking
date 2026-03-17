import PDFDocument from "pdfkit";
import type { PassThrough } from "stream";
import { brandingConfig } from "./branding-config";

interface TenantBranding {
  companyName: string;
  tagline: string;
  primaryColor: string;
}

interface InvoiceData {
  invoiceNumber: string;
  status: string;
  createdAt: string | Date;
  dueDate?: string | Date | null;
  paidDate?: string | Date | null;
  description?: string | null;
  amount: string;
  tenantBranding?: TenantBranding;
  client: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }[];
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateInvoicePDF(data: InvoiceData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });

  const branding = data.tenantBranding || brandingConfig;
  const primaryColor = branding.primaryColor || brandingConfig.primaryColor;
  const accentColor = "#2563eb";
  const lightBg = "#f8fafc";
  const borderColor = "#e2e8f0";
  const textColor = "#1e293b";
  const mutedColor = "#64748b";

  doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

  doc.fontSize(28).fillColor("#ffffff").font("Helvetica-Bold")
    .text(branding.companyName.toUpperCase(), 50, 35);
  doc.fontSize(10).fillColor("#cbd5e1").font("Helvetica")
    .text(branding.tagline, 50, 70);

  doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold")
    .text("INVOICE", doc.page.width - 200, 40, { width: 150, align: "right" });
  doc.fontSize(11).fillColor("#cbd5e1").font("Helvetica")
    .text(data.invoiceNumber, doc.page.width - 200, 65, { width: 150, align: "right" });

  let y = 140;

  doc.fontSize(9).fillColor(mutedColor).font("Helvetica-Bold").text("BILL TO", 50, y);
  y += 16;
  doc.fontSize(12).fillColor(textColor).font("Helvetica-Bold")
    .text(data.client.companyName, 50, y);
  y += 18;
  doc.fontSize(10).fillColor(textColor).font("Helvetica")
    .text(data.client.contactName, 50, y);
  y += 14;
  if (data.client.address) {
    doc.text(data.client.address, 50, y);
    y += 14;
  }
  if (data.client.city || data.client.state || data.client.zipCode) {
    doc.text(
      [data.client.city, data.client.state, data.client.zipCode].filter(Boolean).join(", "),
      50, y
    );
    y += 14;
  }
  doc.text(data.client.email, 50, y);
  y += 14;
  doc.text(data.client.phone, 50, y);

  const detailsX = 350;
  let detailsY = 140;
  const drawDetailRow = (label: string, value: string) => {
    doc.fontSize(9).fillColor(mutedColor).font("Helvetica-Bold")
      .text(label, detailsX, detailsY, { width: 80 });
    doc.fontSize(10).fillColor(textColor).font("Helvetica")
      .text(value, detailsX + 85, detailsY, { width: 130, align: "right" });
    detailsY += 18;
  };

  drawDetailRow("DATE", formatDate(data.createdAt));
  drawDetailRow("DUE DATE", formatDate(data.dueDate));
  drawDetailRow("STATUS", data.status.toUpperCase());
  if (data.paidDate) {
    drawDetailRow("PAID ON", formatDate(data.paidDate));
  }

  y = Math.max(y, detailsY) + 30;

  const tableX = 50;
  const colWidths = { desc: 250, qty: 60, price: 100, amount: 100 };
  const tableWidth = colWidths.desc + colWidths.qty + colWidths.price + colWidths.amount;

  doc.rect(tableX, y, tableWidth, 28).fill(primaryColor);
  doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("DESCRIPTION", tableX + 10, y + 9, { width: colWidths.desc - 10 });
  doc.text("QTY", tableX + colWidths.desc, y + 9, { width: colWidths.qty, align: "center" });
  doc.text("UNIT PRICE", tableX + colWidths.desc + colWidths.qty, y + 9, { width: colWidths.price, align: "right" });
  doc.text("AMOUNT", tableX + colWidths.desc + colWidths.qty + colWidths.price, y + 9, { width: colWidths.amount, align: "right" });
  y += 28;

  data.lineItems.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? "#ffffff" : lightBg;
    const rowHeight = 26;

    doc.rect(tableX, y, tableWidth, rowHeight).fill(rowBg);
    doc.fontSize(9).fillColor(textColor).font("Helvetica");
    doc.text(item.description, tableX + 10, y + 8, { width: colWidths.desc - 20 });
    doc.text(String(item.quantity), tableX + colWidths.desc, y + 8, { width: colWidths.qty, align: "center" });
    doc.text(formatCurrency(item.unitPrice), tableX + colWidths.desc + colWidths.qty, y + 8, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(item.amount), tableX + colWidths.desc + colWidths.qty + colWidths.price, y + 8, { width: colWidths.amount, align: "right" });
    y += rowHeight;
  });

  if (data.lineItems.length === 0) {
    doc.rect(tableX, y, tableWidth, 30).fill("#ffffff");
    doc.fontSize(10).fillColor(mutedColor).font("Helvetica")
      .text(data.description || "Professional services rendered", tableX + 10, y + 9, { width: tableWidth - 20 });
    y += 30;
  }

  doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).strokeColor(borderColor).lineWidth(1).stroke();
  y += 15;

  const totalBoxX = tableX + colWidths.desc + colWidths.qty;
  const totalBoxWidth = colWidths.price + colWidths.amount;

  const subtotal = data.lineItems.length > 0
    ? data.lineItems.reduce((s, item) => s + parseFloat(item.amount), 0)
    : parseFloat(data.amount);

  doc.fontSize(10).fillColor(mutedColor).font("Helvetica")
    .text("Subtotal", totalBoxX, y, { width: colWidths.price });
  doc.fillColor(textColor).font("Helvetica")
    .text(formatCurrency(subtotal), totalBoxX + colWidths.price, y, { width: colWidths.amount, align: "right" });
  y += 22;

  doc.rect(totalBoxX - 5, y - 3, totalBoxWidth + 10, 30).fill(primaryColor);
  doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold")
    .text("TOTAL DUE", totalBoxX, y + 4, { width: colWidths.price });
  doc.text(formatCurrency(data.amount), totalBoxX + colWidths.price, y + 4, { width: colWidths.amount, align: "right" });
  y += 50;

  if (data.description) {
    doc.fontSize(9).fillColor(mutedColor).font("Helvetica-Bold").text("NOTES", 50, y);
    y += 14;
    doc.fontSize(9).fillColor(textColor).font("Helvetica").text(data.description, 50, y, { width: 400 });
    y += 30;
  }

  const footerY = doc.page.height - 80;
  doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor(borderColor).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(mutedColor).font("Helvetica")
    .text("Thank you for your business!", 50, footerY + 12, { align: "center", width: doc.page.width - 100 });
  doc.text(`${branding.companyName} | ${branding.tagline}`, 50, footerY + 24, { align: "center", width: doc.page.width - 100 });
  doc.text("Payment is due upon receipt unless otherwise specified.", 50, footerY + 36, { align: "center", width: doc.page.width - 100 });

  doc.end();
  return doc;
}
