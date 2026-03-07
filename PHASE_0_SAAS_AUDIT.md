# Phase 0: Full Productization & Multi-Tenant Audit

## Executive Summary

This document is a complete inventory and classification of the current platform, designed to guide the conversion from a CC Trucking-specific operations tool into a configurable, multi-tenant SaaS product. Every table, route, AI integration, background job, and UI component has been audited and classified.

**Current state:** A mature, single-tenant platform with 30 database tables, 90+ API routes, 6 AI integrations, 3 portals, 2 background schedulers, push notifications, PDF generation, email automation, and a Progressive Web App.

**Classification key used throughout this document:**
- **CORE** — Platform logic that every tenant needs as-is
- **CONFIGURABLE** — Logic that works for all tenants but needs per-tenant settings
- **MODULE** — Optional feature that tenants can enable/disable
- **CC-SPECIFIC** — Custom logic that only applies to trucking or CC Trucking specifically

---

## 1. Database Schema Inventory (30 Tables)

### Core Platform Tables (No Industry-Specific Logic)

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `users` | id, username, password, email, firstName, lastName, profileImageUrl, role, clientId, createdAt, updatedAt | CORE | Add `tenantId`. Role model needs redesign. |
| `sessions` | sid, sess, expire | CORE | Session already scoped by userId; no change needed if users have tenantId. |
| `clients` | id, companyName, contactName, email, phone, address, city, state, zipCode, status, notes, pipelineStage, nextActionDate, nextActionNote | CORE (mostly) | Add `tenantId`. See below for CC-specific columns. |
| `clients` (cont.) | dotNumber, mcNumber, einNumber | CC-SPECIFIC | These are trucking-specific fields. Move to a `client_custom_fields` or make schema extensible per tenant/vertical. |
| `service_tickets` | id, clientId, title, serviceType, status, priority, description, dueDate, assignedTo, lockedBy, lockedAt, lockedByName, createdAt | CORE | Add `tenantId`. `serviceType` values are currently trucking-specific but the field itself is generic. |
| `documents` | id, clientId, ticketId, name, type, status, uploadedAt | CORE | Add `tenantId`. |
| `invoices` | id, clientId, ticketId, invoiceNumber, amount, status, dueDate, paidDate, description, lastReminderSent, reminderCount, createdAt | CORE | Add `tenantId`. |
| `invoice_line_items` | id, invoiceId, serviceItemId, description, quantity, unitPrice, amount, createdAt | CORE | Scoped via invoice's tenantId. |
| `chat_messages` | id, clientId, senderId, senderName, senderRole, message, createdAt | CORE | Scoped via client's tenantId. |
| `staff_messages` | id, senderId, senderName, recipientId, recipientName, message, read, createdAt | CORE | Add `tenantId` — staff messages must be tenant-scoped. |
| `signature_requests` | id, clientId, documentName, documentDescription, documentContent, status, sentAt, signedAt, signerName, signatureData, reminderSentAt, reminderMethod, createdBy | CORE | Scoped via client's tenantId. |
| `notifications` | id, userId, title, message, type, link, read, createdAt | CORE | Already scoped by userId; works if users have tenantId. |
| `form_templates` | id, name, description, content, category, createdBy, createdAt | CONFIGURABLE | Add `tenantId`. Each tenant has their own form templates. |
| `filled_forms` | id, templateId, clientId, name, filledContent, status, filledBy, signatureRequestId, createdAt, updatedAt | CORE | Scoped via client's tenantId. |
| `notarizations` | id, clientId, documentName, documentDescription, notaryName, notaryCommission, notarizationDate, expirationDate, status, notes, performedBy, createdAt | MODULE | Add `tenantId`. Not all service businesses need notarization. |
| `audit_logs` | id, userId, userName, action, entityType, entityId, details, createdAt | CORE | Add `tenantId`. Critical for tenant isolation in audit views. |
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
| `bank_transactions` | id, clientId, transactionDate, description, amount, originalCategory, aiCategory, aiConfidence, manualCategory, reviewed, bankName, accountLast4, statementMonth, statementYear, source, receiptData, createdAt | MODULE | Scoped via client's tenantId. Part of bookkeeping module. |
| `transaction_categories` | id, name, description, parentCategory, isDefault, createdAt | CONFIGURABLE | Add `tenantId`. Default categories are currently trucking-specific (Fuel, Tolls, Freight Revenue, etc.). Each tenant/vertical needs their own. |
| `monthly_summaries` | id, clientId, month, year, totalIncome, totalExpenses, netIncome, categoryBreakdown, generatedAt, createdAt | MODULE | Scoped via client's tenantId. Part of bookkeeping module. |
| `preparer_assignments` | id, preparerId, clientId, assignedBy, createdAt | MODULE | Scoped via client's tenantId. Part of bookkeeping/tax module. |

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

