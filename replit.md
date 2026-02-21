# CC Trucking Services - Operations Platform

## Overview
A trucking-focused CRM and operations management platform for CC Trucking Services. Manages client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), document tracking, and invoicing.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter routing, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Styling**: Inter font, navy/steel blue theme (HSL 215)

## Project Structure
- `client/src/pages/` - Dashboard, Clients, Tickets, Documents, Invoices
- `client/src/components/` - AppSidebar, ThemeToggle, Shadcn UI components
- `server/` - Express API, DatabaseStorage, seed data
- `shared/schema.ts` - Drizzle schemas for clients, serviceTickets, documents, invoices

## Key Entities
- **Clients**: Trucking company accounts with DOT/MC/EIN numbers
- **Service Tickets**: Workflow items (DOT Permit, IFTA, Tax Filing, Business Setup, etc.)
- **Documents**: Compliance documents per client (EIN letters, fuel records, permits)
- **Invoices**: Billing with draft/sent/paid/overdue statuses

## API Routes
All routes prefixed with `/api/`:
- `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id`
- `GET/POST /tickets`, `GET/PATCH /tickets/:id`
- `GET/POST /documents`, `GET/PATCH /documents/:id`
- `GET/POST /invoices`, `GET/PATCH /invoices/:id`

## Running
- `npm run dev` starts Express + Vite on port 5000
- `npm run db:push` syncs database schema
- Seed data is auto-inserted on first run

## Recent Changes
- Feb 2026: Initial MVP build - Dashboard, Clients, Service Tickets, Documents, Invoices with full CRUD, sidebar navigation, dark mode toggle, and seeded demo data
