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

## 2. Database Schema Inventory (30 Tables)

### Core Platform Tables (No Industry-Specific Logic)

| Table | Columns | Classification | Multi-Tenant Change Required |
|-------|---------|---------------|------------------------------|
| `users` | id, username, password, email, firstName, lastName, profileImageUrl, role, clientId, createdAt, updatedAt | CORE | Add `tenantId`. Role model needs redesign. |
| `sessions` | sid, sess, expire | CORE | No schema change required. However, tenant context resolution from session data, impersonation behavior for platform admins, stale-session invalidation on tenant suspension or role change, and support/admin cross-tenant access patterns all need explicit design and testing. |
| `clients` | id, companyName, contactName, email, phone, address, city, state, zipCode, status, notes, pipelineStage, nextActionDate, nextActionNote | CORE (mostly) | Add `tenantId`. See below for CC-specific columns. |
| `clients` (cont.) | dotNumber, mcNumber, einNumber | CC-SPECIFIC | These are trucking-specific fields. Move to a `client_custom_fields` system or implement vertical-specific field sets driven by industry pack configuration. |
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

### Direct vs. Inherited Tenant Ownership

**Direct tenantId needed (17 tables):** users, clients, service_tickets, documents, invoices, staff_messages, form_templates, notarizations, audit_logs, service_items, knowledge_articles, bookkeeping_subscriptions, transaction_categories, tax_documents, recurring_templates, preparer_assignments, client_recurring_schedules

**Scoped via parent relationship (13 tables):** invoice_line_items (via invoice), chat_messages (via client), filled_forms (via client), signature_requests (via client), notifications (via user), client_notes (via client), push_subscriptions (via user), bank_transactions (via client), monthly_summaries (via client), ticket_required_documents (via ticket), sessions (via user), conversations, messages

**Important note on parent-scoped tables:** While tenant ownership can technically be inferred through parent joins, some of these tables would benefit from a direct `tenantId` column for safety, indexing, reporting, and operational simplicity. In particular, the following child tables are strong candidates for direct `tenantId` even though it is technically redundant:
- `invoice_line_items` — high volume, frequently aggregated in financial reports
- `bank_transactions` — highest volume table, critical for billing calculations and performance
- `chat_messages` — needed for platform-level support visibility
- `notifications` — needed for bulk admin operations and cross-tenant platform notifications
- `audit_logs` already has direct `tenantId` above

Adding direct `tenantId` to these tables costs minimal storage but significantly reduces query complexity, improves index efficiency, and eliminates the risk of join-path bugs exposing cross-tenant data. The recommendation is to add direct `tenantId` to all tables that will be queried independently (not just through their parent), even if it introduces slight denormalization.

---

## 3. API Route Inventory (90+ Routes)

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

## 4. AI Integration Audit (6 AI Features)

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

## 5. AI Governance & Safety Rules

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

## 6. Role & Permission Model Audit

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

## 7. Storage, Jobs, Notifications & Integrations Audit

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

## 8. Hardcoded CC Trucking References

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
| Client Fields | DOT Number, MC Number on the clients table | CC-SPECIFIC — should be custom/extensible fields |

---

## 9. CC Trucking to "Tenant 1" Migration Plan

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

### Migration Safety Rules
- All existing data MUST remain accessible to CC Trucking after migration
- No downtime longer than a maintenance window
- Rollback plan for each migration step
- Existing session cookies must continue to work
- All existing URLs/paths must remain functional

---

## 10. Migration Validation Checklist

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

