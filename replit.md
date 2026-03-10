# CC Trucking Services - Operations Platform

## Overview
CC Trucking Services is a SaaS platform providing a comprehensive CRM and operations management solution for trucking companies. It features distinct Admin, Client, and Preparer Portals to streamline trucking operations, enhance client communication, and provide valuable business insights. The platform supports managing client accounts, service tickets (DOT/IFTA compliance, tax filings, business setup), documents, invoicing, forms, notarizations, bookkeeping, and business analytics.

## User Preferences
I prefer iterative development, so please provide updates frequently. I value clear and concise communication. When making changes, please ask for confirmation before implementing major architectural shifts.

## System Architecture

### UI/UX Decisions
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter for routing.
- **Styling**: Shadcn UI, Tailwind CSS, Inter font, with a consistent navy/steel blue theme.
- **Charting**: Recharts for data visualization.
- **Triple Portal System**: Separate interfaces for Admin (AppSidebar), Client (PortalSidebar), and Preparer (PreparerSidebar).
- **Client-friendly Features**: Truck-driver-friendly UI for document signing with a canvas signature pad.

### Technical Implementations
- **Backend**: Express.js with a RESTful API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom username/password authentication with bcrypt and session-based management; role-based access control ("owner", "admin", "client", "preparer").
- **Service Catalog**: Predefined service items with categories and default pricing.
- **Form Management**: Reusable form templates with auto-fill and status tracking.
- **Notarization Tracking**: System for recording in-house notarization details.
- **Audit Logging**: Comprehensive system-wide logging for all major data operations.
- **Notification System**: In-app notifications and push notifications via Web Push API.
- **PWA Support**: Progressive Web App with manifest.json and service worker for push notifications and mobile/desktop installability.

### Feature Specifications
- **Client Management**: Comprehensive client profiles, prospect pipeline tracking.
- **Service Ticket Management**: Workflow for compliance and business setup services, including document tracking and "blocked" status.
- **Document Management**: Tracking and storage of compliance documents.
- **Invoicing**: Detailed invoicing with line items, multiple statuses, PDF generation, email sending, and automated AR escalation.
- **Chat System**: Client-admin messaging system scoped per client; internal staff-to-staff messaging.
- **Signature Requests**: Management and tracking of documents requiring client signatures.
- **Tax Preparation Intake**: System for collecting tax documents with AI analysis and CSV export.
- **Business Analytics**: Owner-only dashboard with key metrics: revenue, client acquisition, service breakdown, invoice aging, and top clients, enhanced with ticket SLA tracking and detailed AR aging.
- **Employee Performance**: Owner-only grading system tracking staff activity via audit logs, with weighted scoring and trend charts.
- **Recurring Compliance Templates**: System for auto-generating service tickets on recurring schedules.
- **Bookkeeping System**: Subscription-based bookkeeping service including:
    - **Subscription Management**: Admin activation/deactivation per client.
    - **Bank Statement Upload**: CSV upload with intelligent parsing.
    - **AI Transaction Categorization**: OpenAI-powered categorization into trucking-specific categories.
    - **Monthly Financial Summaries**: Auto-generated income/expenses/net summaries.
    - **Preparer Assignment**: Admin assigns tax preparers to client bookkeeping accounts.
    - **Receipt Scanning**: Clients can upload receipt photos with AI extraction of vendor, amount, date, and category.
- **Preparer Portal**: Dedicated portal for tax preparers to review assigned client bookkeeping data, edit transaction categories, manage tax documents, and communicate with clients.
- **Ticket Claim/Lock System**: Auto-expiring lock to prevent multiple employees from working on the same ticket simultaneously.
- **Client Notes System**: Multi-employee timestamped notes on client files, including voice dictation and AI summarization into structured call notes.
- **AI Assistant (Enhanced)**: Dual-role AI assistant providing internal operations support and trucking industry expertise (FMCSA, DOT, IFTA, UCR, IRS regulations), with a "Save to Documents" feature.
- **Knowledge Base**: Internal knowledge library for staff, organized by category, with search functionality and AI integration.
- **Client Portal AI Assistant**: Floating "Help" button in the client portal, providing client-specific assistance, portal navigation, and escalation guidance.
- **Tax Document Approval Workflow**: Status-driven workflow for tax documents, allowing preparers to upload and clients to review, approve, or reject with feedback.

## External Dependencies
- **OpenAI**: Integrated for the AI Chat Assistant, AI analysis of tax documents, and AI transaction categorization.
- **Google Cloud (googleapis)**: For Google Sheets integration using a Google Service Account.
- **Stripe**: Scaffolded for subscription billing (future integration).