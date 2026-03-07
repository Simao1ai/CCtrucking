# Phase 0: Productization Audit & Recommended Multi-Tenant Architecture

## Executive Summary

This document serves dual purposes: (1) a complete inventory and classification of the current platform, and (2) the recommended architectural design for converting it from a CC Trucking-specific operations tool into a configurable, multi-tenant SaaS product. Every table, route, AI integration, background job, and UI component has been audited, classified, and mapped to the recommended multi-tenant architecture.

**Current state:** A mature, single-tenant platform with 30 database tables, 90+ API routes, 6 AI integrations, 3 portals, 2 background schedulers, push notifications, PDF generation, email automation, and a Progressive Web App.

**Recommended tenancy model:** Single shared database with strict `tenant_id` column isolation on all relevant tables. This is the right starting point for cost efficiency, operational simplicity, and speed to market. If an enterprise customer later requires stronger isolation (e.g., dedicated database), the architecture can evolve to support schema-per-tenant or database-per-tenant for specific accounts, but the shared-schema model should be the default and only model at launch.

**Classification key used throughout this document:**
- **CORE** — Platform logic that every tenant needs as-is
- **CONFIGURABLE** — Logic that works for all tenants but needs per-tenant settings
- **MODULE** — Optional feature that tenants can enable/disable
- **CC-SPECIFIC** — Custom logic that only applies to trucking or CC Trucking specifically

---

## 1. Product Layer Definitions

Before classifying individual components, it is important to define the four distinct product layers. These layers are both technically and commercially distinct and should not be conflated.

### Core Platform Capabilities
Functionality that every tenant receives regardless of plan. This is the foundation of the SaaS product and includes: client management, service tickets, documents, invoices, chat/messaging, signature requests, notifications, audit logs, user management, forms, and basic analytics. Core capabilities are not optional and cannot be disabled. They define the minimum viable product.

### Optional Modules
Distinct feature sets that tenants can enable or disable, typically tied to pricing tiers. Each module has its own database tables, API routes, and UI pages. Examples: Bookkeeping (bank statements, categorization, receipts, summaries), Tax Preparation (document upload, AI analysis, preparer portal, approval workflow), Compliance Scheduling (recurring templates, auto-ticket creation), Notarizations, Employee Performance tracking. Modules are commercially significant — they drive plan differentiation and upsell opportunities.

### Industry Packs
Bundles of preconfigured content that adapt the platform to a specific vertical. An industry pack is NOT a module — it is a configuration layer that provides: seeded service catalog items, transaction categories, recurring compliance templates, AI system prompt knowledge, custom client fields (e.g., DOT Number, MC Number for trucking), default form templates, and FAQ/knowledge base content. Industry packs make the platform feel purpose-built for a specific vertical without changing the underlying code. The "Trucking Industry Pack" is the first pack and includes all current CC-specific content. Future packs (freight brokerage, construction, field services) would follow the same pattern.

### Tenant Customization
Per-tenant settings that are neither modules nor industry packs. These include: company branding (name, logo, colors, tagline), contact information, email sender identity, AI assistant instructions/personality, knowledge base articles, custom service catalog items beyond the industry pack defaults, and custom transaction categories. Tenant customization is always available regardless of plan tier.

---

## 2. Module Dependency Matrix

Modules are independent feature sets, but some have dependencies. This matrix defines which modules depend on others, which are standalone, plan tier eligibility, and what happens when a module is disabled.

### Dependencies

| Module | Depends On | Standalone? | Notes |
|--------|-----------|-------------|-------|
| **Core Platform** | None | Yes | Always on. Cannot be disabled. |
| **Bookkeeping** | None | Yes | Operates independently. Requires its own tables (`bookkeeping_subscriptions`, `bank_transactions`, `transaction_categories`, `monthly_summaries`). |
| **Tax Preparation** | None (soft dep on Bookkeeping) | Yes | Can operate without Bookkeeping. However, the "bookkeeping summary for tax prep" feature (`/api/admin/tax-prep/bookkeeping-summary/:clientId`) only works if Bookkeeping is also enabled. If Bookkeeping is disabled, this single endpoint returns empty/unavailable — all other tax prep features work independently. |
| **Compliance Scheduling** | None | Yes | Uses its own tables (`recurring_templates`, `client_recurring_schedules`). Generates service tickets (Core), but works independently. |
| **Notarizations** | None | Yes | Fully standalone. Single table, single UI page. |
| **Employee Performance** | None (reads Audit Logs) | Yes | Reads from `audit_logs` (Core) to calculate scores. Does not create its own data. If disabled, the analytics page simply hides the performance section. |
| **Advanced Analytics** | None (reads Core data) | Yes | Reads from tickets, invoices, documents (Core). Provides enhanced views. Disabling hides the enhanced analytics page. |
| **Preparer Portal** | Bookkeeping OR Tax Prep | No | Requires at least one of Bookkeeping or Tax Preparation to be enabled. Without either, preparers have nothing to access. |

### Plan Tier Mapping (Recommended)

| Module | Basic | Pro | Enterprise |
|--------|-------|-----|-----------|
| Core Platform | Yes | Yes | Yes |
| Compliance Scheduling | Yes | Yes | Yes |
| Notarizations | Yes | Yes | Yes |
| Bookkeeping | No | Yes | Yes |
| Tax Preparation | No | Yes | Yes |
| Preparer Portal | No | Yes | Yes |
| Employee Performance | No | No | Yes |
| Advanced Analytics | No | Yes | Yes |
| AI Features (Chat, Categorization, Receipt Scan) | Limited | Standard | Unlimited |
| White-Label Branding | No | Basic | Full |

### Behavior When Module Is Disabled

| Layer | Behavior |
|-------|----------|
| **Sidebar/Navigation** | Menu items for disabled modules are hidden. No dead links. |
| **API Routes** | Routes for disabled modules return `403 Forbidden` with message: "This feature is not enabled for your account. Contact your administrator to upgrade." API must check module status before processing any request. |
| **Database** | Tables for disabled modules remain in the schema but are not queried. No data is created or modified. Existing data is preserved if a module is later re-enabled. |
| **Background Jobs** | Schedulers skip tenants where the relevant module is disabled (e.g., compliance scheduler skips tenants without Compliance Scheduling; invoice scheduler always runs since invoicing is Core). |
| **AI Features** | If AI module access is restricted by plan, AI routes return a clear "AI not available on your plan" message. Non-AI features continue working. |

---

## 3. Integration Tenancy Matrix

Each external integration must be explicitly defined in terms of credential ownership, plan access, fallback behavior, and offboarding.

| Integration | Credential Level | Plan Access | Fallback if Unavailable | Offboarding |
|------------|-----------------|-------------|------------------------|-------------|
| **OpenAI (AI Chat, Categorization, Receipt Scan, Tax Analysis, Dictation)** | **Platform-level.** Single API key owned by the platform. Per-tenant usage tracked for billing and quota enforcement. | Basic: limited (e.g., 50 AI calls/month). Pro: standard (500/month). Enterprise: unlimited or tenant-provided key. | AI features degrade gracefully: "AI temporarily unavailable" message. Non-AI features unaffected. If tenant quota exhausted: "AI quota reached for this billing period." | AI conversation history purged. Usage logs retained for billing reconciliation per retention policy. |
| **Stripe (Platform Billing)** | **Platform-level.** Single Stripe account for platform subscription billing. | All plans. Required for paid tiers. | If Stripe unavailable: existing subscriptions continue, new signups queued. If payment fails: grace period (7 days), then feature degradation, then suspension after 30 days. | Subscription cancelled. Final invoice generated. Data retained per retention policy before deletion. |
| **Stripe Connect (Tenant-to-Client Billing)** | **Per-tenant.** Each tenant connects their own Stripe account via Stripe Connect (optional). | Pro+ only. Not available on Basic. | Tenants without Stripe Connect can still create invoices and mark them paid manually. Stripe Connect is a convenience, not a requirement. | Tenant's Stripe Connect link severed. Outstanding invoices remain in platform for reference. |
| **SMTP (Email)** | **Platform-level default.** Single platform sender (e.g., `noreply@platform.com`) with tenant-specific reply-to addresses. Per-tenant SMTP available on Enterprise. | All plans. Enterprise: custom SMTP. | If SMTP unavailable: emails queued for retry (3 attempts, exponential backoff). Notification system (in-app + push) continues independently. | Tenant's custom SMTP credentials deleted. Pending emails cancelled. |
| **Google Sheets** | **Per-tenant.** Each tenant provides their own Google service account credentials or connects via OAuth. | Pro+ only. | If credentials missing or invalid: Google Sheets integration page shows "Not connected" with setup instructions. No other features affected. | Tenant's Google credentials deleted. No platform-side access to tenant sheets after disconnection. |
| **Web Push (VAPID)** | **Platform-level.** Single VAPID key pair for the platform. Push notification content is tenant-branded. | All plans. | If push delivery fails: in-app notifications are the fallback. Push failures logged but do not block operations. | Push subscriptions for tenant's users deleted. |
| **File Storage (Uploads)** | **Platform-level infrastructure.** Files partitioned by tenant directory (`uploads/{tenantId}/...`). | All plans. Storage quotas may vary by plan. | If storage quota exceeded: upload fails with clear message. Existing files remain accessible. | All files in `uploads/{tenantId}/` deleted after retention period. Tenant notified before deletion with export window. |

---

## 4. Tenant Settings Schema

Tenant configuration must be structured intentionally. Avoid a single large JSON blob — use first-class columns for critical/indexed fields, structured settings tables for typed configuration, and JSON only for extensible/rarely-queried data.

### `tenants` Table — First-Class Columns

These fields are queried frequently, used in middleware, or needed for indexing:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | varchar (UUID) | Primary key |
| `name` | text, NOT NULL | Company display name (used in UI, emails, PDFs) |
| `slug` | varchar, UNIQUE, NOT NULL | URL-safe identifier (e.g., `cc-trucking`). Used for subdomain routing or URL paths. |
| `status` | text, NOT NULL, default `active` | `active`, `suspended`, `trial`, `cancelled` |
| `plan` | text, NOT NULL, default `basic` | `basic`, `pro`, `enterprise` |
| `industry` | text | Industry vertical identifier (e.g., `trucking`, `construction`). Determines which industry pack content is loaded. |
| `contactEmail` | text, NOT NULL | Primary contact/billing email |
| `contactPhone` | text | Primary contact phone |
| `ownerUserId` | varchar | FK to `users.id` — the tenant owner |
| `createdAt` | timestamp, NOT NULL | |
| `updatedAt` | timestamp, NOT NULL | |

