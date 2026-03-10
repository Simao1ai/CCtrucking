# CarrierDeskHQ - Trucking Operations Platform (Multi-Tenant SaaS)

## Overview
CarrierDeskHQ is a multi-tenant SaaS platform providing a comprehensive CRM and operations management solution for trucking companies. It features distinct Admin, Client, and Preparer Portals to streamline trucking operations, enhance client communication, and provide valuable business insights. The platform supports managing client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), documents, invoicing, forms, notarizations, bookkeeping, and business analytics. The platform owner retains 100% IP ownership; the product is leased to trucking companies as tenants. CC Trucking Services is the first tenant.

## User Preferences
I prefer iterative development, so please provide updates frequently. I value clear and concise communication. When making changes, please ask for confirmation before implementing major architectural shifts.

## SaaS Roadmap Progress
- **Phase 0 COMPLETE**: Full SaaS audit (PHASE_0_SAAS_AUDIT.md)
- **Phase 1 COMPLETE**: Centralized branding, tenant context, industry packs, custom fields
- **Phase 2 COMPLETE**: Multi-tenant architecture (see details below)
- **Phase 3 COMPLETE**: Platform Operations Layer (see details below)
- **Phase 4 COMPLETE**: Commercial Layer (see details below)
- **Phase 5 COMPLETE**: Onboarding & Provisioning (see details below)
- **Phase 6-7**: Pending (hardening/launch, programmatic API)

## System Architecture

### Multi-Tenant Architecture (Phase 2)
- **Tenant Tables**: `tenants`, `tenant_branding`, `tenant_settings` — stores org config, branding, module toggles
- **Tenant Isolation**: `tenant_id` column added to ALL 28+ entity tables; all storage methods (105+) filter by tenantId
- **Current Tenant**: CC Trucking Services (id: `cc-trucking-tenant-001`, slug: `cctrucking`)
- **Role System**: 6 roles — `platform_owner`, `platform_admin`, `tenant_owner`, `tenant_admin` (new), plus legacy `owner`, `admin`, `client`, `preparer`
- **Middleware**: `server/middleware/tenant.ts` (resolveTenant, requireTenant, isPlatformOwner/Admin, isTenantOwner/Admin), `server/middleware/module-gates.ts` (requireModule)
- **Module Feature Gates**: Bookkeeping, tax prep, notarizations, compliance scheduling, employee performance — togglable per tenant
- **Branding from DB**: `GET /api/branding` loads from `tenant_branding` table, falls back to static config
- **Tenant Settings UI**: `/admin/tenant-settings` with General, Branding, Modules, Users tabs (owner-only)
- **Scheduler Isolation**: Invoice reminders and recurring compliance skip suspended/inactive tenants
- **AI Tenant Scoping**: All AI prompts load company name, industry knowledge, and data scoped to tenant

### Commercial Layer (Phase 4)
- **Plan Configuration**: `shared/plan-config.ts` — single source of truth for plan tiers (basic/pro/enterprise), limits, and feature mapping
- **Plan Limits**: Basic (50 clients, 5 users, 100k AI tokens), Pro (200, 20, 500k), Enterprise (unlimited=-1)
- **Plan Feature Gates**: `requireModule` middleware in `server/middleware/module-gates.ts` checks plan tier before module access; module aliases handle `tax_preparation`→`tax_prep` mapping
- **Limit Enforcement**: Client creation (`POST /api/clients`) and user creation (`POST /api/admin/create-user`) check plan limits; returns 403 with `PLAN_LIMIT_REACHED` code
- **Usage API**: `GET /api/tenant/usage` returns client/user/AI counts vs limits; `GET /api/tenant/plan-features` returns available features; `GET /api/tenant/plans` returns all plan definitions
- **Subscription UI**: `/admin/subscription` page (owner-only) with usage meters, plan comparison table, current plan badge
- **Data Isolation**: `stripTenantId` on all PATCH/PUT routes; tenant-scoped storage methods for staff messages, custom fields

### Onboarding & Provisioning (Phase 5)
- **Tenant Creation Wizard**: Multi-step wizard on `/platform` — Company Info (name, slug, email, industry), Plan Selection, Owner Account creation, Review & Create; POST `/api/platform/tenants` seeds branding, modules per plan, and initial owner user
- **Onboarding Checklist**: `GET /api/tenant/onboarding` auto-detects 5 setup steps (branding, first client, team member, ticket, invoice); shown on admin dashboard until completed
- **Client CSV Import**: `POST /api/admin/clients/import` with client-side CSV parsing, column mapping, validation preview, plan limit checks; import results with error reporting
- **Client CSV Export**: `GET /api/admin/clients/export/csv` downloads all clients as CSV
- **User Invitation Flow**: Enhanced user creation with credentials display dialog (copy-able username/password), plan limit awareness (usage badge, limit warning, disabled button at limit)
- **DB Changes**: `onboarding_completed` boolean and `onboarding_progress` jsonb columns on `tenants` table