## 11. Major Risks & Blockers

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Cross-tenant data leakage** | Security breach — tenant A sees tenant B's data | Every query must be scoped. Automated cross-tenant tests. |
| **AI prompt data leakage** | AI assistant references wrong tenant's clients/invoices | Strict tenant-scoped data loading before prompt construction. See AI Governance section. |
| **Global scheduler acting on wrong tenant** | Invoice reminders sent with wrong branding/email | Scheduler must load tenant config per operation. |
| **Breaking CC Trucking's live production** | Primary customer loses access during migration | Feature-flag the multi-tenant code. Run both paths until stable. See Migration Validation Checklist. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Performance degradation** | Adding tenant_id to every query adds overhead | Add database indexes on tenant_id for all major tables. |
| **Role permission complexity** | 6 launch roles increases auth surface area | Design and test permission matrix before implementation. Launch-only roles first, optional roles later. |
| **Billing integration complexity** | Two-tier Stripe (platform + tenant) is architecturally complex | Build platform billing first, tenant billing (bookkeeping) second. |
| **Knowledge base content exposure** | Tenant's internal articles accidentally shared with wrong tenant | Strict tenantId filtering on all KB queries. |

### Blockers

| Blocker | Resolution Required |
|---------|-------------------|
| **Pricing model not defined** | Cannot build billing without knowing per-seat vs per-tenant vs per-module pricing |
| **Platform brand name not chosen** | Cannot build platform branding, landing page, or legal terms |
| ~~Hosting model undecided~~ | **RESOLVED:** Recommended default is single shared database with `tenant_id` column isolation. Enterprise isolation can be added later if needed. |

---

## 12. Phased Implementation Roadmap

**Timeline note:** The estimates below assume the architecture is as clean in practice as it appears in this audit, and that decisions on blockers (pricing model, platform brand name) are made promptly. A realistic planning range is **5-8 months** once hidden dependencies, migration edge cases, testing depth, and billing integration complexity are accounted for. The lower end of each phase estimate assumes focused full-time work; the upper end accounts for the iteration, debugging, and rework that is normal in a project of this scope.

### Phase 0: Productization Audit (This Document) — COMPLETE
- Inventory all features, tables, routes, AI integrations
- Classify everything as core/configurable/module/CC-specific
- Define product layer architecture
- Define AI governance model
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
- Make client schema fields extensible (custom fields system or vertical-specific field sets)
- **Effort: 2-4 weeks**
- **Risk: Low** — no database structure changes

### Phase 2: Tenant Architecture + Role & Permission Redesign (Combined)

These two phases are combined because tenant structure and access control are tightly coupled. Designing tenant isolation without the permission model, or vice versa, risks rework. Both should be designed together even if some UI elements land later.

- **Tenant Architecture:**
  - Create `tenants` table (id, name, slug, logo, colors, contactEmail, industry, plan, settings JSON, aiInstructions, createdAt)
  - Add `tenant_id` to 17+ tables via migration
  - Set all existing data to CC Trucking's tenant ID
  - Create `tenantScope` middleware that automatically injects tenant filter
  - Update ALL storage methods to accept/filter by tenantId
  - Update ALL routes to use tenant-scoped queries
  - Partition file storage by tenant
  - Make schedulers tenant-aware
  - Make notifications tenant-aware
  - Make AI data loading tenant-scoped with governance rules
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
- Tenant health monitoring
- Tenant analytics vs. platform analytics separation
- **Effort: 3-4 weeks**
- **Risk: Low-Medium**

### Phase 4: Commercial Layer
- Define pricing model (prerequisite decision — must be made before this phase starts)
- Stripe integration for platform billing (tenant subscriptions)
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
- Optional data import/migration tools
- Guided setup walkthrough
- **Effort: 3-4 weeks**
- **Risk: Low-Medium**

### Phase 6: Hardening & Launch
- Security audit (cross-tenant penetration testing)
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

## 13. Ownership, Data Rights & Commercial Rules

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
| **White-label pricing** | Is custom branding included or a premium feature? |
| **Payment terms** | Monthly? Annual? Annual discount? |
| **Failed payment policy** | Grace period length? Feature degradation vs. full suspension? Data retention during suspension? |
| **Refund policy** | Under what circumstances are refunds offered? |
| **SLA commitments** | Uptime guarantee? Support response times? |

---

## 14. Success Criteria

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

---

## 15. Vertical Strategy Recommendation

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
| **Custom Client Fields** | DOT Number, MC Number, EIN |
| **FAQ Content** | Trucking-specific questions about IFTA, DOT numbers, carrier regulations |