### `tenant_branding` Table — Structured Branding Config

Separate table because branding is a distinct concern, queried on every page load, and may have its own access control (white-label features gated by plan):

| Column | Type | Purpose |
|--------|------|---------|
| `id` | varchar (UUID) | Primary key |
| `tenantId` | varchar, FK, UNIQUE | One-to-one with tenants |
| `companyName` | text | Display name override (may differ from tenant.name) |
| `logoUrl` | text | URL to uploaded logo |
| `primaryColor` | text | HSL or hex primary brand color |
| `accentColor` | text | HSL or hex accent color |
| `tagline` | text | Company tagline (used in emails, PDF footers) |
| `sidebarIcon` | text | Icon name from icon library (default: building icon) |
| `loginMessage` | text | Custom message shown on login page |
| `supportEmail` | text | Where clients send support inquiries |
| `supportPhone` | text | Support phone number |
| `websiteUrl` | text | Tenant's own website URL |
| `address` | text | Company address (for invoices/PDFs) |

### `tenant_settings` Table — Typed Key-Value Configuration

For settings that are typed, enumerable, and may grow over time without schema migration:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | varchar (UUID) | Primary key |
| `tenantId` | varchar, FK | |
| `key` | text, NOT NULL | Setting identifier (e.g., `email.smtp_host`, `ai.custom_instructions`) |
| `value` | text, NOT NULL | Setting value (stored as text, parsed by application based on key) |
| `type` | text, NOT NULL | Data type hint: `string`, `boolean`, `number`, `json` |
| `updatedAt` | timestamp | |
| `updatedBy` | varchar | User who last changed this setting |

**Predefined setting keys (initial set):**

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `email.smtp_host` | string | (platform default) | Custom SMTP server |
| `email.smtp_port` | number | 587 | |
| `email.smtp_user` | string | (platform default) | |
| `email.smtp_password` | string | (encrypted) | |
| `email.from_name` | string | (tenant companyName) | |
| `email.reply_to` | string | (tenant contactEmail) | |
| `ai.custom_instructions` | string | (none) | Tenant-owner-editable AI prompt additions |
| `ai.model_preference` | string | `default` | `default`, `fast`, `advanced` |
| `ai.monthly_quota` | number | (plan default) | AI call quota per month |
| `billing.stripe_customer_id` | string | | Platform billing customer |
| `billing.stripe_subscription_id` | string | | Platform billing subscription |
| `billing.grace_period_days` | number | 7 | Days before feature degradation on failed payment |
| `modules.bookkeeping` | boolean | false | Is bookkeeping module enabled? |
| `modules.tax_preparation` | boolean | false | Is tax prep module enabled? |
| `modules.compliance_scheduling` | boolean | true | Is compliance scheduling enabled? |
| `modules.notarizations` | boolean | true | Is notarization tracking enabled? |
| `modules.employee_performance` | boolean | false | Is employee performance enabled? |
| `modules.advanced_analytics` | boolean | false | Is advanced analytics enabled? |

### JSON Fields — Extensible Data

Used only on the `tenants` table for rarely-queried, extensible data:

| Column | Type | Purpose |
|--------|------|---------|
| `metadata` | jsonb | Freeform metadata: onboarding completion flags, feature usage stats, internal notes from platform support. NOT used for configuration that affects application behavior. |

**Rule:** If a setting affects application behavior (routing, feature gating, branding, AI behavior), it belongs in a first-class column or `tenant_settings`. JSON is for supplementary/metadata purposes only.

---

## 5. Custom Fields Strategy

The current platform has trucking-specific fields (`dotNumber`, `mcNumber`, `einNumber`) hardcoded on the `clients` table. To support multiple verticals, a custom fields system is needed.

### Architecture

**`custom_field_definitions` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | varchar (UUID) | Primary key |
| `tenantId` | varchar, FK | Which tenant this field belongs to |
| `entityType` | text, NOT NULL | Which entity this field is for: `client`, `ticket`, `invoice` |
| `fieldName` | text, NOT NULL | Internal field identifier (e.g., `dot_number`) |
| `fieldLabel` | text, NOT NULL | Display label (e.g., "DOT Number") |
| `fieldType` | text, NOT NULL | `text`, `number`, `date`, `select`, `multiselect`, `boolean`, `url`, `email`, `phone` |
| `options` | jsonb | For `select`/`multiselect`: array of allowed values |
| `required` | boolean, default false | Is this field required when creating/editing the entity? |
| `sortOrder` | integer, default 0 | Display order in forms and detail views |
| `isSearchable` | boolean, default true | Can this field be searched/filtered? |
| `isVisibleInList` | boolean, default false | Show this field in list/table views? |
| `industryPackSource` | text | If this field came from an industry pack (e.g., `trucking`), record that here. NULL for custom-created fields. |
| `createdAt` | timestamp | |

**`custom_field_values` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | varchar (UUID) | Primary key |
| `tenantId` | varchar, FK | Denormalized for query safety |
| `fieldDefinitionId` | varchar, FK | Which field this value is for |
| `entityType` | text, NOT NULL | Matches definition's entityType |
| `entityId` | varchar, NOT NULL | ID of the client/ticket/invoice this value belongs to |
| `value` | text | The actual field value (stored as text, parsed by application based on fieldType) |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Unique constraint:** (`fieldDefinitionId`, `entityId`) — one value per field per entity.

### Capabilities

| Capability | Supported | Notes |
|-----------|-----------|-------|
| **Validation** | Yes | `required` flag enforced on create/update. `fieldType` determines validation rules (e.g., `number` must be numeric, `email` must be valid format, `select` must be from options list). |
| **Search/Filter** | Yes | `isSearchable` fields indexed via a GIN index on `(tenantId, entityType, fieldDefinitionId, value)`. Supports exact match and ILIKE text search. |
| **Export (CSV/JSON)** | Yes | Custom fields included as additional columns in CSV exports and as nested objects in JSON exports. |
| **Import** | Yes | Import files can include custom field columns. Unrecognized columns are ignored with a warning. |
| **PDF/Form support** | Yes | Custom fields rendered in invoice PDFs, form templates, and client detail views. Position determined by `sortOrder`. |
| **AI context** | Yes | Custom field values for a client are included in AI prompt context when the AI assistant is asked about that client. Field labels and values are passed, not internal identifiers. |
| **Industry pack seeding** | Yes | When a trucking industry pack is applied to a tenant, it creates field definitions for DOT Number, MC Number, EIN with `industryPackSource: "trucking"`. Pack-sourced fields can be modified but carry the source tag for reference. |

### Migration from Hardcoded Fields

The existing `dotNumber`, `mcNumber`, `einNumber` columns on the `clients` table will be migrated as follows:
1. Create custom field definitions for CC Trucking's tenant (DOT Number, MC Number, EIN)
2. Copy existing values from `clients.dotNumber/mcNumber/einNumber` into `custom_field_values`
3. Update all UI components to read from custom fields instead of hardcoded columns
4. Keep the hardcoded columns in the schema temporarily for backward compatibility, with a deprecation plan to remove them after all tenants are migrated

---

## 6. Import/Export Architecture

### Exportable Data

| Data Type | Formats | Scope | Notes |
|-----------|---------|-------|-------|
| **Clients** | CSV, JSON | Per-tenant | Includes all client fields + custom field values |
| **Service Tickets** | CSV, JSON | Per-tenant, or per-client | Includes status, dates, assignee, custom fields |
| **Invoices** | CSV, JSON, PDF (individual) | Per-tenant, or per-client | CSV: summary rows. PDF: individual invoice documents. |
| **Invoice Line Items** | CSV | Per-tenant, or per-invoice | Detailed line item export |
| **Documents** | JSON (metadata) + ZIP (files) | Per-tenant, or per-client | Metadata as JSON, actual files as ZIP archive |
| **Bank Transactions** | CSV, JSON | Per-tenant, or per-client, or per-month | Standard bank transaction format |
| **Tax Documents** | JSON (metadata) + ZIP (files) | Per-tenant, or per-client, or per-year | Metadata + physical files |
| **Knowledge Base Articles** | JSON, Markdown | Per-tenant | Full article content |
| **Form Templates** | JSON | Per-tenant | Template content and metadata |
| **Audit Logs** | CSV, JSON | Per-tenant, date-filtered | Action history |
| **Custom Field Definitions** | JSON | Per-tenant | Field schema only (values exported with entities) |
| **Monthly Summaries** | CSV, JSON | Per-tenant, or per-client | Financial summary data |
| **Full Tenant Export** | ZIP archive | Entire tenant | All of the above in a single structured archive. Directory structure: `/clients/`, `/invoices/`, `/documents/`, `/bookkeeping/`, `/tax/`, `/config/`, `/audit/` |

### Importable Data

| Data Type | Formats | Notes |
|-----------|---------|-------|
| **Clients** | CSV | Column mapping UI. Custom fields matched by field label. Unrecognized columns ignored with warning. Duplicate detection by company name + email. |
| **Bank Transactions** | CSV | Existing bank statement parser. Supports date/description/amount and debit/credit column formats. |
| **Service Catalog** | JSON | Industry pack installer uses this format. Custom import also supported. |
| **Knowledge Base Articles** | JSON, Markdown | Bulk article import for onboarding. |
| **Form Templates** | JSON | Template import during onboarding setup. |
| **Transaction Categories** | JSON | Category set import (from industry pack or custom). |
| **Recurring Templates** | JSON | Compliance schedule import (from industry pack or custom). |

### File Handling During Export/Import

| Scenario | Handling |
|----------|---------|
| **Export with files** | Physical files (tax docs, receipts) bundled as ZIP. Metadata references relative file paths within the ZIP. |
| **Export without files** | Metadata-only export (CSV/JSON) includes file names and sizes but not the actual files. Useful for data auditing. |
| **Import with files** | ZIP upload with metadata JSON + files directory. Files stored in tenant-partitioned storage. |
| **Onboarding import** | Guided wizard: upload CSV of clients → map columns → preview → confirm. Custom fields auto-detected or mapped manually. |
| **Offboarding export** | Full tenant export triggered by tenant owner or platform admin. Generates complete ZIP archive. Available for download for 30 days after account closure. |

