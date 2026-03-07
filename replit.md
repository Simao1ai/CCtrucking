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
- **Client Management**: Comprehensive client profiles including DOT/MC/EIN numbers. Prospect pipeline tracking with stage (new/contacted/quoted/proposal_sent/negotiating/won/lost), next action date, and next action note fields.
- **Service Ticket Management**: Workflow for various compliance and business setup services. Supports "blocked" status when required documents are pending. Required documents can be attached to tickets with status tracking (pending/received/waived).
- **Document Management**: Tracking and storage of compliance documents per client. Documents can be linked as required docs on tickets.
- **Invoicing**: Detailed invoicing with line items, multiple statuses (draft, sent, paid, overdue, approved), auto-calculation of totals, PDF generation (pdfkit), and email sending via Outlook SMTP (nodemailer). Admin can download PDF or email invoice with attached PDF to client. Clients can download PDF from portal. Sending an invoice auto-updates status from "draft" to "sent". Automated AR escalation: reminders sent at day 7 (friendly), day 14 (second notice), day 21+ (final notice) via scheduled background job.
- **Chat System**: Client-admin messaging system scoped per client. Internal staff-to-staff messaging via `staff_messages` table with read tracking and notifications.
- **Signature Requests**: Management and tracking of documents requiring client signatures.
- **Tax Preparation Intake**: System for collecting tax documents, with AI analysis capabilities and CSV export.
- **Service Catalog**: Predefined service items with categories and default pricing for streamlined invoicing. 10 default trucking services seeded (IFTA Filing, MCS-150 Update, UCR Registration, DOT Compliance Review, Business Entity Setup, Tax Preparation, Bookkeeping Monthly, Permit & Authority Filing, Insurance Filing, BOC-3 Filing).
- **Business Analytics**: Owner-only dashboard with key metrics: revenue, client acquisition, service breakdown, invoice aging, and top clients. Enhanced with ticket SLA tracking (7/14/30 day due counts, overdue list), document blockers by client, and detailed AR aging (current/30/60/90+ day buckets with dollar amounts).
- **Employee Performance**: Owner-only grading system tracking staff activity via audit logs. Weighted scoring by action type and entity, letter grades (A+ through F), 12-week trend charts, individual breakdowns, and recent activity logs. Useful for employee review meetings.
- **Recurring Compliance Templates**: System for auto-generating service tickets on recurring schedules. Admin creates templates (IFTA quarterly, UCR annual, MCS-150 biennial, DOT annual) with frequency, priority, and lead-time days. Clients can be assigned schedules with specific due dates. Background scheduler auto-creates tickets ahead of deadlines.
- **Bookkeeping System**: Subscription-based ($50/month flat fee) bookkeeping service for clients.
  - **Subscription Management**: Admin activates/deactivates bookkeeping per client. Feature flag model — only subscribed clients see bookkeeping in their portal.
  - **Bank Statement Upload**: CSV upload with intelligent parsing (handles date, description, amount/debit/credit columns). Supports common bank statement formats.
  - **AI Transaction Categorization**: OpenAI-powered categorization of transactions into trucking-specific categories (Fuel, Maintenance, Tolls, Insurance, Payroll, Permits, Equipment, Meals, Parking, License & Registration, Lease Payments, Office, Professional Services, Taxes, Freight Revenue, Fuel Surcharge, Accessorial Income, etc.). Batch processing with confidence scores.
  - **Monthly Financial Summaries**: Auto-generated income/expenses/net summaries with category breakdowns. Recharts visualization.
  - **Preparer Assignment**: Admin assigns tax preparers to client bookkeeping accounts. Preparers see only their assigned clients.
  - **Receipt Scanning**: Clients can photograph receipts (mobile camera capture supported), upload them, and AI (OpenAI Vision) extracts vendor, amount, date, and category. Transactions are created automatically with `source: "receipt"` and stored extraction metadata in `receiptData`. Admin can also upload receipts on behalf of clients.
  - **Stripe Scaffolding**: Code ready for Stripe subscription billing when API keys are added (manual activation for now).
