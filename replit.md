# CarrierDeskHQ - Trucking Operations Platform

## Overview
CarrierDeskHQ is a multi-tenant SaaS platform offering a comprehensive CRM and operations management solution tailored for trucking companies. It provides distinct Admin, Client, and Preparer Portals to streamline operations, enhance client communication, and deliver business insights. The platform supports client management, service tickets (DOT/IFTA compliance, tax filings, business setup), document management, invoicing, forms, notarizations, bookkeeping, and business analytics. The platform enables the owner to lease the product to trucking companies as tenants, retaining 100% IP ownership.

## User Preferences
I prefer iterative development, so please provide updates frequently. I value clear and concise communication. When making changes, please ask for confirmation before implementing major architectural shifts.

## System Architecture

### Multi-Tenant Architecture
The platform features a multi-tenant design with `tenant_id` for data isolation across all entity tables. Role-based access control includes `platform_owner`, `platform_admin`, `tenant_owner`, `tenant_admin`, `client`, and `preparer` roles. Module feature gates allow toggling functionalities like bookkeeping and tax prep per tenant. Branding is dynamically loaded from the database based on the tenant. AI prompts and scheduling are scoped to individual tenants.

### Commercial Layer
A flexible plan configuration (`shared/plan-config.ts`) defines subscription tiers (basic, pro, enterprise) with associated limits (clients, users, AI tokens). Module access and resource creation are enforced based on the tenant's plan, returning a `PLAN_LIMIT_REACHED` error when limits are exceeded. A usage API provides real-time client, user, and AI consumption data versus plan limits.

### Onboarding & Provisioning
A multi-step wizard facilitates tenant creation, including company info, plan selection, and owner account setup. An onboarding checklist guides new tenants through initial setup steps. Features include client CSV import/export and an enhanced user invitation flow with plan limit awareness.

### Platform Operations Layer
A Super Admin Dashboard (`/platform`) provides an overview of tenants, users, and revenue, with dedicated sub-pages for tenant management, analytics, AI usage tracking, and system health. AI usage is tracked per tenant, and quotas are enforced based on subscription plans. Platform admins can impersonate tenants for support purposes, with all actions audit-logged.

### User Accounts & Authentication
Authentication is custom, using username/password with bcrypt and session management. Login routing is role-based, directing users to their respective portals (platform, admin, preparer, client). Slug-based login allows tenant-branded login pages. Logout is tenant-aware, redirecting users back to their specific tenant login page. Seed migrations ensure initial tenant and user setup.

### Hardening & Launch
Security measures include `helmet` middleware for HTTP headers, `express-rate-limit` for API request control, and `sanitize-html` for input sanitization. Standardized error handling provides consistent responses, and request IDs aid in log correlation. Password security includes strength validation and account lockout after multiple failed login attempts.

### Programmatic API
A programmatic API is available for external integrations, managed via API keys with granular permissions. API keys are securely stored and authenticated via middleware, with separate rate limits. External API routes are available for managing clients, invoices, tickets, and documents, following a consistent response format for lists, single resources, and errors. An admin UI (`/admin/api-keys`) allows tenant owners to manage their API keys, and comprehensive API documentation (`/admin/api-docs`) is provided.

### UI/UX Decisions
The frontend is built with React, TypeScript, Vite, TanStack Query, and Wouter for routing. Styling utilizes Shadcn UI, Tailwind CSS, and the Inter font, adhering to a navy/steel blue theme. Recharts is used for data visualization. The platform features a triple portal system for Admin, Client, and Preparer roles, with client-friendly features like a signature pad for document signing.

### Technical Implementations
The backend uses Express.js with a RESTful API, backed by PostgreSQL and Drizzle ORM. Authentication is session-based with bcrypt. Key features include a service catalog, form management, notarization tracking, comprehensive audit logging, and an in-app/push notification system. PWA support ensures mobile and desktop installability. Additional features include client and service ticket management, document management, detailed invoicing with PDF generation, client-admin and staff-to-staff chat systems, signature requests, tax preparation intake with AI analysis, business analytics, employee performance tracking, and recurring compliance templates. A subscription-based bookkeeping system offers bank statement upload, AI transaction categorization, monthly financial summaries, preparer assignment, and receipt scanning with AI extraction. A dedicated Preparer Portal allows management of assigned client bookkeeping data. Features like ticket claim/lock, multi-employee client notes (with AI summarization), an enhanced dual-role AI Assistant, a knowledge base, and a client portal AI assistant enhance operational efficiency and user support. A tax document approval workflow facilitates client review and approval.

