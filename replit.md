# CC Trucking Services - Operations Platform

## Overview
A trucking-focused CRM and operations management SaaS platform for CC Trucking Services. Features dual portals: an Admin Portal for managing all operations and a Client Portal for trucking companies to request services, view documents/invoices, and chat with staff. Manages client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), document tracking, invoicing with service line items, form templates with client auto-fill, notarization tracking, audit logging, business analytics (owner-only), AI chat assistant, and client-admin messaging.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter routing, Shadcn UI, Tailwind CSS, Recharts
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, bcryptjs, OpenAI (via Replit AI Integrations)
- **Auth**: Custom username/password authentication with session-based auth (no OAuth)
- **AI**: OpenAI GPT via Replit AI Integrations (AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY)
- **Styling**: Inter font, navy/steel blue theme (HSL 215)

## Project Structure
- `client/src/pages/` - Public pages (Home, FAQs, Contact), Login, Admin pages (Dashboard, Clients, Tickets, Documents, Invoices, Chat, Users, Signatures, Forms, Notarizations, Audit, Service Items, Analytics, AI Chat)
- `client/src/pages/portal/` - Client portal pages (Dashboard, Services, Invoices, Documents, Chat, Sign Documents)
- `client/src/components/` - AppSidebar (admin), PortalSidebar (client), ThemeToggle, Shadcn UI components
- `server/` - Express API, DatabaseStorage, seed data
- `server/replit_integrations/auth/` - Session-based auth (login, logout, user management)
- `shared/schema.ts` - Drizzle schemas for clients, serviceTickets, documents, invoices, chatMessages, signatureRequests, notifications, formTemplates, filledForms, notarizations, auditLogs, serviceItems, invoiceLineItems
- `shared/models/auth.ts` - Users and sessions tables
- `shared/models/chat.ts` - Conversations and messages tables (AI chat)

## Authentication & Authorization
- **Custom auth**: Username/password login with bcrypt password hashing
- **Admin-created accounts**: Admins create all user accounts (owner, admin, and client accounts)
- **Roles**: "owner" (main admin, sees analytics), "admin" (employee), "client" (portal user)
- Users table has `username`, `password` (hashed), `role` ("owner"/"admin"/"client"), and optional `clientId`
- Session-based auth stored in PostgreSQL sessions table
- Login page at `/login` with username/password form
- `isAdmin` middleware checks role === "admin" OR "owner"
- `isOwner` middleware checks role === "owner" only (for analytics)
- `isClient` middleware checks session userId and clientId exists
- Default admin account: username `admin`, password `admin123` (role: owner)

## Key Entities
- **Users**: Auth users with username/password, role (owner/admin/client), and optional clientId link
- **Clients**: Trucking company accounts with DOT/MC/EIN numbers
- **Service Tickets**: Workflow items (DOT Permit, IFTA, Tax Filing, Business Setup, etc.)
- **Documents**: Compliance documents per client (EIN letters, fuel records, permits)
- **Invoices**: Billing with draft/sent/paid/overdue/approved statuses, supports line items
- **Invoice Line Items**: Individual service charges on an invoice (qty, unit price, amount)
- **Service Items**: Predefined service catalog with default pricing (DOT registration, IFTA filing, etc.)
- **Chat Messages**: Client-admin messaging scoped by clientId
- **Form Templates**: Reusable form templates with placeholders ({{client_name}}, {{dot_number}}, etc.)
- **Filled Forms**: Completed forms per client, statuses: draft/complete/sent_for_signature, linkable to signature requests
- **Notarizations**: In-house notarization records with notary details, commission info, status tracking
- **Audit Logs**: System-wide action tracking (creates/updates/deletes) with user, entity, and detail info

## API Routes

