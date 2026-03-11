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