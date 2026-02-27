# CC Trucking Services - Operations Platform

## Overview
A trucking-focused CRM and operations management SaaS platform for CC Trucking Services. Features dual portals: an Admin Portal for managing all operations and a Client Portal for trucking companies to request services, view documents/invoices, and chat with staff. Manages client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), document tracking, invoicing, and client-admin messaging.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter routing, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, bcryptjs
- **Auth**: Custom username/password authentication with session-based auth (no OAuth)
- **Styling**: Inter font, navy/steel blue theme (HSL 215)

## Project Structure
- `client/src/pages/` - Public pages (Home, FAQs, Contact), Login, Admin pages (Dashboard, Clients, Tickets, Documents, Invoices, Chat, Users)
- `client/src/pages/portal/` - Client portal pages (Dashboard, Services, Invoices, Documents, Chat)
- `client/src/components/` - AppSidebar (admin), PortalSidebar (client), ThemeToggle, Shadcn UI components
- `server/` - Express API, DatabaseStorage, seed data
- `server/replit_integrations/auth/` - Session-based auth (login, logout, user management)
- `shared/schema.ts` - Drizzle schemas for clients, serviceTickets, documents, invoices, chatMessages
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
- `/login` - Login page (username/password)
- `/admin` - Admin dashboard
- `/admin/clients` - Client management
- `/admin/tickets` - Service ticket management
- `/admin/documents` - Document management
- `/admin/invoices` - Invoice management
- `/admin/chat` - Client messaging (admin side)
- `/admin/users` - User management (create accounts, assign roles)
- `/portal` - Client dashboard
- `/portal/services` - Request new services
- `/portal/invoices` - View/approve invoices
- `/portal/documents` - View compliance documents
- `/portal/chat` - Message admin team

## Running
- `npm run dev` starts Express + Vite on port 5000
- `npm run db:push` syncs database schema
- Seed data is auto-inserted on first run
- Default admin: username `admin`, password `admin123`

## Google Sheets Integration
- Uses Google Service Account for authentication (requires `GOOGLE_SERVICE_ACCOUNT_KEY` secret)
- Admin can connect spreadsheets by URL or ID at `/admin/sheets`
- API routes: `GET /api/admin/sheets/info`, `GET /api/admin/sheets/data`
- Spreadsheets must be shared with the service account email for access
- Dependencies: `googleapis` npm package

## Recent Changes
- Feb 2026: Replaced Replit Auth OAuth with custom username/password authentication; admins now create all accounts (both admin and client); added login page, user creation dialog, user deletion
- Feb 2026: Added dual portal system (Admin + Client), role-based access, admin chat & user management, client portal with service requests, invoicing, documents, and messaging
- Feb 2026: Initial MVP build - Dashboard, Clients, Service Tickets, Documents, Invoices with full CRUD, sidebar navigation, dark mode toggle, and seeded demo data
