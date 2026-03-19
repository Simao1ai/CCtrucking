# CarrierDeskHQ — Client-Only iOS App Plan

## Overview

A native Swift/SwiftUI iOS app for **clients** (trucking company operators) to interact with their CarrierDeskHQ tenant. The app consumes the existing `/api/v1/mobile-*` REST endpoints — no new backend work required for the MVP.

---

## 1. Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | **SwiftUI** (iOS 16+) | Declarative, modern, minimal boilerplate |
| Navigation | `NavigationStack` | Single-stack with programmatic routing |
| Networking | `URLSession` + async/await | No third-party HTTP libs needed |
| Auth token | **Keychain** (via a small wrapper) | Secure, persists across launches |
| State | `@Observable` (iOS 17) / `ObservableObject` (iOS 16) | Simple view-models per screen |
| Local cache | `SwiftData` or `UserDefaults` for lightweight prefs | Offline-ready dashboard snapshots |
| Push notifications | APNs + existing `web-push` backend (future) | Phase 2 |

**No backend changes for MVP** — the server already exposes:
- `POST /api/v1/mobile-auth/lookup` — resolve company slug → tenant info + branding
- `POST /api/v1/mobile-auth/login` — username/password → Bearer token (7-day expiry)
- `POST /api/v1/mobile-auth/logout`
- `GET  /api/v1/mobile-auth/me` — current client profile
- `GET  /api/v1/mobile-client/dashboard` — full summary (tickets, invoices, docs, signatures, notarizations)
- `GET  /api/v1/mobile-client/tickets?status=`
- `GET  /api/v1/mobile-client/invoices?status=`
- `GET  /api/v1/mobile-client/documents`
- `GET  /api/v1/mobile-client/signatures`
- `GET  /api/v1/mobile-client/notarizations`

---

## 2. Project Structure

```
ios/
├── CarrierDeskHQ.xcodeproj
├── CarrierDeskHQ/
│   ├── App/
│   │   ├── CarrierDeskHQApp.swift          # @main entry, root navigation
│   │   └── AppState.swift                  # Global auth state, tenant branding
│   ├── Models/
│   │   ├── AuthModels.swift                # LoginResponse, TenantInfo, ClientProfile
│   │   ├── DashboardModels.swift           # DashboardSummary, PendingAction
│   │   ├── TicketModels.swift              # Ticket
│   │   ├── InvoiceModels.swift             # Invoice
│   │   ├── DocumentModels.swift            # Document
│   │   ├── SignatureModels.swift           # SignatureRequest
│   │   └── NotarizationModels.swift        # Notarization
│   ├── Services/
│   │   ├── APIClient.swift                 # Base HTTP client, token injection, error handling
│   │   ├── AuthService.swift               # lookup, login, logout, me
│   │   ├── DashboardService.swift          # fetchDashboard
│   │   ├── TicketService.swift             # fetchTickets
│   │   ├── InvoiceService.swift            # fetchInvoices
│   │   ├── DocumentService.swift           # fetchDocuments
│   │   ├── SignatureService.swift          # fetchSignatures
│   │   └── NotarizationService.swift       # fetchNotarizations
│   ├── Keychain/
│   │   └── KeychainHelper.swift            # Save/read/delete token + tenant slug
│   ├── Views/
│   │   ├── Auth/
│   │   │   ├── CompanyLookupView.swift     # Step 1: enter company code
│   │   │   └── LoginView.swift             # Step 2: username + password
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift         # Main hub: summary cards + pending actions
│   │   │   └── SummaryCardView.swift       # Reusable stat card
│   │   ├── Tickets/
│   │   │   ├── TicketListView.swift        # Filterable list
│   │   │   └── TicketDetailView.swift      # Single ticket details
│   │   ├── Invoices/
│   │   │   ├── InvoiceListView.swift       # Filterable list
│   │   │   └── InvoiceDetailView.swift     # Single invoice details
│   │   ├── Documents/
│   │   │   └── DocumentListView.swift      # Document list with type icons
│   │   ├── Signatures/
│   │   │   └── SignatureListView.swift      # Pending & completed signatures
│   │   ├── Notarizations/
│   │   │   └── NotarizationListView.swift   # Notarization status list
│   │   ├── Profile/
│   │   │   └── ProfileView.swift           # Client info (read-only), logout
│   │   └── Shared/
│   │       ├── StatusBadge.swift           # Colored status pill
│   │       ├── EmptyStateView.swift        # "No items" placeholder
│   │       ├── ErrorView.swift             # Retry-able error display
│   │       └── LoadingView.swift           # Spinner / skeleton
│   ├── Theme/
│   │   └── BrandTheme.swift               # Dynamic colors from tenant branding
│   └── Assets.xcassets/
│       ├── AppIcon.appiconset/
│       └── Colors/
└── CarrierDeskHQTests/
    └── APIClientTests.swift
```