---

## 7. Database Schema Inventory (30 Tables)

### Core Platform Tables (No Industry-Specific Logic)

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `users` | id, username, password, email, firstName, lastName, profileImageUrl, role, clientId, createdAt, updatedAt | CORE | Add `tenantId`. Role model needs redesign. |
| `sessions` | sid, sess, expire | CORE | No schema change required. However, tenant context resolution from session data, impersonation behavior for platform admins, stale-session invalidation on tenant suspension or role change, and support/admin cross-tenant access patterns all need explicit design and testing. |
| `clients` | id, companyName, contactName, email, phone, address, city, state, zipCode, status, notes, pipelineStage, nextActionDate, nextActionNote | CORE (mostly) | Add `tenantId`. See below for CC-specific columns. |
| `clients` (cont.) | dotNumber, mcNumber, einNumber | CC-SPECIFIC | These are trucking-specific fields. Migrate to custom fields system (see Section 5). |
| `service_tickets` | id, clientId, title, serviceType, status, priority, description, dueDate, assignedTo, lockedBy, lockedAt, lockedByName, createdAt | CORE | Add `tenantId`. `serviceType` values are currently trucking-specific but the field itself is generic. |
| `documents` | id, clientId, ticketId, name, type, status, uploadedAt | CORE | Add `tenantId`. |
| `invoices` | id, clientId, ticketId, invoiceNumber, amount, status, dueDate, paidDate, description, lastReminderSent, reminderCount, createdAt | CORE | Add `tenantId`. |
| `invoice_line_items` | id, invoiceId, serviceItemId, description, quantity, unitPrice, amount, createdAt | CORE | Scoped via invoice's tenantId. Consider adding direct `tenantId` for reporting queries and index performance (see note below). |
| `chat_messages` | id, clientId, senderId, senderName, senderRole, message, createdAt | CORE | Scoped via client's tenantId. Consider adding direct `tenantId` for operational safety. |
| `staff_messages` | id, senderId, senderName, recipientId, recipientName, message, read, createdAt | CORE | Add `tenantId` — staff messages must be tenant-scoped. |
| `signature_requests` | id, clientId, documentName, documentDescription, documentContent, status, sentAt, signedAt, signerName, signatureData, reminderSentAt, reminderMethod, createdBy | CORE | Scoped via client's tenantId. Consider adding direct `tenantId` for reporting. |
| `notifications` | id, userId, title, message, type, link, read, createdAt | CORE | Scoped by userId. Consider direct `tenantId` for bulk operations and admin notification management. |
| `form_templates` | id, name, description, content, category, createdBy, createdAt | CONFIGURABLE | Add `tenantId`. Each tenant has their own form templates. |
| `filled_forms` | id, templateId, clientId, name, filledContent, status, filledBy, signatureRequestId, createdAt, updatedAt | CORE | Scoped via client's tenantId. |
| `notarizations` | id, clientId, documentName, documentDescription, notaryName, notaryCommission, notarizationDate, expirationDate, status, notes, performedBy, createdAt | MODULE | Add `tenantId`. Not all service businesses need notarization. |
| `audit_logs` | id, userId, userName, action, entityType, entityId, details, createdAt | CORE | Add `tenantId`. Critical for tenant isolation in audit views and platform-level monitoring. |
| `service_items` | id, name, description, category, defaultPrice, isActive, createdAt | CONFIGURABLE | Add `tenantId`. Each tenant defines their own service catalog. |
| `knowledge_articles` | id, title, content, category, pinned, createdBy, createdByName, createdAt, updatedAt | CONFIGURABLE | Add `tenantId`. Each tenant has their own knowledge base. |
| `client_notes` | id, clientId, authorId, authorName, content, createdAt, updatedAt | CORE | Scoped via client's tenantId. |
| `push_subscriptions` | id, userId, endpoint, p256dh, auth, createdAt | CORE | Scoped via user's tenantId. |
| `conversations` | id, title, createdAt | CORE (Replit integration) | Likely unused in production — part of Replit auth integration scaffolding. |
| `messages` | id, conversationId, role, content, createdAt | CORE (Replit integration) | Same as above. |

### Bookkeeping Module Tables

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `bookkeeping_subscriptions` | id, clientId, plan, price, status, stripeSubscriptionId, stripeCustomerId, preparerId, startDate, endDate, createdAt | MODULE | Add `tenantId`. This is an optional paid module. |
| `bank_transactions` | id, clientId, transactionDate, description, amount, originalCategory, aiCategory, aiConfidence, manualCategory, reviewed, bankName, accountLast4, statementMonth, statementYear, source, receiptData, createdAt | MODULE | Scoped via client's tenantId. Consider direct `tenantId` for volume reporting and billing calculations. |
| `transaction_categories` | id, name, description, parentCategory, isDefault, createdAt | CONFIGURABLE | Add `tenantId`. Default categories are currently trucking-specific (Fuel, Tolls, Freight Revenue, etc.). Each tenant/vertical needs their own. |
| `monthly_summaries` | id, clientId, month, year, totalIncome, totalExpenses, netIncome, categoryBreakdown, generatedAt, createdAt | MODULE | Scoped via client's tenantId. Part of bookkeeping module. |
| `preparer_assignments` | id, preparerId, clientId, assignedBy, createdAt | MODULE | Add `tenantId`. Part of bookkeeping/tax module. |

### Tax Preparation Module Tables

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `tax_documents` | id, clientId, taxYear, documentType, payerName, documentContent, fileName, fileType, filePath, fileSize, extractedData, totalIncome, federalWithholding, stateWithholding, ssnLastFour, einNumber, riskFlags, confidenceLevel, notes, status, uploadedBy, uploadedByRole, rejectionFeedback, approvedAt, analyzedAt, createdAt, updatedAt | MODULE | Add `tenantId`. File storage needs tenant partitioning. |

### Compliance Scheduling Module Tables

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `recurring_templates` | id, name, serviceType, description, priority, frequencyType, daysBefore, requiredDocuments, isActive, createdAt | CONFIGURABLE | Add `tenantId`. Current templates are trucking-specific (IFTA quarterly, UCR annual, etc.). Each tenant defines their own. |
| `client_recurring_schedules` | id, clientId, templateId, nextDueDate, lastGeneratedDate, isActive, createdAt | CONFIGURABLE | Scoped via client's tenantId. |
| `ticket_required_documents` | id, ticketId, documentName, documentType, status, documentId, createdAt | CORE | Scoped via ticket's tenantId. |

### New Tables for Multi-Tenant Architecture

| Table | Purpose |
|-------|---------|
| `tenants` | Core tenant identity, status, plan, industry (see Section 4) |
| `tenant_branding` | Per-tenant branding configuration (see Section 4) |
| `tenant_settings` | Key-value typed settings per tenant (see Section 4) |
| `custom_field_definitions` | Custom field schema per tenant (see Section 5) |
| `custom_field_values` | Custom field data per entity (see Section 5) |
| `ai_usage_logs` | Per-tenant AI call tracking for billing and audit (see Section 10) |
| `platform_audit_logs` | Platform-level actions (tenant creation, impersonation, etc.) separate from tenant audit logs |

### Direct vs. Inherited Tenant Ownership

**Direct tenantId needed (17+ tables):** users, clients, service_tickets, documents, invoices, staff_messages, form_templates, notarizations, audit_logs, service_items, knowledge_articles, bookkeeping_subscriptions, transaction_categories, tax_documents, recurring_templates, preparer_assignments, client_recurring_schedules

**Scoped via parent relationship (13 tables):** invoice_line_items (via invoice), chat_messages (via client), filled_forms (via client), signature_requests (via client), notifications (via user), client_notes (via client), push_subscriptions (via user), bank_transactions (via client), monthly_summaries (via client), ticket_required_documents (via ticket), sessions (via user), conversations, messages

**Important note on parent-scoped tables:** While tenant ownership can technically be inferred through parent joins, some of these tables would benefit from a direct `tenantId` column for safety, indexing, reporting, and operational simplicity. In particular, the following child tables are strong candidates for direct `tenantId` even though it is technically redundant:
- `invoice_line_items` — high volume, frequently aggregated in financial reports
- `bank_transactions` — highest volume table, critical for billing calculations and performance
- `chat_messages` — needed for platform-level support visibility
- `notifications` — needed for bulk admin operations and cross-tenant platform notifications
- `audit_logs` already has direct `tenantId` above

Adding direct `tenantId` to these tables costs minimal storage but significantly reduces query complexity, improves index efficiency, and eliminates the risk of join-path bugs exposing cross-tenant data. The recommendation is to add direct `tenantId` to all tables that will be queried independently (not just through their parent), even if it introduces slight denormalization.

---

## 8. API Route Inventory (90+ Routes)

### Authentication & User Management (6 routes)

| Route | Method | Middleware | Classification |
|-------|--------|-----------|---------------|
| `/api/auth/me` | GET | isAuthenticated | CORE — needs tenant context |
| `/api/admin/create-user` | POST | isAdmin | CORE — must create user within tenant |
| `/api/auth/assign-client` | PATCH | isAdmin | CORE — must validate client belongs to same tenant |
| `/api/auth/set-admin` | PATCH | isAdmin | CORE — role assignment within tenant |
| `/api/admin/users/:id` | DELETE | isAdmin | CORE — prevent cross-tenant deletion |
| `/api/admin/users` | GET | isAdmin | CORE — filter by tenant |

### Client & Ticket Management (14 routes)

| Route | Method | Middleware | Classification |
|-------|--------|-----------|---------------|
| `/api/clients` | GET | isAdmin | CORE — filter by tenant |
| `/api/clients/:id` | GET | isAdmin | CORE — validate tenant ownership |
| `/api/clients/:id/summary` | GET | isAdmin | CORE — validate tenant ownership |
| `/api/clients` | POST | isAdmin | CORE — assign tenantId |
| `/api/clients/:id` | PATCH | isAdmin | CORE — validate tenant ownership |
| `/api/clients/:id` | DELETE | isAdmin | CORE — validate tenant ownership |
| `/api/tickets` | GET | isAdmin | CORE — filter by tenant |
| `/api/tickets/:id` | GET | isAdmin | CORE — validate tenant ownership |
| `/api/tickets` | POST | isAdmin | CORE — assign tenantId |
| `/api/tickets/:id` | PATCH | isAdmin | CORE — validate tenant ownership |
| `/api/tickets/:id/lock` | GET | isAdmin | CORE — validate tenant ownership |
| `/api/tickets/:id/claim` | POST | isAdmin | CORE — validate tenant ownership |
| `/api/tickets/:id/release` | POST | isAdmin | CORE — validate tenant ownership |
| `/api/clients/:id/notes/*` | CRUD | isAdmin | CORE — validate tenant ownership |