### Summary: Tables Requiring `tenantId`

**Direct tenantId needed (17 tables):** users, clients, service_tickets, documents, invoices, staff_messages, form_templates, notarizations, audit_logs, service_items, knowledge_articles, bookkeeping_subscriptions, transaction_categories, tax_documents, recurring_templates, preparer_assignments, client_recurring_schedules

**Scoped via parent relationship (13 tables):** invoice_line_items (via invoice), chat_messages (via client), filled_forms (via client), signature_requests (via client), notifications (via user), client_notes (via client), push_subscriptions (via user), bank_transactions (via client), monthly_summaries (via client), ticket_required_documents (via ticket), sessions (via user), conversations, messages

---

## 2. API Route Inventory (90+ Routes)

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

## 3. AI Integration Audit (6 AI Features)

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
5. **Industry knowledge** (FMCSA, DOT, IFTA, etc.) is currently hardcoded in the prompt — this should be a configurable "industry pack" or module
6. **Model selection** could be tenant-configurable (some tenants may want cheaper models)

---

## 4. Role & Permission Model Audit

### Current Roles (4)

| Role | Access Level | Description |
|------|-------------|-------------|
| `owner` | Full admin + analytics + employee performance + delete permissions | Single super-user per installation |
| `admin` | Full CRUD on all entities except analytics/employee views | Staff members |
| `client` | Portal access only, scoped to own data via clientId on user record | External clients |
| `preparer` | Preparer portal only, scoped to assigned clients | External tax preparers |

### Proposed Multi-Tenant Role Model (8 Roles)

| Role | Scope | Description |
|------|-------|-------------|
| `platform_owner` | Global | YOU — manages all tenants, billing, platform config |
| `platform_admin` | Global | Platform support staff — can view tenants, impersonate, troubleshoot |
| `tenant_owner` | Per-tenant | CC Trucking's owner — full access within their tenant |
| `tenant_admin` | Per-tenant | CC Trucking's staff — CRUD within their tenant |
| `tenant_manager` | Per-tenant | (Optional) limited admin — can manage some entities but not users/billing |
| `client` | Per-tenant, per-client | External client of a specific tenant |
| `preparer` | Per-tenant, per-assignment | Tax preparer assigned to specific clients within a tenant |
| `auditor` | Per-tenant, read-only | (Optional) read-only access for compliance/review purposes |

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

## 5. Storage, Jobs, Notifications & Integrations Audit

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

## 6. Hardcoded CC Trucking References

### Server-Side (Must Change)

| File | What's Hardcoded | Change Type |
|------|-----------------|-------------|
| `server/routes.ts` | VAPID mailto: `admin@cctrucking.com` | CONFIGURABLE — per-tenant or platform email |
| `server/routes.ts` | AI system prompts: "CC Trucking Services" (3 locations) | CONFIGURABLE — tenant company name in prompts |
| `server/routes.ts` | Trucking industry knowledge (~80 lines of FMCSA/DOT/IFTA content) | CC-SPECIFIC — should be an "industry pack" module |
| `server/invoice-email.ts` | Email From name, HTML headers, company tagline | CONFIGURABLE — per-tenant branding |
| `server/invoice-pdf.ts` | PDF header: "CC TRUCKING SERVICES", footer text | CONFIGURABLE — per-tenant branding |
| `server/seed.ts` | Default users (admin@cctrucking.com), mock clients, trucking services | CC-SPECIFIC — seed data becomes a "trucking starter pack" |

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
| Service Items | 10 trucking services (IFTA Filing, MCS-150, UCR, DOT, etc.) | CC-SPECIFIC — becomes a "Trucking Starter Pack" |
| Transaction Categories | 19 categories (Fuel, Tolls, Freight Revenue, etc.) | CC-SPECIFIC — becomes a "Trucking Bookkeeping Pack" |
| Recurring Templates | 4 templates (IFTA quarterly, UCR annual, MCS-150, DOT) | CC-SPECIFIC — becomes a "Trucking Compliance Pack" |
| Client Fields | DOT Number, MC Number on the clients table | CC-SPECIFIC — should be custom/extensible fields |