### Auth Routes
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/auth/me` - Get user with role info

### Admin Routes (protected by isAdmin)
- `POST /api/admin/create-user` - Create new user account (owner, admin, or client)
- `DELETE /api/admin/users/:id` - Delete a user account
- `GET /api/admin/users` - List all users
- `PATCH /api/auth/assign-client` - Assign user to client account
- `PATCH /api/auth/set-admin` - Promote user to admin
- `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/:id`
- `GET/POST /api/tickets`, `GET/PATCH /api/tickets/:id`
- `GET/POST /api/documents`, `GET/PATCH /api/documents/:id`
- `GET/POST /api/invoices`, `GET/PATCH /api/invoices/:id`
- `GET /api/admin/chats` - List all clients for chat
- `GET/POST /api/admin/chats/:clientId` - View/send messages for a client
- `GET /api/clients/:id/summary` - Get all client data (tickets, docs, invoices, messages, signatures, forms, notarizations)
- `GET/POST /api/admin/signatures` - List/create signature requests
- `GET /api/admin/signatures/:id` - View a signature request
- `POST /api/admin/signatures/:id/remind` - Send email/SMS reminder

### Service Items Routes (admin)
- `GET/POST /api/admin/service-items` - List/create service items
- `GET/PATCH/DELETE /api/admin/service-items/:id` - View/update/delete service item

### Invoice Line Items Routes (admin)
- `GET /api/invoices/:id/line-items` - List line items for an invoice
- `POST /api/invoices/:id/line-items` - Add line item (auto-updates invoice total)
- `PATCH /api/invoice-line-items/:id` - Update line item (auto-updates invoice total)
- `DELETE /api/invoice-line-items/:id` - Delete line item (auto-updates invoice total)

### Form Routes (admin)
- `GET/POST /api/admin/form-templates` - List/create form templates
- `GET/PATCH/DELETE /api/admin/form-templates/:id` - View/update/delete template
- `GET/POST /api/admin/filled-forms` - List/create filled forms
- `GET/PATCH /api/admin/filled-forms/:id` - View/update filled form
- `POST /api/admin/filled-forms/:id/send-for-signature` - Send filled form for client signature

### Notarization Routes (admin)
- `GET/POST /api/admin/notarizations` - List/create notarization records
- `GET/PATCH /api/admin/notarizations/:id` - View/update notarization

### Tax Prep Routes (admin)
- `GET /api/admin/tax-documents` - List tax documents (filterable by clientId, taxYear)
- `GET /api/admin/tax-documents/export/csv` - Export tax documents to CSV
- `GET /api/admin/tax-documents/:id` - View a tax document
- `POST /api/admin/tax-documents` - Create a tax document
- `PATCH /api/admin/tax-documents/:id` - Update a tax document
- `DELETE /api/admin/tax-documents/:id` - Delete a tax document
- `POST /api/admin/tax-documents/:id/analyze` - Run AI analysis on a tax document
- `GET /api/admin/tax-summary/:clientId` - Get tax summary for a client (by year)

### Audit Log Routes (admin)
- `GET /api/admin/audit-logs` - List audit entries (filterable by entityType, searchable)

### Analytics Routes (owner only)
- `GET /api/admin/analytics` - Aggregated business analytics (revenue, clients, tickets, monthly trends, service breakdown, aging, top clients)

### AI Chat Routes (admin)
- `POST /api/admin/ai-chat` - Stream AI chat with account context (SSE response)

### Notification Routes (authenticated)
- `GET /api/notifications` - List notifications for current user
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark single notification read
- `POST /api/notifications/mark-all-read` - Mark all read

### Client Portal Routes (protected by isClient)
- `GET /api/portal/account` - Get linked client company info
- `GET /api/portal/tickets`, `POST /api/portal/tickets` - View/create service requests
- `GET /api/portal/documents` - View compliance documents
- `GET /api/portal/invoices` - View invoices
- `GET /api/portal/invoices/:id/line-items` - View invoice line items
- `PATCH /api/portal/invoices/:id/approve` - Approve an invoice
- `GET/POST /api/portal/chat` - View/send messages to admin
- `GET /api/portal/signatures` - List signature requests for client
- `GET /api/portal/signatures/:id` - View a signature request
- `POST /api/portal/signatures/:id/sign` - Sign a document (with canvas signature)

## Frontend Routes
- `/` - Public home page
- `/faqs` - Public FAQs page
- `/contact` - Public contact page
- `/login` - Login page (username/password)
- `/admin` - Admin dashboard
- `/admin/clients` - Client management (list view)
- `/admin/clients/:id` - Client detail page (all info, tickets, invoices, docs, signatures, forms, notarizations, chat)
- `/admin/tickets` - Service ticket management
- `/admin/documents` - Document management
- `/admin/invoices` - Invoice management (with line items)
- `/admin/service-items` - Service catalog management (predefined fees/pricing)
- `/admin/chat` - Client messaging (admin side)
- `/admin/ai-chat` - AI assistant chat (account-aware)
- `/admin/analytics` - Business analytics dashboard (owner-only)
- `/admin/users` - User management (create accounts, assign roles)
- `/admin/signatures` - Document signing management (send, track, remind)
- `/admin/forms` - Form templates and filled forms management
- `/admin/notarizations` - Notarization tracking
- `/admin/tax-prep` - Tax preparation intake (document collection, AI analysis, CSV export)
- `/admin/audit` - System audit log (read-only)
- `/portal` - Client dashboard
- `/portal/services` - Request new services
- `/portal/invoices` - View/approve invoices (with line item breakdown)
- `/portal/documents` - View compliance documents
- `/portal/chat` - Message admin team
- `/portal/signatures` - View & sign documents (truck-driver-friendly UI with canvas signature pad)

## Form Template Placeholders
Templates support these auto-fill placeholders from client data:
- `{{client_name}}`, `{{contact_name}}`, `{{email}}`, `{{phone}}`
- `{{dot_number}}`, `{{mc_number}}`, `{{ein_number}}`
- `{{address}}`, `{{city}}`, `{{state}}`, `{{zip_code}}`
- `{{date}}` (auto-fills current date)

## Running
- `npm run dev` starts Express + Vite on port 5000
- `npm run db:push` syncs database schema
- Seed data is auto-inserted on first run
- Default admin: username `admin`, password `admin123` (role: owner)
- Database tables created via raw SQL on startup: form_templates, filled_forms, notarizations, audit_logs, service_items, invoice_line_items, conversations, messages

## Google Sheets Integration
- Uses Google Service Account for authentication (requires `GOOGLE_SERVICE_ACCOUNT_KEY` secret)
- Admin can connect spreadsheets by URL or ID at `/admin/sheets`
- API routes: `GET /api/admin/sheets/info`, `GET /api/admin/sheets/data`
- Spreadsheets must be shared with the service account email for access
- Dependencies: `googleapis` npm package

## AI Chat Assistant
- Uses OpenAI via Replit AI Integrations (gpt-5.2 model)
- System prompt loads live account data: clients, tickets, invoices, documents, service catalog
- Streaming SSE responses for real-time chat experience
- Admin-only access at `/admin/ai-chat`

## Service Catalog
- 18 predefined service items seeded (DOT registration, IFTA filing, BOC-3, UCR, EIN, tax filing, etc.)
- Categories: DOT Compliance, IFTA Filing, Tax Filing, Business Setup, General
- Service items can be selected when adding invoice line items (auto-fills description and price)

## Recent Changes
- Feb 2026: Added tax preparation intake system — tax_documents table for collecting W-2s, 1099s, Schedule C, and other tax forms; AI-powered analysis using OpenAI to extract structured data (income, withholding, EIN, risk flags); CSV export for tax software; SSN masking; audit-logged access; per-client tax summaries
- Feb 2026: Added service fee line items system — service_items table with predefined pricing, invoice_line_items table for itemized invoicing, auto-computed totals
- Feb 2026: Added "owner" role — main admin with access to business analytics; regular admins cannot see analytics
- Feb 2026: Added business analytics dashboard (owner-only) with revenue charts, client metrics, service breakdown, invoice aging, top clients
- Feb 2026: Added AI chat assistant with streaming responses, loaded with live account context (clients, tickets, invoices, documents, services)
- Feb 2026: Added form templates system with placeholder-based auto-fill, filled forms with draft/complete/sent_for_signature statuses, send-for-signature integration with existing e-signing system
- Feb 2026: Added notarization tracking for in-house notarization records (notary name, commission, dates, status)
- Feb 2026: Added system-wide audit logging — tracks all creates/updates/deletes on clients, tickets, invoices, documents, forms, notarizations, signatures; filterable by entity type and searchable
- Feb 2026: Updated client detail page with Forms and Notarizations tabs
- Feb 2026: Added client detail page at /admin/clients/:id with consolidated view of all client data in a tabbed layout with summary stats
- Feb 2026: Added notification system with bell icon in both portals; auto-generates notifications for new invoices, messages, signature requests, document signings, service requests, and invoice approvals
- Feb 2026: Replaced Replit Auth OAuth with custom username/password authentication; admins now create all accounts
- Feb 2026: Added dual portal system (Admin + Client), role-based access, admin chat & user management, client portal with service requests, invoicing, documents, and messaging
- Feb 2026: Initial MVP build - Dashboard, Clients, Service Tickets, Documents, Invoices with full CRUD, sidebar navigation, dark mode toggle, and seeded demo data