---

## 3. Screens & User Flow

### 3.1 Authentication Flow
```
┌──────────────────┐     ┌──────────┐     ┌───────────┐
│ Company Lookup    │ ──▶ │  Login   │ ──▶ │ Dashboard │
│ (enter slug)     │     │          │     │           │
└──────────────────┘     └──────────┘     └───────────┘
        ▲                                       │
        └───── Logout ◀─────────────────────────┘
```

1. **Company Lookup** — user enters their company code (slug). Calls `/lookup`. On success, shows company logo + name, transitions to login.
2. **Login** — username + password. Calls `/login`. Stores Bearer token in Keychain. Saves tenant branding for theming.
3. **Auto-login** — on app launch, if a valid token exists in Keychain, call `/me` to validate. If 401, clear and show Company Lookup.

### 3.2 Main Tab Bar (Post-Login)
| Tab | Icon | Screen | API Endpoint |
|-----|------|--------|-------------|
| Home | `house.fill` | Dashboard | `/mobile-client/dashboard` |
| Tickets | `ticket.fill` | Ticket List | `/mobile-client/tickets` |
| Invoices | `doc.text.fill` | Invoice List | `/mobile-client/invoices` |
| Documents | `folder.fill` | Document List | `/mobile-client/documents` |
| Profile | `person.fill` | Profile + Logout | `/mobile-auth/me` |

### 3.3 Dashboard Screen
- **Welcome header** — "Hello, {contactName}" with company logo
- **Summary cards** (2x2 grid):
  - Open Tickets (tap → ticket list)
  - Outstanding Balance (tap → invoice list)
  - Pending Signatures (tap → signature list)
  - Documents (tap → document list)
- **Pending Actions** section — list of signatures/notarizations needing attention
- **Recent Tickets** — horizontal scroll of latest 5 tickets
- **Pull-to-refresh**

### 3.4 Ticket List & Detail
- Segmented filter: All / Open / In Progress / Completed
- Each row: title, service type badge, status pill, priority indicator, due date
- Detail view: full description, timeline, due date, priority

### 3.5 Invoice List & Detail
- Segmented filter: All / Outstanding / Paid / Overdue
- Each row: invoice #, amount (bold), status pill, due date
- Detail view: line items (future), description, dates
- Overdue invoices highlighted in red

### 3.6 Document List
- Grouped by type or flat list
- Each row: document name, type icon, upload date
- Tap to view/download (future: in-app viewer)

### 3.7 Signatures & Notarizations
- Accessible from Dashboard "Pending Actions" or dedicated sub-screens
- Status tracking: pending → signed / pending → completed

### 3.8 Profile
- Read-only client info: company name, contact, email, phone, DOT#, MC#, EIN#
- Company branding display
- Support contact info (email, phone from tenant branding)
- **Logout** button → clears Keychain, returns to Company Lookup

---

## 4. API Client Design

```swift
// APIClient.swift — core networking layer
actor APIClient {
    static let shared = APIClient()

    private var baseURL: URL?
    private var token: String?

    func configure(baseURL: URL, token: String?) { ... }

    func request<T: Decodable>(
        _ method: HTTPMethod,
        path: String,
        body: Encodable? = nil
    ) async throws -> T {
        // 1. Build URLRequest with baseURL + path
        // 2. Inject "Authorization: Bearer <token>" header
        // 3. Handle response: decode { data: T } wrapper
        // 4. Map errors: 401 → AuthError.sessionExpired (trigger logout)
        // 5. Map errors: 423 → AuthError.accountLocked(minutes)
        // 6. Map errors: 429 → AuthError.rateLimited
    }
}
```