### Document, Invoice, Signature Management (~15 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/documents` | GET/POST | CORE — filter/assign by tenant |
| `/api/documents/:id` | GET/PATCH | CORE — validate tenant |
| `/api/invoices` | GET/POST | CORE — filter/assign by tenant |
| `/api/invoices/:id` | GET/PATCH | CORE — validate tenant |
| `/api/invoices/:id/line-items` | GET/POST | CORE — scoped via invoice |
| `/api/invoices/:id/pdf` | GET | CORE — validate tenant, tenant branding in PDF |
| `/api/invoices/:id/send-email` | POST | CONFIGURABLE — tenant email settings |
| `/api/admin/signatures` | GET/POST/PATCH | CORE — filter by tenant |

### Knowledge Base (6 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/knowledge-base` | GET | CONFIGURABLE — filter by tenant |
| `/api/admin/knowledge-base/search` | GET | CONFIGURABLE — filter by tenant |
| `/api/admin/knowledge-base/:id` | GET | CONFIGURABLE — validate tenant |
| `/api/admin/knowledge-base` | POST | CONFIGURABLE — assign tenantId |
| `/api/admin/knowledge-base/:id` | PATCH | CONFIGURABLE — validate tenant |
| `/api/admin/knowledge-base/:id` | DELETE | CONFIGURABLE — validate tenant |

### Bookkeeping Module (~15 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/bookkeeping/subscriptions` | GET/POST/PATCH | MODULE — tenant-scoped |
| `/api/admin/bookkeeping/transactions` | GET/PATCH/DELETE | MODULE — tenant-scoped |
| `/api/admin/bookkeeping/upload-statement/:clientId` | POST | MODULE — tenant-scoped |
| `/api/admin/bookkeeping/ai-categorize/:clientId` | POST | MODULE — tenant-scoped, AI usage tracking |
| `/api/admin/bookkeeping/receipt-upload/:clientId` | POST | MODULE — tenant-scoped |
| `/api/admin/bookkeeping/generate-summary/:clientId` | POST | MODULE — tenant-scoped |
| `/api/bookkeeping/categories` | GET | CONFIGURABLE — tenant-scoped categories |

### Tax Preparation Module (~10 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/tax-documents` | GET | MODULE — tenant-scoped |
| `/api/admin/tax-documents/upload` | POST | MODULE — tenant file storage |
| `/api/admin/tax-documents/:id/analyze` | POST | MODULE — AI usage tracking |
| `/api/admin/tax-documents/:id/download` | GET | MODULE — tenant file isolation |
| `/api/admin/tax-summary/:clientId` | GET | MODULE — tenant-scoped |

### Forms, Notarizations, Audit (~10 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/form-templates` | CRUD | CONFIGURABLE — tenant-scoped templates |
| `/api/admin/filled-forms` | CRUD | CORE — tenant-scoped |
| `/api/admin/notarizations` | CRUD | MODULE — tenant-scoped |
| `/api/admin/audit-logs` | GET | CORE — tenant-scoped |

### Analytics (2 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/analytics` | GET | CORE — tenant-scoped. Platform analytics is a separate concern. |
| `/api/admin/analytics/enhanced` | GET | CORE — tenant-scoped |

### AI Chat (2 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/admin/ai-chat` | POST | CONFIGURABLE — needs tenant-specific data + knowledge base + AI config |
| `/api/portal/ai-chat` | POST | CONFIGURABLE — needs tenant-specific client data + knowledge base |

### Client Portal (~20 routes)

All portal routes use `isClient` middleware which sets `req.clientId` from the logged-in user. In multi-tenant mode, the client's tenant is implicitly determined by the user's tenantId. **Classification: CORE** — all portal routes are tenant-safe by design as long as users have tenantId.

### Preparer Portal (~10 routes)

All preparer routes validate assignment via `getPreparerAssignments(dbUser.id)`. **Classification: MODULE** — part of the tax/bookkeeping module. Needs tenantId on preparer_assignments.

### Notifications & Push (4 routes)

| Route | Method | Classification |
|-------|--------|---------------|
| `/api/notifications` | GET | CORE — already user-scoped |
| `/api/notifications/:id/read` | PATCH | CORE — already user-scoped |
| `/api/push/subscribe` | POST | CORE — tenant VAPID keys needed |
| `/api/notifications/mark-all-read` | PATCH | CORE — already user-scoped |

---

## 9. AI Integration Audit (6 AI Features)

| Feature | Model | Data Accessed | Classification | Tenant Risk |
|---------|-------|--------------|---------------|-------------|
| **Admin AI Chat** | gpt-5.2 | ALL clients, ALL tickets, ALL invoices, ALL documents, service catalog, knowledge base | CONFIGURABLE | **HIGH** — Currently loads entire database into prompt. Must scope to tenant data only. Prompt includes CC-specific trucking industry knowledge. |
| **Client Portal AI Chat** | gpt-5.2 | Client's own tickets, invoices, docs, knowledge base (minus HR), service catalog | CONFIGURABLE | **MEDIUM** — Already client-scoped but knowledge base is unfiltered by tenant. Prompt references "CC Trucking Services" by name. |
| **Transaction Categorization** | gpt-4o-mini | Transaction descriptions, category names | MODULE | **LOW** — Generic categorization. Categories are the tenant-configurable part. |
| **Receipt Scanning** | gpt-4o-mini (vision) | Receipt image, category names | MODULE | **LOW** — Stateless vision call. Category list needs tenant scoping. |
| **Tax Document Analysis** | gpt-5.2 | Document content, client name | MODULE | **LOW** — Per-document call with minimal context. |
| **Voice Dictation** | gpt-4o-mini-transcribe + gpt-4o-mini | Audio file, client name/contact | CORE | **LOW** — Per-note call with minimal context. |

### AI Tenant Architecture Requirements

1. **System prompts** must be tenant-configurable (company name, industry context, custom instructions)
2. **Data injection** must be scoped by tenantId (the admin AI chat currently loads ALL data globally)
3. **Knowledge base** must be tenant-scoped (each tenant has their own articles)
4. **AI usage tracking** needed for billing (per-tenant token/call counts)
5. **Industry knowledge** (FMCSA, DOT, IFTA, etc.) is currently hardcoded in the prompt — this should be delivered via industry pack configuration, not hardcoded
6. **Model selection** could be tenant-configurable (some tenants may want cheaper models)

---

## 10. AI Governance & Safety Rules

AI is one of the highest-risk areas for data leakage, inconsistent behavior, and tenant trust violations. This section defines the governance model that must be designed before any multi-tenant AI code is written.

### Prompt Governance