---

## 7. CC Trucking to "Tenant 1" Migration Plan

### What Happens to Existing Data

1. **Create a `tenants` table** with CC Trucking as the first record (id = 1 or UUID)
2. **Add `tenant_id` column** to the 17 tables identified above, set all existing rows to CC Trucking's tenant ID
3. **Migrate users** — existing owner/admin/preparer users get CC Trucking's tenant ID. Platform owner (you) gets the new `platform_owner` role
4. **File storage** — move `uploads/tax-documents/*` to `uploads/{tenantId}/tax-documents/`
5. **Branding** — CC Trucking's company name, logo, colors, and contact info go into the tenants table
6. **Service catalog** — existing service items get CC Trucking's tenant ID
7. **Knowledge base** — existing articles get CC Trucking's tenant ID
8. **Recurring templates** — existing templates get CC Trucking's tenant ID
9. **Transaction categories** — existing categories get CC Trucking's tenant ID

### Migration Safety Rules
- All existing data MUST remain accessible to CC Trucking after migration
- No downtime longer than a maintenance window
- Rollback plan for each migration step
- Existing session cookies must continue to work
- All existing URLs/paths must remain functional

---

## 8. Major Risks & Blockers

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Cross-tenant data leakage** | Security breach — tenant A sees tenant B's data | Every query must be scoped. Automated cross-tenant tests. |
| **AI prompt data leakage** | AI assistant references wrong tenant's clients/invoices | Strict tenant-scoped data loading before prompt construction. |
| **Global scheduler acting on wrong tenant** | Invoice reminders sent with wrong branding/email | Scheduler must load tenant config per operation. |
| **Breaking CC Trucking's live production** | Primary customer loses access during migration | Feature-flag the multi-tenant code. Run both paths until stable. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Performance degradation** | Adding tenant_id to every query adds overhead | Add database indexes on tenant_id for all major tables. |
| **Role permission complexity** | 8 roles instead of 4 increases auth surface area | Design and test permission matrix before implementation. |
| **Billing integration complexity** | Two-tier Stripe (platform + tenant) is architecturally complex | Build platform billing first, tenant billing (bookkeeping) second. |
| **Knowledge base content exposure** | Tenant's internal articles accidentally shared with wrong tenant | Strict tenantId filtering on all KB queries. |

### Blockers

| Blocker | Resolution Required |
|---------|-------------------|
| **Pricing model not defined** | Cannot build billing without knowing per-seat vs per-tenant vs per-module pricing |
| **Platform brand name not chosen** | Cannot build platform branding, landing page, or legal terms |
| **Hosting model undecided** | Single database (tenant_id column) vs database-per-tenant affects entire architecture |

---

## 9. Phased Implementation Roadmap

### Phase 0: Productization Audit (This Document) — COMPLETE
- Inventory all features, tables, routes, AI integrations
- Classify everything as core/configurable/module/CC-specific
- Define migration plan
- Identify risks and blockers
- **Effort: 1-2 days**

### Phase 1: Brand-Neutral Refactor
- Create a `TenantContext` provider on frontend that feeds company name, colors, icon, contact info
- Replace all hardcoded "CC Trucking" references with context values
- Centralize email template branding into a single config
- Centralize PDF branding into a single config
- Extract trucking industry AI knowledge into a separate "industry pack" config
- Make seed data into importable "starter packs"
- Make client schema fields extensible (custom fields system or vertical-specific field sets)
- **Effort: 2-3 weeks**
- **Risk: Low** — no database structure changes