**Key behaviors:**
- All responses follow `{ data: T, meta?: ... }` or `{ error: true, message: string, code?: string }` pattern
- 401 responses auto-clear the session and navigate to login
- Network errors show a retry-able error view

---

## 5. Branding / Theming

The app dynamically themes itself from the tenant's branding (returned at login):
- `primaryColor` → navigation bar tint, buttons, accent color
- `logoUrl` → displayed on login screen and dashboard header
- `companyName` → shown in header/profile
- Falls back to CarrierDeskHQ defaults (`#1e3a5f`) if no branding

```swift
struct BrandTheme {
    let primaryColor: Color
    let logoURL: URL?
    let companyName: String

    static let `default` = BrandTheme(
        primaryColor: Color(hex: "#1e3a5f"),
        logoURL: nil,
        companyName: "CarrierDeskHQ"
    )
}
```

---

## 6. Implementation Phases

### Phase 1 — MVP (Weeks 1-3)
- [ ] Xcode project setup, folder structure, SPM dependencies (if any)
- [ ] `APIClient` + `KeychainHelper` + all model `Codable` structs
- [ ] Company Lookup → Login → auto-login flow
- [ ] Dashboard screen with summary cards + pending actions
- [ ] Ticket list + detail view
- [ ] Invoice list + detail view
- [ ] Document list view
- [ ] Profile screen with logout
- [ ] Dynamic branding/theming
- [ ] Error handling + loading states + pull-to-refresh
- [ ] Basic unit tests for APIClient and model decoding

### Phase 2 — Polish (Weeks 4-5)
- [ ] Signature list view
- [ ] Notarization list view
- [ ] Offline caching (SwiftData snapshot of last dashboard fetch)
- [ ] Haptic feedback on actions
- [ ] Skeleton loading views
- [ ] Deep linking support (e.g., open specific ticket from notification)
- [ ] App icon + launch screen with tenant branding

### Phase 3 — Notifications & Enhancements (Weeks 6+)
- [ ] Push notifications via APNs (requires backend: add APNs device token endpoint)
- [ ] In-app document viewer (PDF/image preview)
- [ ] Chat with staff (requires new mobile WebSocket or polling endpoint)
- [ ] Biometric login (Face ID / Touch ID) as alternative to re-entering password
- [ ] Widget support (iOS home screen widget showing summary counts)

---

## 7. Backend Enhancements Needed (Post-MVP)

The existing mobile API is solid for the MVP. Future phases will need:

| Feature | Backend Change |
|---------|---------------|
| Push notifications | New `POST /api/v1/mobile-auth/device-token` endpoint; APNs integration |
| In-app chat | WebSocket endpoint or `GET /api/v1/mobile-client/messages` + `POST` |
| Document download | Presigned URLs or proxy endpoint for file serving |
| Profile editing | `PATCH /api/v1/mobile-client/profile` |
| Invoice payment | Stripe integration endpoint |

---

## 8. App Store Considerations

- **Bundle ID**: `com.carrierdeskhq.client`
- **Minimum iOS**: 16.0 (covers ~95%+ of active devices)
- **Required capabilities**: Keychain Sharing, Push Notifications (Phase 3)
- **Privacy**: App only accesses network; no camera/location/contacts for MVP
- **App Store Review notes**: Client portal for existing CarrierDeskHQ SaaS users; account creation happens on the web platform

---

## 9. Testing Strategy

| Type | Tool | Scope |
|------|------|-------|
| Unit | XCTest | Model decoding, APIClient URL construction, Keychain ops |
| UI | XCUITest | Login flow, dashboard load, tab navigation |
| Snapshot | Swift Snapshot Testing | Key screens (dashboard, ticket list, invoice list) |
| Manual | TestFlight | Beta testing with real tenant data |

---

## 10. Summary

This plan leverages the **already-built mobile API** (`mobile-auth` + `mobile-client` endpoints) to ship a native iOS client app with zero backend changes for the MVP. The app is purely client-facing — trucking company operators can view their dashboard, track service tickets, review invoices, check documents, and manage their profile. The phased approach gets a functional app into TestFlight quickly while leaving room for richer features (push, chat, payments) in future iterations.