| Rule | Detail |
|------|--------|
| **Who can edit tenant AI instructions** | Only `tenant_owner` can modify their tenant's AI system prompt additions. `tenant_admin` can view but not edit. Platform admins can override in emergencies. |
| **Prompt template structure** | AI prompts must follow a layered structure: (1) Platform base prompt (not tenant-editable), (2) Industry pack knowledge (determined by tenant's industry setting), (3) Tenant-specific custom instructions (editable by tenant owner), (4) Live business data (auto-injected, tenant-scoped). Tenants can only modify layer 3. Layers 1 and 2 are platform-controlled. |
| **Prompt review/approval** | At launch, no approval workflow is required. However, all custom prompt changes should be logged in the audit trail. If tenant-provided instructions are found to cause harmful output, platform admin can override or disable custom instructions. |

### Data Isolation for AI

| Rule | Detail |
|------|--------|
| **Data loading before prompt construction** | All data injected into AI prompts (clients, tickets, invoices, knowledge articles) must be loaded with explicit `tenantId` filtering. No global queries are permitted in any AI route. |
| **Knowledge base isolation** | Knowledge base articles are tenant-scoped. Industry pack articles are read-only copies seeded per tenant. Tenants cannot see or reference other tenants' articles. |
| **Message history isolation** | AI conversation history (currently in-memory per userId) must be tenant-scoped. If conversations are persisted, they must have tenantId. |

### AI Logging & Audit

| Rule | Detail |
|------|--------|
| **Logging requirements** | Every AI call must log: tenantId, userId, feature type (chat/categorization/receipt/etc.), model used, token count (input/output), timestamp. This data feeds both audit and billing. |
| **Data retention** | AI conversation history should have a configurable retention period per tenant (default: 90 days). Expired history should be purged. Raw prompts with business data should NOT be stored long-term. |
| **Review expectations** | Platform admins should be able to view aggregate AI usage per tenant (call counts, token usage, error rates) but NOT read the content of AI conversations without explicit support escalation. |

### Safety & Fallback

| Rule | Detail |
|------|--------|
| **Missing tenant AI config** | If a tenant has no custom AI instructions, the system falls back to the platform base prompt + industry pack knowledge. No AI feature should fail or behave unpredictably because tenant config is missing. |
| **Prompt contamination safeguards** | Tenant-provided knowledge base content is injected as reference material, not as system instructions. The AI prompt structure must clearly separate "instructions" (platform-controlled) from "reference data" (tenant-provided) to prevent prompt injection via knowledge articles. |
| **AI feature degradation** | If a tenant's AI quota is exhausted or the AI service is unavailable, features should degrade gracefully: show a clear "AI unavailable" message rather than failing silently or falling back to incorrect behavior. |
| **Content moderation** | Platform base prompt should include instructions to refuse harmful, illegal, or off-topic requests regardless of tenant instructions. This is non-negotiable platform policy. |

---

## 11. Role & Permission Model Audit

### Current Roles (4)

| Role | Access Level | Description |
|------|-------------|-------------|
| `owner` | Full admin + analytics + employee performance + delete permissions | Single super-user per installation |
| `admin` | Full CRUD on all entities except analytics/employee views | Staff members |
| `client` | Portal access only, scoped to own data via clientId on user record | External clients |
| `preparer` | Preparer portal only, scoped to assigned clients | External tax preparers |

### Proposed Multi-Tenant Role Model

#### Launch-Required Roles (6)

| Role | Scope | Description |
|------|-------|-------------|
| `platform_owner` | Global | YOU — manages all tenants, platform billing, platform config, can impersonate |
| `platform_admin` | Global | Platform support staff — can view tenants, assist tenants, monitor health |
| `tenant_owner` | Per-tenant | CC Trucking's owner — full access within their tenant including billing, users, settings |
| `tenant_admin` | Per-tenant | CC Trucking's staff — CRUD within their tenant, cannot manage tenant billing or users |
| `client` | Per-tenant, per-client | External client of a specific tenant |
| `preparer` | Per-tenant, per-assignment | Tax preparer assigned to specific clients within a tenant |

#### Later-Stage Optional Roles (2)

| Role | Scope | Description | When to Add |
|------|-------|-------------|-------------|
| `tenant_manager` | Per-tenant | Limited admin — can manage entities but not users, billing, or settings | When tenants request granular permission control |
| `auditor` | Per-tenant, read-only | Read-only access for compliance review, external accountants, etc. | When compliance/audit use cases emerge |

### Middleware Changes Required

Current middleware functions that need tenant awareness:
- `isAuthenticated` — needs to set `req.tenantId` from user record
- `isAdmin` — needs to check `tenant_admin` or `tenant_owner` within the correct tenant
- `isOwner` — needs to distinguish `platform_owner` from `tenant_owner`
- `isClient` — works as-is if user has tenantId
- `isPreparer` — works as-is if preparer_assignments have tenantId

### New Middleware Needed
- `isPlatformAdmin` — for platform-level routes
- `tenantScope` — automatically filters all queries by `req.tenantId`
- `canAccessTenant(tenantId)` — for platform admins accessing specific tenant data

---

## 12. Storage, Jobs, Notifications & Integrations Audit

### File Storage

| Current State | Multi-Tenant Change |
|--------------|-------------------|
| Tax documents stored in `uploads/tax-documents/` flat directory | Partition by tenant: `uploads/{tenantId}/tax-documents/` |
| Receipt images stored in memory (multer memoryStorage) | No change needed — processed and discarded |
| Signature data stored as base64 in database | No change needed — already in DB |
| No tenant isolation on file paths | Add tenant prefix to all file operations |

### Background Jobs

| Job | Frequency | Current Scope | Multi-Tenant Change |
|-----|-----------|--------------|-------------------|
| Invoice Reminder Scheduler | Every 6 hours | ALL invoices globally | Must iterate per tenant, use tenant email settings |
| Recurring Compliance Scheduler | Every 12 hours | ALL schedules globally | Must iterate per tenant |

Both schedulers currently run a single global query. In multi-tenant mode, they must either:
- Query with tenant joins and group operations by tenant, OR
- Iterate over active tenants and run scoped queries per tenant

**Recommendation:** Query globally with tenant joins for efficiency, but use tenant-specific settings (email config, branding) per tenant when sending notifications.

### Email System

| Current State | Multi-Tenant Change |
|--------------|-------------------|
| Single Outlook SMTP account (env: SMTP_EMAIL, SMTP_PASSWORD) | Per-tenant SMTP settings or a shared platform sender with tenant reply-to |
| Hardcoded "CC Trucking Services" in email templates | Template variables from tenant branding config |
| Invoice PDF has hardcoded CC Trucking header | PDF generation must use tenant branding |

### Push Notifications

| Current State | Multi-Tenant Change |
|--------------|-------------------|
| Single VAPID key pair for all push subscriptions | Could remain shared (VAPID is for the platform) but notification content must be tenant-branded |
| Notification routing by userId | Works as-is — users belong to tenants |

### External Integrations

| Integration | Current State | Multi-Tenant Change |
|------------|--------------|-------------------|
| OpenAI (AI Integrations) | Single API key via Replit integration | Shared key with per-tenant usage tracking, OR per-tenant API keys |
| Stripe | Scaffolded but not connected | Two-tier Stripe: platform billing (tenant subscriptions) + tenant billing (client bookkeeping) via Stripe Connect |
| Google Sheets | Single service account key | Per-tenant credentials or shared with tenant-scoped sheet access |
| SMTP (Outlook) | Single account | Per-tenant SMTP or shared with custom reply-to addresses |

---

## 13. White-Label Depth Definition

White-labeling has multiple levels of depth. This section defines what is included in standard branding (available to all tenants) versus premium white-label features (gated by plan tier).

### Standard Branding (All Plans)

Available to every tenant at no additional cost:

| Element | What's Customizable |
|---------|-------------------|
| **Company name** | Displayed in sidebar headers, page titles, login page |
| **Primary color** | Applied to sidebar, buttons, and accent elements via CSS variable override |
| **Contact info** | Email, phone, address shown in portal footer and contact pages |
| **Tagline** | Short tagline shown in email footers and PDF invoices |

### Pro Branding (Pro Plan)

Available on Pro tier and above:

| Element | What's Customizable |
|---------|-------------------|
| **Logo** | Custom logo replaces default icon in sidebars, login page, and email headers |
| **Accent color** | Secondary color for additional brand consistency |
| **PDF invoices** | Company logo, name, address, and tagline rendered on invoice PDFs |
| **Email sender name** | Custom "From" name on invoice and notification emails (uses platform sender address with custom reply-to) |
| **Login page message** | Custom welcome/instructions text on the login page |
| **Knowledge base branding** | Articles and search page show tenant's company name |

### Enterprise White-Label (Enterprise Plan)

Full white-label experience:

| Element | What's Customizable |
|---------|-------------------|
| **Custom subdomain** | `cctrucking.platform.com` or similar. Tenant accessed via their own subdomain. |
| **Custom domain** | `app.cctruckingservices.com` — full custom domain with platform-managed SSL. |
| **Custom SMTP** | Emails sent from tenant's own email server/address. No platform branding visible in email headers. |
| **PWA branding** | Custom PWA name, icons, and splash screen. App installs as tenant's brand on mobile/desktop. |
| **Service worker branding** | Push notification titles and icons use tenant branding. |
| **Support/contact branding** | "Powered by [Platform]" footer can be hidden. All support references point to tenant's own support channels. |
| **Favicon** | Custom browser tab icon |

### What Is NOT Customizable (Platform-Controlled)

| Element | Reason |
|---------|--------|
| **UI layout and component structure** | Consistency, maintainability, and testing. Tenants get branding, not custom UIs. |
| **Feature behavior** | How invoicing, ticketing, bookkeeping, etc. work is platform-defined. Tenants cannot change business logic. |
| **AI base prompt** | Platform safety and quality rules are not tenant-editable (see AI Governance). |
| **Data schema** | Tenants cannot add database tables. Custom fields cover extensibility. |
| **Security policies** | Session handling, password requirements, encryption are platform-controlled. |

---

## 14. Hardcoded CC Trucking References

### Server-Side (Must Change)

| File | What's Hardcoded | Change Type |
|------|-----------------|-------------|
| `server/routes.ts` | VAPID mailto: `admin@cctrucking.com` | CONFIGURABLE — per-tenant or platform email |
| `server/routes.ts` | AI system prompts: "CC Trucking Services" (3 locations) | CONFIGURABLE — tenant company name in prompts |
| `server/routes.ts` | Trucking industry knowledge (~80 lines of FMCSA/DOT/IFTA content) | CC-SPECIFIC — should be industry pack content, not hardcoded |
| `server/invoice-email.ts` | Email From name, HTML headers, company tagline | CONFIGURABLE — per-tenant branding |
| `server/invoice-pdf.ts` | PDF header: "CC TRUCKING SERVICES", footer text | CONFIGURABLE — per-tenant branding |
| `server/seed.ts` | Default users (admin@cctrucking.com), mock clients, trucking services | CC-SPECIFIC — seed data becomes "Trucking Starter Pack" |

### Client-Side (Must Change)

| File | What's Hardcoded | Change Type |
|------|-----------------|-------------|
| `client/index.html` | `<title>CC Trucking Services</title>`, meta descriptions | CONFIGURABLE — from tenant settings or platform default |
| `client/public/manifest.json` | PWA name: "CC Trucking Services" | CONFIGURABLE — dynamically generated per tenant |
| `client/public/sw.js` | Notification title: "CC Trucking Services" | CONFIGURABLE — from notification payload |
| `client/src/App.tsx` | No direct brand text but imports branded sidebars | CONFIGURABLE — sidebars read from tenant context |
| `client/src/pages/home.tsx` | Marketing copy: "moving freight", "owner-operators" | CC-SPECIFIC — landing page is tenant/vertical specific |
| `client/src/pages/faqs.tsx` | Trucking-specific FAQs (IFTA, DOT numbers, carriers) | CC-SPECIFIC — per-tenant or per-vertical content |
| `client/src/pages/contact.tsx` | `info@cctruckingservices.com`, placeholder company | CONFIGURABLE — per-tenant contact info |
| `client/src/pages/login.tsx` | "CC Trucking Services" title | CONFIGURABLE — per-tenant branding |
| `client/src/components/app-sidebar.tsx` | "CC Trucking" sidebar header, Truck icon | CONFIGURABLE — per-tenant name + icon |
| `client/src/components/portal-sidebar.tsx` | "CC Trucking" sidebar header, Truck icon | CONFIGURABLE — per-tenant name + icon |
| `client/src/components/preparer-sidebar.tsx` | "CC Trucking" sidebar header, Truck icon | CONFIGURABLE — per-tenant name + icon |
| `client/src/components/ai-chat-widget.tsx` | Suggested questions reference trucking topics | CONFIGURABLE — tenant-specific or vertical-specific |
| `client/src/components/portal-ai-chat-widget.tsx` | Same as above | CONFIGURABLE |

### Trucking-Specific Seed Data

| Data | Items | Change Type |
|------|-------|-------------|
| Service Items | 10 trucking services (IFTA Filing, MCS-150, UCR, DOT, etc.) | CC-SPECIFIC — becomes part of "Trucking Industry Pack" |
| Transaction Categories | 19 categories (Fuel, Tolls, Freight Revenue, etc.) | CC-SPECIFIC — becomes part of "Trucking Bookkeeping Pack" |
| Recurring Templates | 4 templates (IFTA quarterly, UCR annual, MCS-150, DOT) | CC-SPECIFIC — becomes part of "Trucking Compliance Pack" |
| Client Fields | DOT Number, MC Number on the clients table | CC-SPECIFIC — migrated to custom fields system |

---

## 15. Platform Billing vs. Tenant Operational Billing

These are two completely separate billing systems that must never be combined. Mixing them creates architectural confusion, accounting complexity, and audit nightmares.

### Platform Billing (SaaS Subscription)

This is how YOU bill tenants for using the platform.

| Aspect | Detail |
|--------|--------|
| **What it is** | Monthly/annual subscription fee for platform access |
| **Who pays** | Tenant owner pays you |
| **Stripe account** | Your platform Stripe account |
| **Managed by** | Platform owner / platform admin |
| **Tables** | `tenants.plan`, `tenant_settings` (billing keys), Stripe webhook data |
| **Features** | Plan selection, tier upgrades/downgrades, payment processing, failed payment handling, subscription lifecycle |
| **Visible to** | Platform owner sees all subscriptions. Tenant owner sees their own plan/billing. Tenant admins and clients do NOT see platform billing. |
| **Invoice numbering** | Platform invoice numbers (PLAT-0001, etc.) |

### Tenant Operational Billing (Client Invoicing)

This is how tenants bill THEIR clients for services rendered.

| Aspect | Detail |
|--------|--------|
| **What it is** | Invoices generated by tenant staff for work done (IFTA filing, bookkeeping, etc.) |
| **Who pays** | Tenant's clients pay the tenant |
| **Stripe account** | Tenant's own Stripe account (via Stripe Connect, optional) OR manual payment tracking |
| **Managed by** | Tenant owner / tenant admin |
| **Tables** | `invoices`, `invoice_line_items`, `service_items` (all tenant-scoped) |
| **Features** | Invoice creation, PDF generation, email sending, payment status tracking, AR aging, reminders |
| **Visible to** | Tenant staff and their clients. Platform has NO involvement in tenant-client financial transactions. |
| **Invoice numbering** | Tenant-defined format (INV-0001, etc.) — per tenant sequence |

### Strict Separation Rules

1. **No shared tables.** Platform billing data and tenant invoicing data must never be stored in the same tables.
2. **No shared routes.** Platform billing routes (`/api/platform/billing/*`) and tenant invoice routes (`/api/invoices/*`) are completely separate.
3. **No shared UI.** Platform billing pages and tenant invoice pages are different screens in different portals.
4. **No shared Stripe accounts.** Platform billing uses the platform's Stripe account. Tenant billing uses the tenant's own Stripe Connect account (or manual tracking).
5. **Bookkeeping module billing is tenant operational billing.** The existing bookkeeping subscription ($50/month) that tenants charge their clients is part of tenant operational billing, not platform billing. It stays in the tenant-scoped `bookkeeping_subscriptions` table.
6. **Platform billing comes first.** In the implementation roadmap, platform billing (Phase 4) is built independently of tenant operational billing (which already exists). Do not refactor existing invoice/billing code to accommodate platform billing — they are separate systems.

---

## 16. CC Trucking to "Tenant 1" Migration Plan

### What Happens to Existing Data

1. **Create a `tenants` table** with CC Trucking as the first record (id = 1 or UUID)
2. **Add `tenant_id` column** to the 17+ tables identified above, set all existing rows to CC Trucking's tenant ID
3. **Migrate users** — existing owner/admin/preparer users get CC Trucking's tenant ID. Platform owner (you) gets the new `platform_owner` role
4. **File storage** — move `uploads/tax-documents/*` to `uploads/{tenantId}/tax-documents/`
5. **Branding** — CC Trucking's company name, logo, colors, and contact info go into the tenants table
6. **Service catalog** — existing service items get CC Trucking's tenant ID
7. **Knowledge base** — existing articles get CC Trucking's tenant ID
8. **Recurring templates** — existing templates get CC Trucking's tenant ID
9. **Transaction categories** — existing categories get CC Trucking's tenant ID
10. **Custom fields** — DOT Number, MC Number, EIN values migrated from `clients` columns to `custom_field_values`

### Migration Safety Rules
- All existing data MUST remain accessible to CC Trucking after migration
- No downtime longer than a maintenance window
- Rollback plan for each migration step
- Existing session cookies must continue to work
- All existing URLs/paths must remain functional

---

## 17. Migration Validation Checklist

This checklist defines the explicit verification steps that must be completed before, during, and after the CC Trucking to Tenant 1 migration.

### Pre-Migration

- [ ] Full database backup/snapshot taken and verified restorable
- [ ] Full file storage backup (`uploads/` directory) taken
- [ ] Migration scripts tested on a staging copy of the production database
- [ ] Staging dry run completed successfully with no data loss
- [ ] Feature flags configured so multi-tenant code can be toggled off if needed
- [ ] Rollback procedure documented and tested (restore backup + revert code to pre-migration commit)

### During Migration

- [ ] `tenants` table created and CC Trucking record inserted
- [ ] `tenant_id` column added to all 17+ tables with default value set to CC Trucking's tenant ID
- [ ] All existing rows verified to have correct `tenant_id` (count match: pre-migration row count = post-migration row count per table)
- [ ] Indexes created on `tenant_id` for all tables that will be queried by tenant
- [ ] File storage reorganized into tenant-partitioned directories
- [ ] User roles migrated (existing `owner` → `tenant_owner`, your account → `platform_owner`)
- [ ] NOT NULL constraint added to `tenant_id` columns after backfill is verified
- [ ] Custom field definitions created for DOT Number, MC Number, EIN
- [ ] Custom field values populated from existing `clients` columns

### Post-Migration Verification

- [ ] **Data integrity check:** Row counts match pre-migration for every table
- [ ] **Auth verification:** All existing users can log in with existing credentials
- [ ] **Session continuity:** Active sessions continue to work without forced logout
- [ ] **Admin portal:** All pages load correctly, data displays for CC Trucking only
- [ ] **Client portal:** Existing clients can access their documents, invoices, tickets
- [ ] **Preparer portal:** Existing preparers can access their assigned clients
- [ ] **AI chat:** Admin and client AI assistants return tenant-scoped data only
- [ ] **Background jobs:** Invoice scheduler and compliance scheduler process CC Trucking data correctly
- [ ] **Email/PDF:** Invoice emails and PDFs show CC Trucking branding (not generic/broken)
- [ ] **Push notifications:** Notifications deliver correctly to CC Trucking users
- [ ] **File downloads:** Tax documents and receipts download from new tenant-partitioned paths
- [ ] **Custom fields:** DOT Number, MC Number, EIN display correctly on client detail pages

### CC Trucking Acceptance Testing

- [ ] CC Trucking's owner logs in and verifies dashboard data is correct
- [ ] CC Trucking staff creates a test client, ticket, and invoice — all work normally
- [ ] CC Trucking client logs in and sees their data unchanged
- [ ] CC Trucking owner confirms no unexpected changes to their workflow

### Rollback Criteria

If any of the following occur, migration should be rolled back:
- Any data loss detected (row count mismatch)
- Auth failures for more than one user
- Cross-tenant data visible (any non-CC-Trucking data appearing, or CC Trucking data visible without tenant scope)
- Background job sends emails with wrong branding
- More than 2 hours of unresolved issues during migration window

### Feature Flag Rollout Sequence

1. Deploy code with multi-tenant support behind feature flags (all flags OFF)
2. Enable `tenant_scope_middleware` flag — activates tenant filtering on all queries
3. Enable `platform_admin_routes` flag — activates platform admin dashboard
4. Enable `tenant_branding` flag — activates dynamic branding from tenant config
5. Enable `tenant_onboarding` flag — allows creation of new tenants
6. Each flag should be independently reversible

---

## 18. Layered Test Strategy

Testing a multi-tenant SaaS platform requires multiple layers of testing, each targeting different risk areas.

### Unit Tests

| Target | What to Test | Tools |
|--------|-------------|-------|
| **Tenant scope middleware** | Correctly injects `tenantId` into request context; rejects requests without valid tenant | Jest/Vitest |
| **Role permission checks** | Each middleware function (`isTenantOwner`, `isTenantAdmin`, `isPlatformAdmin`) correctly grants/denies access | Jest/Vitest |
| **Module feature gates** | Module-disabled tenants get 403 on module routes; module-enabled tenants get through | Jest/Vitest |
| **Custom field validation** | Field type validation (number must be numeric, select must be from options, required fields enforced) | Jest/Vitest |
| **AI prompt construction** | Prompt builder correctly injects tenant name, industry pack content, custom instructions, and scoped data — no global data leakage | Jest/Vitest |

### Integration Tests

| Target | What to Test | Tools |
|--------|-------------|-------|
| **Cross-tenant data isolation** | Create two tenants with separate data. For every API route, verify Tenant A cannot access Tenant B's data. This is the most critical test suite in the entire platform. | Supertest + Jest |
| **Storage layer tenant scoping** | Every `storage.getX()` method returns only data for the specified tenant | Supertest + Jest |
| **Cascade operations** | Deleting a client cascades correctly within tenant scope; does not affect other tenants | Supertest + Jest |
| **Custom field CRUD** | Creating, reading, updating, and deleting custom fields works correctly per tenant | Supertest + Jest |

### End-to-End Tests

| Target | What to Test | Tools |
|--------|-------------|-------|
| **Tenant onboarding flow** | Create a new tenant → set branding → add service catalog → invite first user → user logs in → sees correct brand | Playwright |
| **Admin portal full workflow** | Login → create client → create ticket → create invoice → send email → mark paid | Playwright |
| **Client portal full workflow** | Login → view dashboard → view invoices → sign document → send message | Playwright |
| **Preparer portal workflow** | Login → view assigned clients → review transactions → upload tax doc | Playwright |
| **Cross-portal interaction** | Admin sends signature request → client receives notification → client signs → admin sees signed status | Playwright |
| **Module enable/disable** | Enable bookkeeping module → sidebar shows bookkeeping → disable → sidebar hides bookkeeping → API returns 403 | Playwright |

### Migration Tests

| Target | What to Test |
|--------|-------------|
| **Schema migration** | `tenant_id` column added correctly to all 17+ tables |
| **Data backfill** | All existing rows have correct `tenant_id` after migration |
| **Row count verification** | Pre-migration and post-migration row counts match per table |
| **Custom field migration** | DOT/MC/EIN values correctly migrated to `custom_field_values` |
| **File storage migration** | Files accessible from new tenant-partitioned paths |
| **Rollback** | Migration can be fully reversed without data loss |

### Scheduler Tests

| Target | What to Test |
|--------|-------------|
| **Invoice reminder scheduler** | Sends reminders with correct tenant branding; skips suspended tenants; uses correct SMTP settings per tenant |
| **Compliance scheduler** | Creates tickets for correct tenant; skips tenants without compliance module; respects tenant-specific templates |
| **Multi-tenant scheduler run** | With 3+ tenants, scheduler processes all tenants correctly in a single run without cross-contamination |

### Branded Output Tests

| Target | What to Test |
|--------|-------------|
| **PDF invoice** | Generated PDF contains correct tenant logo, company name, address, and tagline — not platform defaults or another tenant's branding |
| **Email templates** | Invoice emails, reminder emails, notification emails all use correct tenant branding and sender identity |
| **Push notifications** | Push notification payloads include correct tenant name |

### Tenant-Scoped AI Tests

| Target | What to Test |
|--------|-------------|
| **Admin AI chat** | AI response references only the requesting tenant's clients, invoices, and documents. Create identical client names across two tenants — AI must reference the correct one. |
| **Client portal AI chat** | AI response references only the authenticated client's data within their tenant |
| **AI categorization** | Uses only the requesting tenant's transaction categories |
| **AI quota enforcement** | AI calls are counted per tenant; quota exhaustion returns graceful error, not failure |

---

## 19. Observability & Incident Response

### Per-Tenant Error Visibility

| Capability | Detail |
|-----------|--------|
| **Tenant health dashboard** | Platform admin dashboard shows per-tenant metrics: error rate (last 24h), API response times, active users, last login, storage usage, AI call count |
| **Error aggregation** | Errors are tagged with `tenantId` and can be filtered/grouped by tenant in the platform admin view |
| **Tenant status indicators** | Traffic light status per tenant: Green (healthy), Yellow (elevated errors or approaching limits), Red (critical errors or suspended) |

### Job, Email, and AI Failure Monitoring

| System | Monitoring Approach |
|--------|-------------------|
| **Background jobs (schedulers)** | Each scheduler run logs: start time, tenants processed, actions taken per tenant, errors encountered, end time. Failed tenant operations do not block processing of other tenants. Failures logged with tenantId and retried on next cycle. |
| **Email delivery** | Email send attempts logged with: tenantId, recipient, template type, success/failure, SMTP error (if any). Failed emails queued for retry (3 attempts). Platform admin can view email delivery status per tenant. |
| **AI calls** | Every AI call logged to `ai_usage_logs` table: tenantId, userId, feature, model, token count, latency, success/failure, error message. Aggregate dashboards show AI health per tenant and platform-wide. |
| **Push notifications** | Push delivery attempts logged. Failed pushes (expired subscriptions) automatically cleaned up. Delivery stats visible per tenant. |

### Audit Logging for Support and Settings

| Event | Logged Where | Detail |
|-------|-------------|--------|
| **Platform admin impersonation** | `platform_audit_logs` | Who impersonated, which tenant, start/end time, read-only vs. write access |
| **Tenant setting changes** | `tenant_settings` (updatedAt, updatedBy) + `audit_logs` | Which setting changed, old value, new value, who changed it |
| **Module enable/disable** | `audit_logs` + `platform_audit_logs` | Which module, which tenant, who toggled it |
| **Tenant creation/suspension/cancellation** | `platform_audit_logs` | Lifecycle events with actor and reason |
| **Role changes** | `audit_logs` | User role promotions/demotions within tenant |
| **AI instruction changes** | `audit_logs` | Custom AI prompt modifications by tenant owner |
| **Billing events** | `platform_audit_logs` | Plan changes, payment failures, grace period triggers |

### Incident Response: Cross-Tenant Data Issue

If a cross-tenant data leak is detected (tenant A sees tenant B's data), the following protocol applies:

1. **Immediate:** Affected route(s) disabled via feature flag. Both affected tenants notified.
2. **Investigation:** Audit logs reviewed to determine scope (which data was exposed, which users accessed it, time window).
3. **Containment:** If the issue is in a specific module, disable that module platform-wide until fixed. If systemic, enable maintenance mode.
4. **Fix & verify:** Root cause identified. Fix deployed. Cross-tenant test suite run. Manual verification on affected tenants.
5. **Disclosure:** Affected tenants receive a written incident report within 48 hours: what happened, what data was exposed, what was done to fix it, what prevents recurrence.
6. **Post-mortem:** Internal post-mortem documented. Test coverage expanded to prevent similar issues.

---

## 20. Major Risks & Blockers

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Cross-tenant data leakage** | Security breach — tenant A sees tenant B's data | Every query must be scoped. Automated cross-tenant tests. Incident response protocol defined. |
| **AI prompt data leakage** | AI assistant references wrong tenant's clients/invoices | Strict tenant-scoped data loading before prompt construction. See AI Governance section. |
| **Global scheduler acting on wrong tenant** | Invoice reminders sent with wrong branding/email | Scheduler must load tenant config per operation. Scheduler tests required. |
| **Breaking CC Trucking's live production** | Primary customer loses access during migration | Feature-flag the multi-tenant code. Run both paths until stable. See Migration Validation Checklist. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Performance degradation** | Adding tenant_id to every query adds overhead | Add database indexes on tenant_id for all major tables. |
| **Role permission complexity** | 6 launch roles increases auth surface area | Design and test permission matrix before implementation. Launch-only roles first, optional roles later. |
| **Billing integration complexity** | Two-tier Stripe (platform + tenant) is architecturally complex | Build platform billing first, tenant billing (bookkeeping) second. Keep strictly separated. |
| **Knowledge base content exposure** | Tenant's internal articles accidentally shared with wrong tenant | Strict tenantId filtering on all KB queries. |

### Blockers

| Blocker | Resolution Required |
|---------|-------------------|
| **Pricing model not defined** | Cannot build billing without knowing per-seat vs per-tenant vs per-module pricing |
| **Platform brand name not chosen** | Cannot build platform branding, landing page, or legal terms |
| ~~Hosting model undecided~~ | **RESOLVED:** Recommended default is single shared database with `tenant_id` column isolation. Enterprise isolation can be added later if needed. |

---

## 21. Phased Implementation Roadmap

**Timeline note:** The estimates below assume the architecture is as clean in practice as it appears in this audit, and that decisions on blockers (pricing model, platform brand name) are made promptly. A realistic planning range is **5-8 months** once hidden dependencies, migration edge cases, testing depth, and billing integration complexity are accounted for. The lower end of each phase estimate assumes focused full-time work; the upper end accounts for the iteration, debugging, and rework that is normal in a project of this scope.

### Phase 0: Productization Audit (This Document) — COMPLETE
- Inventory all features, tables, routes, AI integrations
- Classify everything as core/configurable/module/CC-specific
- Define product layer architecture and module dependencies
- Define tenant settings schema and custom fields strategy
- Define integration tenancy matrix
- Define AI governance model
- Define import/export architecture
- Define white-label depth levels
- Define test strategy and observability requirements
- Define billing separation rules
- Define migration plan and validation checklist
- Identify risks and blockers
- **Effort: 1-2 days**

### Phase 1: Brand-Neutral & Config-Driven Refactor
- Create a `TenantContext` provider on frontend that feeds company name, colors, icon, contact info
- Replace all hardcoded "CC Trucking" references with context values
- Centralize email template branding into a single config
- Centralize PDF branding into a single config
- Extract trucking industry AI knowledge into a separate industry pack config file
- Make seed data into importable "starter packs" (Trucking Industry Pack is the first)
- Implement custom fields system (schema + storage + UI rendering)
- Migrate DOT Number, MC Number, EIN to custom fields
- **Effort: 2-4 weeks**
- **Risk: Low** — no database structure changes (except custom fields tables)

### Phase 2: Tenant Architecture + Role & Permission Redesign (Combined)

These two phases are combined because tenant structure and access control are tightly coupled. Designing tenant isolation without the permission model, or vice versa, risks rework. Both should be designed together even if some UI elements land later.

- **Tenant Architecture:**
  - Create `tenants`, `tenant_branding`, `tenant_settings` tables
  - Add `tenant_id` to 17+ tables via migration
  - Set all existing data to CC Trucking's tenant ID
  - Create `tenantScope` middleware that automatically injects tenant filter
  - Update ALL storage methods to accept/filter by tenantId
  - Update ALL routes to use tenant-scoped queries
  - Partition file storage by tenant
  - Make schedulers tenant-aware
  - Make notifications tenant-aware
  - Make AI data loading tenant-scoped with governance rules
  - Implement module feature gates (check `tenant_settings.modules.*` before processing module routes)
  - Implement cross-tenant isolation tests

- **Role & Permission Redesign:**
  - Implement 6 launch-required roles (platform_owner, platform_admin, tenant_owner, tenant_admin, client, preparer)
  - Create platform-level middleware (isPlatformAdmin, isPlatformOwner)
  - Update tenant-level middleware (isTenantOwner, isTenantAdmin)
  - Build role management UI for tenant owners
  - Build permission matrix tests
  - Design (but do not build) optional roles (tenant_manager, auditor) for later

- **Effort: 6-8 weeks**
- **Risk: High** — touches every table, route, query, and auth check

### Phase 3: Platform Operations Layer
- Super admin dashboard (tenant list, status, usage metrics)
- Support impersonation / safe admin assist mode (with audit logging)
- Feature flags per tenant (enable/disable modules)
- Platform-wide analytics (revenue across tenants, active users, AI usage)
- Tenant health monitoring and observability dashboard
- Tenant analytics vs. platform analytics separation
- AI usage tracking and quota enforcement
- **Effort: 3-4 weeks**
- **Risk: Low-Medium**

### Phase 4: Commercial Layer
- Define pricing model (prerequisite decision — must be made before this phase starts)
- Stripe integration for platform billing (tenant subscriptions) — SEPARATE from existing tenant invoicing
- Plan tiers with feature gating (Basic: core only, Pro: + bookkeeping + tax, Enterprise: + AI + custom branding)
- Usage tracking (clients, users, AI calls, storage)
- Payment failure handling (grace period, feature degradation, suspension)
- Stripe Connect for tenant-level billing (optional — tenants billing their own clients)
- **Effort: 3-5 weeks**
- **Risk: Medium** — billing logic is business-critical

### Phase 5: Onboarding & Provisioning
- Tenant creation flow (company name, industry, plan selection)
- Branding wizard (logo upload, color picker, contact info)
- Service catalog setup (from industry starter packs or custom)
- Default category and template seeding from industry pack
- User invitation flow with role assignment
- Bookkeeping/preparer setup wizard
- AI instructions and company knowledge setup
- Form template setup
- Import tools (client CSV import, bulk data onboarding)
- Export tools (full tenant export, per-entity exports)
- Guided setup walkthrough
- **Effort: 3-4 weeks**
- **Risk: Low-Medium**

### Phase 6: Hardening & Launch
- Security audit (cross-tenant penetration testing)
- Execute full layered test strategy (unit, integration, e2e, migration, scheduler, branded output, AI)
- Execute Migration Validation Checklist
- Performance testing (100+ tenants simulation)
- Documentation (admin guide, API docs, onboarding guide)
- Backup and export per tenant
- Offboarding/data deletion flow
- Legal (terms of service, privacy policy, data processing agreements)
- **Effort: 3-4 weeks**
- **Risk: Medium** — launch readiness is critical

### Total Estimated Timeline: 22-32 weeks (5-8 months)

This estimate assumes the architecture is as clean in practice as it appears in this audit. The scope of this conversion — 30 tables, 90+ routes, 6 AI integrations, 3 portals, 2 schedulers, email/PDF/push systems — means that hidden dependencies, migration edge cases, and testing depth will add time that is difficult to predict upfront. Plan for the upper range and be pleasantly surprised if it comes in lower.

---

## 22. Ownership, Data Rights & Commercial Rules

These decisions must be made before launch. This is not legal drafting, but identifies the major questions that need answers from a business and legal perspective.

### Code & IP Ownership

| Question | Recommendation |
|----------|---------------|
| **Who owns the platform code?** | You (the platform owner) own 100% of the codebase, including all core platform code, modules, and industry packs. |
| **Who owns tenant customizations?** | Tenant-created content (knowledge base articles, form templates, custom service items) is tenant data, not platform IP. Tenant-created custom code (if any custom development is offered) should be governed by a separate agreement. |
| **Who owns industry packs?** | Industry packs are platform IP. Tenants license access to them as part of their subscription. |

### Tenant Data Ownership & Rights

| Question | Recommendation |
|----------|---------------|
| **Who owns tenant data?** | Tenants own their data (clients, invoices, documents, transactions, etc.). The platform is a custodian, not an owner. |
| **Data export** | Tenants must be able to export their data in standard formats (CSV, JSON, PDF) at any time. This is both a trust requirement and likely a legal requirement in many jurisdictions. |
| **Data deletion** | Upon tenant cancellation/offboarding, all tenant data must be deletable within a defined period (e.g., 30 days after account closure). Backups should follow a defined retention schedule. |
| **Data portability** | Consider offering a structured export format that allows tenants to migrate to another system. This builds trust and reduces lock-in concerns. |

### Admin/Support Access Boundaries

| Question | Recommendation |
|----------|---------------|
| **Can platform admins see tenant data?** | Platform admins should be able to access tenant data only through a formal support/impersonation mode that is logged in the audit trail. Casual browsing of tenant data should not be possible. |
| **Impersonation rules** | Support impersonation should be read-only by default. Write access during impersonation requires explicit elevation and is logged separately. |
| **Audit visibility** | Tenants should be able to see when platform support accessed their account (transparency log). |

### Commercial Rules

| Question | Decision Needed |
|----------|----------------|
| **Pricing model** | Per-tenant flat fee? Per-seat? Per-module? Usage-based? Hybrid? This affects Phase 4 architecture. |
| **Plan tiers** | What features are included in each tier? What are the upgrade triggers? |
| **Industry pack pricing** | Are industry packs included in the base price or add-ons? |
| **White-label pricing** | Standard branding is free. Pro branding on Pro plan. Full white-label on Enterprise. |
| **Payment terms** | Monthly? Annual? Annual discount? |
| **Failed payment policy** | Grace period length? Feature degradation vs. full suspension? Data retention during suspension? |
| **Refund policy** | Under what circumstances are refunds offered? |
| **SLA commitments** | Uptime guarantee? Support response times? |

---

## 23. Success Criteria

The following are measurable criteria that define what "done" looks like for the SaaS conversion. All must be true before the platform can be considered ready for commercial launch.

### Tenant Isolation
- [ ] CC Trucking migrated successfully as Tenant 1 with zero data loss
- [ ] A second test tenant can be created and operates completely independently
- [ ] Automated test suite verifies no cross-tenant data leakage across all API routes
- [ ] AI chat for Tenant 1 returns only Tenant 1 data; AI chat for Tenant 2 returns only Tenant 2 data
- [ ] Background jobs (invoice reminders, compliance scheduler) process only the correct tenant's data with the correct tenant's branding

### Branding & Configuration
- [ ] All company branding (name, logo, colors, tagline) is configurable per tenant without code changes
- [ ] Email templates and PDF invoices render with correct tenant branding
- [ ] Login page, sidebars, and portal UI display correct tenant identity
- [ ] PWA manifest and push notification titles reflect tenant branding

### Industry Packs
- [ ] Trucking Industry Pack is installable as a configuration bundle (service items, categories, templates, AI knowledge)
- [ ] A new tenant can be provisioned with or without the trucking pack
- [ ] A non-trucking tenant can operate the platform without seeing any trucking-specific content

### Provisioning
- [ ] New tenants can be created without any code changes or developer intervention
- [ ] Tenant onboarding flow completes successfully: branding setup, service catalog, user invitations, role assignment
- [ ] Default data seeding from industry packs works correctly

### Platform Operations
- [ ] Platform owner can view all tenants, their status, and usage metrics
- [ ] Platform admin can safely access a tenant in support mode with full audit logging
- [ ] Feature flags can enable/disable modules per tenant

### Security & Performance
- [ ] Cross-tenant penetration test passes (no route returns data from wrong tenant)
- [ ] Platform performs acceptably with 10+ tenants and 1000+ total records
- [ ] All tenant_id columns have database indexes
- [ ] Session management correctly resolves tenant context, handles impersonation, and invalidates stale sessions

### Commercial
- [ ] Billing integration accepts tenant subscriptions and processes payments
- [ ] Plan tier restrictions correctly gate features
- [ ] Payment failure triggers appropriate degradation/suspension behavior

### Import/Export
- [ ] Full tenant export generates a complete, well-structured archive
- [ ] Client CSV import works with column mapping and custom field support
- [ ] Offboarding export is available for 30 days after account closure

---

## 24. Vertical Strategy Recommendation

### Should this remain trucking-specific or go broader?

**Recommendation: Stay trucking-vertical first, then expand.**

**Arguments for trucking-vertical first:**
1. The existing feature set is deeply trucking-specific — IFTA, DOT, MCS-150, FMCSA compliance, fuel tax, per diem deductions. This is a competitive advantage, not a liability.
2. The trucking industry has 500,000+ active carriers in the US, most of which are small fleets (1-20 trucks) that need affordable compliance management. The market is large enough.
3. Vertical SaaS commands higher prices and lower churn than horizontal tools. A trucking company will pay more for a platform that speaks their language.
4. The AI knowledge base (FMCSA regulations, filing deadlines, government links) is a genuine differentiator. A generic platform loses this.
5. Your first customer (CC Trucking) validates the trucking use case. Going broad before validating a second vertical adds risk without adding revenue.

**Arguments for going broader (later):**
1. The core platform (CRM, invoicing, documents, bookkeeping, forms, signatures, AI chat) IS generic. Many service businesses need these features.
2. "Industry packs" — bundles of service items, compliance templates, transaction categories, AI knowledge, and custom fields — could let you support multiple verticals without rewriting the core.
3. Adjacent verticals (freight brokers, logistics companies, fleet management, construction compliance, field services) share enough DNA with trucking to expand naturally.

**Suggested approach:**
1. Launch as a **trucking-vertical SaaS** with the existing feature set
2. Architect the multi-tenant system with "industry packs" as a first-class concept (trucking pack is the default)
3. After 5-10 trucking tenants, evaluate demand from adjacent verticals
4. Build a second industry pack (e.g., freight brokerage or construction) to validate the abstraction
5. Only then consider marketing as a "multi-industry" platform

This approach lets you sell immediately while building the foundation for expansion.

---

## Appendix A: Feature Module Map

| Module | Features Included | Default |
|--------|------------------|---------|
| **Core Platform** | Clients, tickets, documents, invoices, chat, signatures, notifications, audit logs, users, forms, knowledge base, AI chat | Always on |
| **Bookkeeping** | Subscriptions, bank statement upload, transaction categorization, receipt scanning, monthly summaries | Optional ($) |
| **Tax Preparation** | Tax document upload, AI analysis, preparer portal, client approval workflow, CSV export | Optional ($) |
| **Compliance Scheduling** | Recurring templates, auto-ticket creation, schedule management | Optional |
| **Notarizations** | Notarization tracking and records | Optional |
| **Employee Performance** | Staff grading, activity tracking, trend charts | Optional |
| **Advanced Analytics** | SLA tracking, AR aging, revenue breakdown | Included in Pro+ |

## Appendix B: Industry Pack Contents

### Trucking Industry Pack (First Pack)

| Component | Contents |
|-----------|---------|
| **Service Catalog** | IFTA Filing ($150), MCS-150 Update ($75), UCR Registration ($100), DOT Compliance Review ($200), Business Entity Setup ($500), Tax Preparation ($300), Bookkeeping Monthly ($50), Permit & Authority Filing ($250), Insurance Filing ($150), BOC-3 Filing ($100) |
| **Transaction Categories** | Fuel, Maintenance & Repairs, Tolls, Insurance Premiums, Payroll & Driver Pay, Permits & Licensing, Equipment & Parts, Meals & Per Diem, Parking & Scales, License & Registration, Lease/Loan Payments, Office & Administrative, Professional Services, Taxes & Fees, Freight Revenue, Fuel Surcharge Revenue, Accessorial Income, Other Income, Other Expense |
| **Compliance Templates** | IFTA (quarterly), UCR (annual), MCS-150 (biennial), DOT Compliance Review (annual) |
| **AI Knowledge** | FMCSA regulations, DOT compliance requirements, IFTA filing deadlines, UCR registration rules, Form 2290 heavy vehicle tax, MCS-150 biennial update, BOC-3 process agent, government website links |
| **Custom Client Fields** | DOT Number (text), MC Number (text), EIN (text) |
| **FAQ Content** | Trucking-specific questions about IFTA, DOT numbers, carrier regulations |