### Phase 2: Tenant Architecture
- Create `tenants` table (id, name, slug, logo, colors, contactEmail, industry, plan, settings JSON, createdAt)
- Add `tenant_id` to 17 tables via migration
- Set all existing data to CC Trucking's tenant ID
- Create `tenantScope` middleware that automatically injects tenant filter
- Update ALL storage methods to accept/filter by tenantId
- Update ALL routes to use tenant-scoped queries
- Partition file storage by tenant
- Make schedulers tenant-aware
- Make notifications tenant-aware
- Make AI data loading tenant-scoped
- Implement cross-tenant isolation tests
- **Effort: 4-6 weeks**
- **Risk: High** — touches every table, route, and query

### Phase 3: Role & Permission Redesign
- Implement new role model (8 roles)
- Create platform-level middleware (isPlatformAdmin, isPlatformOwner)
- Update tenant-level middleware (isTenantOwner, isTenantAdmin)
- Build role management UI for tenant owners
- Build permission matrix tests
- **Effort: 2-3 weeks**
- **Risk: Medium** — auth changes are sensitive

### Phase 4: Platform Operations Layer
- Super admin dashboard (tenant list, status, usage metrics)
- Support impersonation (safe admin assist mode)
- Feature flags per tenant (enable/disable modules)
- Platform-wide analytics (revenue across tenants, active users, AI usage)
- Tenant health monitoring
- **Effort: 3-4 weeks**
- **Risk: Low-Medium**

### Phase 5: Commercial Layer
- Stripe integration for platform billing (tenant subscriptions)
- Plan tiers with feature gating (Basic: core only, Pro: + bookkeeping + tax, Enterprise: + AI + custom branding)
- Usage tracking (clients, users, AI calls, storage)
- Payment failure handling (grace period, feature degradation, suspension)
- Stripe Connect for tenant-level billing (optional — tenants billing their own clients)
- **Effort: 3-4 weeks**
- **Risk: Medium** — billing logic is business-critical

### Phase 6: Onboarding & Provisioning
- Tenant signup flow (company name, industry, plan selection)
- Branding wizard (logo upload, color picker, contact info)
- Service catalog setup (from starter packs or custom)
- Default category and template seeding
- User invitation flow
- Optional data import/migration tools
- Guided setup walkthrough
- **Effort: 2-3 weeks**
- **Risk: Low**

### Phase 7: Hardening & Launch
- Security audit (cross-tenant penetration testing)
- Performance testing (100+ tenants simulation)
- Documentation (admin guide, API docs, onboarding guide)
- Backup and export per tenant
- Offboarding/data deletion flow
- Legal (terms of service, privacy policy, data processing agreements)
- **Effort: 2-3 weeks**
- **Risk: Medium** — launch readiness is critical

### Total Estimated Timeline: 18-28 weeks (4.5-7 months)

---

## 10. Vertical Strategy Recommendation

### Should this remain trucking-specific or go broader?

**Recommendation: Stay trucking-vertical first, then expand.**

Here's why:

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
2. Architect the multi-tenant system with "industry packs" as a concept (trucking pack is the default)
3. After 5-10 trucking tenants, evaluate demand from adjacent verticals
4. Build a second industry pack (e.g., freight brokerage or construction) to validate the abstraction
5. Only then consider marketing as a "multi-industry" platform

This approach lets you sell immediately while building the foundation for expansion.

---

## Appendix: Feature Module Map

| Module | Features Included | Default |
|--------|------------------|---------|
| **Core Platform** | Clients, tickets, documents, invoices, chat, signatures, notifications, audit logs, users, forms, knowledge base, AI chat | Always on |
| **Bookkeeping** | Subscriptions, bank statement upload, transaction categorization, receipt scanning, monthly summaries | Optional ($) |
| **Tax Preparation** | Tax document upload, AI analysis, preparer portal, client approval workflow, CSV export | Optional ($) |
| **Compliance Scheduling** | Recurring templates, auto-ticket creation, schedule management | Optional |
| **Notarizations** | Notarization tracking and records | Optional |
| **Employee Performance** | Staff grading, activity tracking, trend charts | Optional |
| **Advanced Analytics** | SLA tracking, AR aging, revenue breakdown | Included in Pro+ |
| **Trucking Industry Pack** | IFTA/DOT/UCR/MCS-150 service items, compliance templates, AI industry knowledge, trucking transaction categories, DOT/MC client fields | Default for trucking tenants |