## External Dependencies
- **OpenAI**: Used for AI Chat Assistant, AI analysis of tax documents, and AI transaction categorization.
- **Google Cloud (googleapis)**: Integrated for Google Sheets functionality.
- **Stripe**: Scaffolded for future subscription billing integration.

### Tenant-Aware Email System
All outbound emails (invoices, reminders, signature requests, notarization updates) are sent via the platform's SMTP connection but branded per-tenant. The `server/tenant-email.ts` module sets the tenant's company name as the "From Name" and the tenant's support email as the "Reply-To" header. Email sending is wrapped in try/catch so failures don't block the parent operation. Email types: invoice delivery (with PDF attachment), payment reminders (3 escalation levels), signature request notifications, and notarization status updates.

SMTP configuration is managed via the Platform Admin > Email page (`/platform/email`), stored in the `platform_email_config` database table. The system supports Office365, Gmail, Amazon SES, and custom SMTP providers. Settings fall back to `SMTP_EMAIL` / `SMTP_PASSWORD` environment secrets if no database config exists. The transporter is cached and rebuilt only when settings change. The admin can test the connection and send a verification email from the settings page.

### Dual Notarization System
The notarization module supports two provider modes per tenant, configured via Admin > Notarizations > Settings:
- **In-House Notary**: Manual tracking of on-site notarizations with notary name, commission number, dates, and status updates.
- **Notarize.com (Remote Online)**: Integration with Notarize.com (Proof API at `api.proof.com/business/v1`). Creates remote notarization transactions where the signer receives an email link to complete the notarization via live video with a commissioned notary. Status syncs via manual refresh or webhook (`/api/webhooks/notarize`).
- **Both**: Tenants can use either method depending on the situation.

The `notarizations` table includes `provider` (in_house/notarize), `external_transaction_id`, `external_status`, `signer_email/first_name/last_name`, `signer_link`, and `completed_document_url` fields. API key for Notarize.com is stored in tenant settings as `notarize_api_key`. The integration service is at `server/notarize-service.ts`.

### Platform Operations Layer (Extended)
The Platform Admin area (`/platform`) includes:
- **Dashboard** (`/platform`): Overview stats (tenants, users, revenue)
- **Tenants** (`/platform/tenants`): Multi-step tenant creation wizard, edit/manage tenants
- **Analytics** (`/platform/analytics`): Revenue charts, per-tenant breakdown, status distribution
- **AI Usage** (`/platform/ai-usage`): Token consumption monitoring per feature and tenant
- **Settings** (`/platform/settings`): Platform identity (name, tagline, logo, favicon), contact info, regional defaults (timezone, date format), legal URLs (terms/privacy), maintenance mode toggle. DB table: `platform_settings`
- **Security** (`/platform/security`): Password policies (length, complexity requirements), session timeout, max login attempts/lockout, IP allowlist, 2FA toggle. DB table: `security_settings`. Note: policies are stored but enforcement in auth middleware is pending implementation.
- **Email** (`/platform/email`): SMTP provider config (Office365, Gmail, Neo, SES, custom)
- **Audit Log** (`/platform/audit-log`): Full searchable audit trail with filters (tenant, entity type, action, date range), pagination, color-coded action badges
- **Announcements** (`/platform/announcements`): Broadcast messages to tenants with type (info/warning/critical/success), priority, target audience filtering (all/admins/clients), scheduled start/expiry dates, active toggle. DB table: `platform_announcements`. Active announcements served to tenant users via `/api/announcements/active` with role-based audience filtering.
- **Backup & Export** (`/platform/backup`): CSV exports for tenants, users, audit logs, and revenue/invoices with formula-injection-safe escaping. Database overview with table counts.
- **Health** (`/platform/health`): System uptime, audit log stats, DB row counts

### Client Analytics & Insights
The platform provides two levels of client analytics:
- **Per-Client Analytics Tab**: Available on the client detail page (`/admin/clients/:id`), the "Analytics" tab shows lifetime value, client duration/anniversary, payment rate, avg payment time, financial summary, service activity breakdown, services used, and recent invoices. API: `GET /api/clients/:id/analytics`.
- **Client Insights Dashboard** (`/admin/client-insights`): Cross-client analytics page showing summary stats (active clients, total revenue, outstanding, upcoming milestones), top clients by revenue, at-risk clients (overdue or inactive 90+ days), upcoming anniversaries (within 30 days for thank-you emails), monthly revenue chart, and a searchable all-clients table with lifetime value, duration, and payment metrics. API: `GET /api/admin/client-insights`.
- The `clients` table includes a `createdAt` field for tracking client tenure and calculating anniversaries.