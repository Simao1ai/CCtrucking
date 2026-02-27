# CC Trucking Services - Operations Platform

## Overview
A trucking-focused CRM and operations management SaaS platform for CC Trucking Services. Features dual portals: an Admin Portal for managing all operations and a Client Portal for trucking companies to request services, view documents/invoices, and chat with staff. Manages client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), document tracking, invoicing, form templates with client auto-fill, notarization tracking, audit logging, and client-admin messaging.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter routing, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, bcryptjs
- **Auth**: Custom username/password authentication with session-based auth (no OAuth)
- **Styling**: Inter font, navy/steel blue theme (HSL 215)

## Project Structure
- `client/src/pages/` - Public pages (Home, FAQs, Contact), Login, Admin pages (Dashboard, Clients, Tickets, Documents, Invoices, Chat, Users, Signatures, Forms, Notarizations, Audit)
- `client/src/pages/portal/` - Client portal pages (Dashboard, Services, Invoices, Documents, Chat, Sign Documents)
- `client/src/components/` - AppSidebar (admin), PortalSidebar (client), ThemeToggle, Shadcn UI components
- `server/` - Express API, DatabaseStorage, seed data
- `server/replit_integrations/auth/` - Session-based auth (login, logout, user management)
- `shared/schema.ts` - Drizzle schemas for clients, serviceTickets, documents, invoices, chatMessages, signatureRequests, notifications, formTemplates, filledForms, notarizations, auditLogs
- `shared/models/auth.ts` - Users and sessions tables

## Authentication & Authorization
- **Custom auth**: Username/password login with bcrypt password hashing
- **Admin-created accounts**: Admins create all user accounts (both admin and client accounts)
- Users table has `username`, `password` (hashed), `role` ("admin"/"client"), and optional `clientId`
- Session-based auth stored in PostgreSQL sessions table
- Login page at `/login` with username/password form
- Admin middleware (`isAdmin`) checks session userId and role === "admin"
- Client middleware (`isClient`) checks session userId and clientId exists
- Default admin account: username `admin`, password `admin123`

## Key Entities
- **Users**: Auth users with username/password, role (admin/client), and optional clientId link
- **Clients**: Trucking company accounts with DOT/MC/EIN numbers
- **Service Tickets**: Workflow items (DOT Permit, IFTA, Tax Filing, Business Setup, etc.)
- **Documents**: Compliance documents per client (EIN letters, fuel records, permits)
- **Invoices**: Billing with draft/sent/paid/overdue/approved statuses
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
- `POST /api/admin/create-user` - Create new user account (admin or client)
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

### Form Routes (admin)
- `GET/POST /api/admin/form-templates` - List/create form templates
- `GET/PATCH/DELETE /api/admin/form-templates/:id` - View/update/delete template
- `GET/POST /api/admin/filled-forms` - List/create filled forms
- `GET/PATCH /api/admin/filled-forms/:id` - View/update filled form
- `POST /api/admin/filled-forms/:id/send-for-signature` - Send filled form for client signature

### Notarization Routes (admin)
- `GET/POST /api/admin/notarizations` - List/create notarization records
- `GET/PATCH /api/admin/notarizations/:id` - View/update notarization

### Audit Log Routes (admin)
- `GET /api/admin/audit-logs` - List audit entries (filterable by entityType, searchable)

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
- `/admin/invoices` - Invoice management
- `/admin/chat` - Client messaging (admin side)
- `/admin/users` - User management (create accounts, assign roles)
- `/admin/signatures` - Document signing management (send, track, remind)
- `/admin/forms` - Form templates and filled forms management
- `/admin/notarizations` - Notarization tracking
- `/admin/audit` - System audit log (read-only)
- `/portal` - Client dashboard
- `/portal/services` - Request new services
- `/portal/invoices` - View/approve invoices
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
- Default admin: username `admin`, password `admin123`
- New tables (form_templates, filled_forms, notarizations, audit_logs) created via raw SQL on startup

## Google Sheets Integration
- Uses Google Service Account for authentication (requires `GOOGLE_SERVICE_ACCOUNT_KEY` secret)
- Admin can connect spreadsheets by URL or ID at `/admin/sheets`
- API routes: `GET /api/admin/sheets/info`, `GET /api/admin/sheets/data`
- Spreadsheets must be shared with the service account email for access
- Dependencies: `googleapis` npm package

## Recent Changes
- Feb 2026: Added form templates system with placeholder-based auto-fill, filled forms with draft/complete/sent_for_signature statuses, send-for-signature integration with existing e-signing system
- Feb 2026: Added notarization tracking for in-house notarization records (notary name, commission, dates, status)
- Feb 2026: Added system-wide audit logging — tracks all creates/updates/deletes on clients, tickets, invoices, documents, forms, notarizations, signatures; filterable by entity type and searchable
- Feb 2026: Updated client detail page with Forms and Notarizations tabs
- Feb 2026: Added client detail page at /admin/clients/:id with consolidated view of all client data in a tabbed layout with summary stats
- Feb 2026: Added notification system with bell icon in both portals; auto-generates notifications for new invoices, messages, signature requests, document signings, service requests, and invoice approvals
- Feb 2026: Replaced Replit Auth OAuth with custom username/password authentication; admins now create all accounts
- Feb 2026: Added dual portal system (Admin + Client), role-based access, admin chat & user management, client portal with service requests, invoicing, documents, and messaging
- Feb 2026: Initial MVP build - Dashboard, Clients, Service Tickets, Documents, Invoices with full CRUD, sidebar navigation, dark mode toggle, and seeded demo data
