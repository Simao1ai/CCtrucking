# CC Trucking Services - Operations Platform

## Overview
A trucking-focused CRM and operations management SaaS platform for CC Trucking Services. Features dual portals: an Admin Portal for managing all operations and a Client Portal for trucking companies to request services, view documents/invoices, and chat with staff. Manages client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), document tracking, invoicing, and client-admin messaging.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter routing, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Auth**: Replit Auth (OAuth via OpenID Connect) with role-based access control
- **Styling**: Inter font, navy/steel blue theme (HSL 215)

## Project Structure
- `client/src/pages/` - Public pages (Home, FAQs, Contact), Admin pages (Dashboard, Clients, Tickets, Documents, Invoices, Chat, Users), AuthRedirect
- `client/src/pages/portal/` - Client portal pages (Dashboard, Services, Invoices, Documents, Chat)
- `client/src/components/` - AppSidebar (admin), PortalSidebar (client), ThemeToggle, Shadcn UI components
- `server/` - Express API, DatabaseStorage, seed data
- `server/replit_integrations/auth/` - Replit Auth OIDC integration (sessions, user upsert, login/logout/callback)
- `shared/schema.ts` - Drizzle schemas for clients, serviceTickets, documents, invoices, chatMessages
- `shared/models/auth.ts` - Users and sessions tables (Replit Auth)

## Authentication & Authorization
- **Replit Auth** handles OAuth login (Google, GitHub, email)
- Users table has `role` field ("admin" or "client") and optional `clientId` linking to a client company
- After login, `/auth/redirect` page checks user role and redirects to `/admin` or `/portal`
- Admin middleware (`isAdmin`) checks role === "admin"
- Client middleware (`isClient`) checks clientId exists and attaches it to request
- First user defaults to "client" role; admins are promoted via `/api/auth/set-admin`

## Key Entities
- **Users**: Auth users with role (admin/client) and optional clientId link
- **Clients**: Trucking company accounts with DOT/MC/EIN numbers
- **Service Tickets**: Workflow items (DOT Permit, IFTA, Tax Filing, Business Setup, etc.)
- **Documents**: Compliance documents per client (EIN letters, fuel records, permits)
- **Invoices**: Billing with draft/sent/paid/overdue/approved statuses
- **Chat Messages**: Client-admin messaging scoped by clientId

## API Routes

### Auth Routes
- `GET /api/login` - Initiate OAuth login
- `GET /api/callback` - OAuth callback (redirects to /auth/redirect)
- `GET /api/logout` - Logout and end session
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/auth/me` - Get user with role info
- `PATCH /api/auth/assign-client` - Assign user to client account (admin only)
- `PATCH /api/auth/set-admin` - Promote user to admin (admin only)

### Admin Routes (protected by isAdmin)
- `GET /api/admin/users` - List all users
- `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/:id`
- `GET/POST /api/tickets`, `GET/PATCH /api/tickets/:id`
- `GET/POST /api/documents`, `GET/PATCH /api/documents/:id`
- `GET/POST /api/invoices`, `GET/PATCH /api/invoices/:id`
- `GET /api/admin/chats` - List all clients for chat
- `GET/POST /api/admin/chats/:clientId` - View/send messages for a client

### Client Portal Routes (protected by isClient)
- `GET /api/portal/account` - Get linked client company info
- `GET /api/portal/tickets`, `POST /api/portal/tickets` - View/create service requests
- `GET /api/portal/documents` - View compliance documents
- `GET /api/portal/invoices` - View invoices
- `PATCH /api/portal/invoices/:id/approve` - Approve an invoice
- `GET/POST /api/portal/chat` - View/send messages to admin

## Frontend Routes
- `/` - Public home page
- `/faqs` - Public FAQs page
- `/contact` - Public contact page
- `/auth/redirect` - Post-login role-based redirect
- `/admin` - Admin dashboard
- `/admin/clients` - Client management
- `/admin/tickets` - Service ticket management
- `/admin/documents` - Document management
- `/admin/invoices` - Invoice management
- `/admin/chat` - Client messaging (admin side)
- `/admin/users` - User role management
- `/portal` - Client dashboard
- `/portal/services` - Request new services
- `/portal/invoices` - View/approve invoices
- `/portal/documents` - View compliance documents
- `/portal/chat` - Message admin team

## Running
- `npm run dev` starts Express + Vite on port 5000
- `npm run db:push` syncs database schema
- Seed data is auto-inserted on first run

## Recent Changes
- Feb 2026: Added dual portal system (Admin + Client), Replit Auth with role-based access, admin chat & user management, client portal with service requests, invoicing, documents, and messaging
- Feb 2026: Initial MVP build - Dashboard, Clients, Service Tickets, Documents, Invoices with full CRUD, sidebar navigation, dark mode toggle, and seeded demo data
