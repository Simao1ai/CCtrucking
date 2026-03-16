# CarrierDeskHQ - Trucking Operations Platform

## Overview
CarrierDeskHQ is a multi-tenant SaaS platform designed for trucking companies, offering a comprehensive CRM and operations management solution. It provides distinct Admin, Client, and Preparer Portals to streamline operations, enhance communication, and deliver business insights. The platform supports client management, service tickets (DOT/IFTA compliance, tax filings, business setup), document management, invoicing, forms, notarizations, bookkeeping, and business analytics. The core business vision is to provide a robust, scalable solution that owners can lease to trucking companies as tenants, retaining full IP ownership and enabling them to manage their operations efficiently.

## User Preferences
I prefer iterative development, so please provide updates frequently. I value clear and concise communication. When making changes, please ask for confirmation before implementing major architectural shifts.

## System Architecture

### Multi-Tenant Architecture
The platform is built with a multi-tenant design, using `tenant_id` for data isolation across all entity tables. It features robust role-based access control including `platform_owner`, `platform_admin`, `tenant_owner`, `tenant_admin`, `client`, and `preparer` roles. Module feature gates allow per-tenant toggling of functionalities like bookkeeping and tax prep, and branding is dynamically loaded from the database based on the tenant.

### Commercial Layer
A flexible plan configuration (`shared/plan-config.ts`) defines subscription tiers (basic, pro, enterprise) with associated limits on clients, users, and AI tokens. Module access and resource creation are enforced based on the tenant's plan, with a `PLAN_LIMIT_REACHED` error for exceeded limits. A usage API provides real-time consumption data.

### Onboarding & Provisioning
Tenant creation is managed via a multi-step wizard, covering company info, plan selection, and owner account setup. An onboarding checklist guides initial setup, complemented by client CSV import/export and an enhanced user invitation flow.

### Platform Operations Layer
A Super Admin Dashboard (`/platform`) provides comprehensive oversight of tenants, users, and revenue, with dedicated sub-pages for tenant management, analytics, AI usage tracking, system health, and security settings. Platform admins can impersonate tenants for support, with all actions audit-logged.

### User Accounts & Authentication
Authentication is custom, utilizing username/password with bcrypt and session management. Login routing is role-based, directing users to their respective portals, and supports slug-based login for tenant-branded pages. Logout is tenant-aware, redirecting users to their specific login page.

### Programmatic API
A programmatic API is available for external integrations, secured by API keys with granular permissions and separate rate limits. It supports managing clients, invoices, tickets, and documents, following a consistent response format. An admin UI allows tenant owners to manage keys, and comprehensive API documentation is provided.

### UI/UX Decisions
The frontend is developed using React, TypeScript, Vite, TanStack Query, and Wouter, styled with Shadcn UI, Tailwind CSS, and the Inter font, adhering to a navy/steel blue theme. Recharts is used for data visualization. The platform features triple portals (Admin, Client, Preparer) and includes client-friendly features like a signature pad.

### Technical Implementations
The backend uses Express.js with a RESTful API, PostgreSQL, and Drizzle ORM. Key features include a service catalog, form management, notarization tracking, audit logging, in-app/push notifications, and PWA support. It also supports client and service ticket management, document management, detailed invoicing with PDF generation, client-admin and staff-to-staff chat systems, signature requests, tax preparation intake with AI analysis, business analytics, employee performance tracking, and recurring compliance templates. A subscription-based bookkeeping system offers bank statement upload, AI transaction categorization, monthly summaries, preparer assignment, and receipt scanning. A dedicated Preparer Portal manages assigned client bookkeeping data, and features like ticket claiming, multi-employee client notes (with AI summarization), a dual-role AI Assistant, a knowledge base, and a client portal AI assistant enhance operational efficiency.

### Enhanced Forms System
Form templates support structured fillable fields via a `fields` jsonb column on `form_templates`. Field types: text, textarea, checkbox, date, select, number, email, phone. Each field can be configured with label, placeholder, required flag, width (full/half), section header, and auto-fill key (maps to client data like company_name, contact_name, email, phone, dot_number, mc_number, ein_number, address, city, state, zip_code, today_date). Filled forms store structured values in `field_values` jsonb on `filled_forms`. The form filler auto-populates fields from selected client data. Forms can be printed (opens styled print window), saved to client documents (`POST /api/admin/filled-forms/:id/save-to-documents`), or sent for signature. All update/delete routes are tenant-scoped for multi-tenant isolation.