### Platform Operations Layer (Phase 3)
- **Super Admin Dashboard**: `/platform` route with PlatformLayout, PlatformSidebar — shows tenant overview, revenue chart, AI usage, health stats
- **Platform API Routes**: `GET/POST/PATCH /api/platform/tenants`, `GET /api/platform/analytics`, `GET /api/platform/health`, `GET /api/platform/ai-usage`
- **AI Usage Tracking**: `ai_usage_logs` table tracks all OpenAI calls with tenantId, model, tokens, feature name; logged automatically in all AI routes
- **AI Quota Enforcement**: `server/middleware/ai-quota.ts` — `checkAiQuota` middleware on all AI routes; plan-based defaults (basic=100k, pro=500k, enterprise=unlimited); `GET /api/tenant/ai-quota-status` endpoint
- **Support Impersonation**: Platform admins can impersonate any tenant via `POST /api/platform/impersonate/:tenantId`; session preserves original user; impersonation banner shows in admin UI; all actions audit-logged
- **Platform Navigation**: Platform roles see "Platform Admin" link in admin sidebar; `/platform/*` routes only accessible to `platform_owner`/`platform_admin`
- **Admin User**: admin/admin123 upgraded to `platform_owner` role (was `owner`)

### UI/UX Decisions
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter for routing.
- **Styling**: Shadcn UI, Tailwind CSS, Inter font, with a consistent navy/steel blue theme.
- **Charting**: Recharts for data visualization.
- **Triple Portal System**: Separate interfaces for Admin (AppSidebar), Client (PortalSidebar), and Preparer (PreparerSidebar).
- **Client-friendly Features**: Truck-driver-friendly UI for document signing with a canvas signature pad.

### Technical Implementations
- **Backend**: Express.js with a RESTful API.
- **Database**: PostgreSQL with Drizzle ORM. All tables have `tenant_id` column with indexes.
- **Authentication**: Custom username/password authentication with bcrypt and session-based management; role-based access control with 6 roles (platform_owner, platform_admin, tenant_owner, tenant_admin, client, preparer) plus legacy owner/admin.
- **Service Catalog**: Predefined service items with categories and default pricing.
- **Form Management**: Reusable form templates with auto-fill and status tracking.
- **Notarization Tracking**: System for recording in-house notarization details.
- **Audit Logging**: Comprehensive system-wide logging for all major data operations.
- **Notification System**: In-app notifications and push notifications via Web Push API.
- **PWA Support**: Progressive Web App with manifest.json and service worker for push notifications and mobile/desktop installability.

### Feature Specifications
- **Client Management**: Comprehensive client profiles, prospect pipeline tracking.
- **Service Ticket Management**: Workflow for compliance and business setup services, including document tracking and "blocked" status.
- **Document Management**: Tracking and storage of compliance documents.
- **Invoicing**: Detailed invoicing with line items, multiple statuses, PDF generation, email sending, and automated AR escalation.
- **Chat System**: Client-admin messaging system scoped per client; internal staff-to-staff messaging.
- **Signature Requests**: Management and tracking of documents requiring client signatures.
- **Tax Preparation Intake**: System for collecting tax documents with AI analysis and CSV export.
- **Business Analytics**: Owner-only dashboard with key metrics: revenue, client acquisition, service breakdown, invoice aging, and top clients, enhanced with ticket SLA tracking and detailed AR aging.
- **Employee Performance**: Owner-only grading system tracking staff activity via audit logs, with weighted scoring and trend charts.
- **Recurring Compliance Templates**: System for auto-generating service tickets on recurring schedules.
- **Bookkeeping System**: Subscription-based bookkeeping service including:
    - **Subscription Management**: Admin activation/deactivation per client.
    - **Bank Statement Upload**: CSV upload with intelligent parsing.
    - **AI Transaction Categorization**: OpenAI-powered categorization into trucking-specific categories.
    - **Monthly Financial Summaries**: Auto-generated income/expenses/net summaries.
    - **Preparer Assignment**: Admin assigns tax preparers to client bookkeeping accounts.
    - **Receipt Scanning**: Clients can upload receipt photos with AI extraction of vendor, amount, date, and category.
- **Preparer Portal**: Dedicated portal for tax preparers to review assigned client bookkeeping data, edit transaction categories, manage tax documents, and communicate with clients.
- **Ticket Claim/Lock System**: Auto-expiring lock to prevent multiple employees from working on the same ticket simultaneously.
- **Client Notes System**: Multi-employee timestamped notes on client files, including voice dictation and AI summarization into structured call notes.
- **AI Assistant (Enhanced)**: Dual-role AI assistant providing internal operations support and trucking industry expertise (FMCSA, DOT, IFTA, UCR, IRS regulations), with a "Save to Documents" feature.
- **Knowledge Base**: Internal knowledge library for staff, organized by category, with search functionality and AI integration.
- **Client Portal AI Assistant**: Floating "Help" button in the client portal, providing client-specific assistance, portal navigation, and escalation guidance.
- **Tax Document Approval Workflow**: Status-driven workflow for tax documents, allowing preparers to upload and clients to review, approve, or reject with feedback.

## External Dependencies
- **OpenAI**: Integrated for the AI Chat Assistant, AI analysis of tax documents, and AI transaction categorization.
- **Google Cloud (googleapis)**: For Google Sheets integration using a Google Service Account.
- **Stripe**: Scaffolded for subscription billing (future integration).