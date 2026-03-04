# CC Trucking Services - Operations Platform

## Overview
CC Trucking Services is a SaaS platform designed for trucking companies, offering a comprehensive CRM and operations management solution. It features distinct Admin, Client, and Preparer Portals. The Admin Portal enables staff to manage client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), documents, invoicing, forms, notarizations, bookkeeping, and provides business analytics. The Client Portal allows trucking companies to request services, view documents and invoices, access bookkeeping data, and communicate with staff. The Preparer Portal allows assigned tax preparers to review client bookkeeping transactions and summaries. The platform aims to streamline trucking operations, enhance client communication, and provide valuable business insights.

## User Preferences
I prefer iterative development, so please provide updates frequently. I value clear and concise communication. When making changes, please ask for confirmation before implementing major architectural shifts.

## System Architecture

### UI/UX Decisions
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter for routing.
- **Styling**: Shadcn UI, Tailwind CSS, Inter font, with a consistent navy/steel blue theme (HSL 215).
- **Charting**: Recharts for data visualization in analytics and bookkeeping summaries.
- **Triple Portal System**: Separate interfaces for Admin (AppSidebar), Client (PortalSidebar), and Preparer (PreparerSidebar) users.
- **Client-friendly Features**: Truck-driver-friendly UI for document signing with a canvas signature pad.

### Technical Implementations
- **Backend**: Express.js with a RESTful API.
- **Database**: PostgreSQL managed with Drizzle ORM.
- **Authentication**: Custom username/password authentication with bcrypt hashing and session-based management. Accounts are admin-created with roles: "owner", "admin", "client", "preparer".
- **Authorization**: Role-based access control (`isAdmin`, `isOwner`, `isClient`, `isPreparer` middleware).
- **Service Catalog**: Predefined service items with categories and default pricing for streamlined invoicing.
- **Form Management**: Reusable form templates with auto-fill placeholders for client data; tracking of filled forms with various statuses.
- **Notarization Tracking**: System for recording in-house notarization details.
- **Audit Logging**: Comprehensive system-wide logging for all major data operations (creates, updates, deletes) with user and entity details.
- **Notification System**: In-app notifications for users in both portals for events like new invoices, messages, and signature requests. Push notifications via Web Push API with VAPID keys.
- **PWA Support**: Progressive Web App with manifest.json, service worker for push notifications, and installable on mobile/desktop. Service worker handles push events and notification clicks with deep linking.

### Feature Specifications
- **Client Management**: Comprehensive client profiles including DOT/MC/EIN numbers.
- **Service Ticket Management**: Workflow for various compliance and business setup services.
- **Document Management**: Tracking and storage of compliance documents per client.
- **Invoicing**: Detailed invoicing with line items, multiple statuses (draft, sent, paid, overdue, approved), and auto-calculation of totals.
- **Chat System**: Client-admin messaging system scoped per client.
- **Signature Requests**: Management and tracking of documents requiring client signatures.
- **Tax Preparation Intake**: System for collecting tax documents, with AI analysis capabilities and CSV export.
- **Business Analytics**: Owner-only dashboard with key metrics: revenue, client acquisition, service breakdown, invoice aging, and top clients.
- **Employee Performance**: Owner-only grading system tracking staff activity via audit logs. Weighted scoring by action type and entity, letter grades (A+ through F), 12-week trend charts, individual breakdowns, and recent activity logs. Useful for employee review meetings.
- **Bookkeeping System**: Subscription-based ($50/month flat fee) bookkeeping service for clients.
  - **Subscription Management**: Admin activates/deactivates bookkeeping per client. Feature flag model — only subscribed clients see bookkeeping in their portal.
  - **Bank Statement Upload**: CSV upload with intelligent parsing (handles date, description, amount/debit/credit columns). Supports common bank statement formats.
  - **AI Transaction Categorization**: OpenAI-powered categorization of transactions into trucking-specific categories (Fuel, Maintenance, Tolls, Insurance, Payroll, Permits, Equipment, Meals, Parking, License & Registration, Lease Payments, Office, Professional Services, Taxes, Freight Revenue, Fuel Surcharge, Accessorial Income, etc.). Batch processing with confidence scores.
  - **Monthly Financial Summaries**: Auto-generated income/expenses/net summaries with category breakdowns. Recharts visualization.
  - **Preparer Assignment**: Admin assigns tax preparers to client bookkeeping accounts. Preparers see only their assigned clients.
  - **Stripe Scaffolding**: Code ready for Stripe subscription billing when API keys are added (manual activation for now).
- **Preparer Portal**: Dedicated portal at /preparer/* for tax preparers to review assigned client bookkeeping data, edit transaction categories, and mark transactions as reviewed.

### Database Tables (Bookkeeping)
- `bookkeeping_subscriptions`: Tracks which clients have active bookkeeping ($50/mo standard plan), Stripe IDs (nullable), preparer assignment.
- `bank_transactions`: Individual transactions from uploaded bank statements with AI and manual categorization, confidence scores, review status.
- `transaction_categories`: Predefined and custom categories for trucking expense/income classification (19 default seeded categories).
- `monthly_summaries`: Generated monthly financial summaries with category breakdowns stored as JSON.
- `preparer_assignments`: Links preparers to clients they're assigned to manage.

### API Route Structure (Bookkeeping)
- Admin: `/api/admin/bookkeeping/*` — full CRUD for subscriptions, transactions, categories, summaries, preparer assignments
- Client Portal: `/api/portal/bookkeeping/*` — read own subscription/transactions/summaries, upload statements
- Preparer: `/api/preparer/*` — read assigned clients, transactions, summaries; edit transaction categories

## External Dependencies
- **OpenAI**: Integrated via Replit AI Integrations for the AI Chat Assistant, AI analysis of tax documents, and AI transaction categorization for bookkeeping (uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`).
- **Google Cloud (googleapis)**: For Google Sheets integration, requiring a Google Service Account and `GOOGLE_SERVICE_ACCOUNT_KEY` secret for accessing and pulling data from spreadsheets.
- **Stripe**: Scaffolded for subscription billing ($50/month bookkeeping). Not yet connected — will use Replit Stripe integration when ready.