### Form Automation (Auto-Generation on Ticket Creation)
The `service_form_mappings` table maps service types to form templates per tenant. When a service ticket is created (admin or client portal), `generateFormsForTicket()` checks for active mappings matching the ticket's `serviceType`. For each match, a filled form is auto-generated with client data pre-populated via auto-fill keys, created in "draft" status. Admins configure mappings via the Forms > Automation tab. CRUD routes: `GET/POST /api/admin/service-form-mappings`, `DELETE /api/admin/service-form-mappings/:id`. Service types match the ticket dropdown: Business Setup, Quarterly Tax, Annual Tax, DOT Permit, IFTA Permit, UCR Registration, IRP Registration, BOC-3 Filing, MCS-150 Update, Other.

### Tenant-Aware Email & SMS System
All outbound emails (invoices, reminders, signature requests, notarization updates) are tenant-branded and sent via the platform's SMTP connection. SMTP configuration is managed via the Platform Admin settings. Similarly, an SMS/Text campaign system powered by Twilio allows tenants to manage phone numbers, create reusable templates, run bulk campaigns, and set up trigger-based automations for invoices and client welcome messages.

### Dual Notarization System
The notarization module supports both in-house manual tracking and integration with Notarize.com (Proof API) for remote online notarizations. Tenants can choose one or both methods.

### SMS Campaign System
The platform includes a full SMS/text campaign system accessible from Admin > Communication > Text Campaigns (`/admin/sms`). Powered by Twilio. DB tables: `sms_phone_numbers`, `sms_templates`, `sms_campaigns`, `sms_automations`, `sms_messages`. Features phone number management, reusable templates with merge tokens, bulk campaigns, trigger-based automations (`invoice_due_reminder`, `overdue_invoice`, `welcome_message`, `compliance_reminder`), and full message history. Automation scheduler runs every 6 hours.

### Email Campaign System
Full email campaign system accessible from Admin > Communication > Email Campaigns (`/admin/email-campaigns`). Built on existing Nodemailer/SMTP infrastructure. DB tables: `email_templates`, `email_campaigns`, `email_automations`, `email_messages`. Features HTML email templates with merge tokens, bulk campaigns with audience targeting, trigger-based automations, and message history. All emails are tenant-branded. Automation scheduler runs every 6 hours.

### AI Campaign Content Generation
Both SMS and Email campaign pages feature AI-powered content generation via `POST /api/admin/ai/generate-campaign-content`. Uses OpenAI (gpt-4o-mini) to generate industry-specific trucking content for templates, campaigns, and automations. Accepts `channel` (sms/email), `contentType` (template/campaign/automation), `prompt`, and optional `category`/`triggerType`. AI quota tracked under `campaign_content` feature with resilient JSON parsing. Frontend shows "Generate with AI" button in every creation dialog with quick suggestion pills for common trucking industry use cases. Generated content auto-fills form fields for review before saving.

### Mobile API (Bubble.io Integration)
A mobile-optimized API endpoint at `GET /api/v1/mobile/dashboard` aggregates all key data into a single response for mobile app consumption. Authenticated via API key (Bearer token). Returns summary counts (clients, tickets, invoices, documents), compliance alerts (overdue + upcoming), recent activity feed, and status breakdowns. A per-client detail endpoint at `GET /api/v1/mobile/dashboard/client/:clientId` returns the client profile, summary metrics, recent tickets/invoices/documents, and pending actions (signatures, notarizations). Both endpoints support tenant isolation via API key binding. File: `server/api-v1/mobile-dashboard.ts`.

## External Dependencies
- **OpenAI**: Used for AI Chat Assistant, AI analysis of tax documents, AI transaction categorization, and AI campaign content generation.
- **Google Cloud (googleapis)**: Integrated for Google Sheets functionality.
- **Stripe**: Scaffolded for future subscription billing integration.
- **Twilio**: Used for SMS/Text campaign messaging, phone number management, and automated text notifications.