- **Preparer Portal**: Dedicated portal at /preparer/* for tax preparers to review assigned client bookkeeping data, edit transaction categories, and mark transactions as reviewed.
- **Ticket Claim/Lock System**: Auto-expiring lock (30 min) preventing multiple employees from working on the same ticket simultaneously. Staff can "Start Working" to claim a ticket, "Release" when done. Locked tickets show a banner to other employees. Admins/owners can force-release any lock. Lock fields: `lockedBy`, `lockedAt`, `lockedByName` on `service_tickets` table. API: GET/POST `/api/tickets/:id/lock`, `/api/tickets/:id/claim`, `/api/tickets/:id/release`.
- **Client Notes System**: Multi-employee timestamped notes on client files. Separate `client_notes` table with authorId, authorName, content, timestamps. Staff can add, edit (own only), and delete (own only) notes. Notes tab visible on admin client detail page. API: CRUD at `/api/clients/:id/notes`.
  - **Voice Dictation**: Employees can click "Dictate Notes" to record a verbal summary via their computer microphone (post-call dictation). Audio is transcribed via OpenAI Whisper (gpt-4o-mini-transcribe), then summarized by GPT-4o-mini into structured call notes with discussion points and action items. Saved automatically as a client note. API: `POST /api/clients/:id/notes/dictate` (accepts base64 audio, 25MB limit).

### Database Tables (Bookkeeping)
- `bookkeeping_subscriptions`: Tracks which clients have active bookkeeping ($50/mo standard plan), Stripe IDs (nullable), preparer assignment.
- `bank_transactions`: Individual transactions from uploaded bank statements with AI and manual categorization, confidence scores, review status.
- `transaction_categories`: Predefined and custom categories for trucking expense/income classification (19 default seeded categories).
- `monthly_summaries`: Generated monthly financial summaries with category breakdowns stored as JSON.
- `preparer_assignments`: Links preparers to clients they're assigned to manage.

### API Route Structure (Bookkeeping)
- Admin: `/api/admin/bookkeeping/*` — full CRUD for subscriptions, transactions, categories, summaries, preparer assignments
- Client Portal: `/api/portal/bookkeeping/*` — read own subscription/transactions/summaries, upload statements, upload receipt photos with AI analysis, self-activate subscription (`POST /api/portal/bookkeeping/subscribe`)
- Preparer: `/api/preparer/*` — read assigned clients, transactions, summaries; edit transaction categories; view/upload tax documents; chat with clients; view bookkeeping yearly summary

### Preparer Portal Features
- **Dashboard**: Shows assigned client cards with subscription status
- **Client Detail Page** (tabbed interface):
  - **Transactions Tab**: Monthly transaction review with category editing and reviewed checkbox
  - **Tax Documents Tab**: View and upload tax documents (W-2, 1099s, IFTA returns, mileage logs, etc.) for assigned clients
  - **Bookkeeping Summary Tab**: Yearly financial overview with income/expenses/net, monthly breakdown table, and top category bars
  - **Messages Tab**: Direct messaging with clients (real-time polling every 5 seconds)
- Preparer credentials: testpreparer1/prep123
- All routes validate preparer-client assignment before returning data

## External Dependencies
- **OpenAI**: Integrated via Replit AI Integrations for the AI Chat Assistant, AI analysis of tax documents, and AI transaction categorization for bookkeeping (uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`).
- **Google Cloud (googleapis)**: For Google Sheets integration, requiring a Google Service Account and `GOOGLE_SERVICE_ACCOUNT_KEY` secret for accessing and pulling data from spreadsheets.
- **Stripe**: Scaffolded for subscription billing ($50/month bookkeeping). Not yet connected — will use Replit Stripe integration when ready.

### Tax Document Approval Workflow
- **Statuses**: `pending`, `analyzed`, `review`, `exported`, `ready_for_review`, `approved`, `rejected`
- **Flow**: Preparer uploads finished tax return → marks as `ready_for_review` (sends notification to client) → client reviews and approves or rejects with feedback → preparer sees status update and can re-send after corrections
- **Client Portal**: `portal-tax-documents.tsx` — clients can upload their own tax docs (W-2s, 1099s, etc.) and review/approve/reject prepared tax returns
- **Tracking fields**: `uploadedBy`, `uploadedByRole` (client/preparer/admin/owner), `rejectionFeedback`, `approvedAt`
- **Download routes**: Admin uses `/api/admin/tax-documents/:id/download`, clients use `/api/portal/tax-documents/:id/download`
