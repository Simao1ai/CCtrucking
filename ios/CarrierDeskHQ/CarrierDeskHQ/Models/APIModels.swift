import Foundation

// MARK: - Generic API Response Wrappers

struct APIResponse<T: Decodable>: Decodable {
    let data: T
}

struct APIListResponse<T: Decodable>: Decodable {
    let data: [T]
    let meta: ListMeta?
}

struct ListMeta: Decodable {
    let total: Int?
    let generatedAt: String?
}

// MARK: - Auth Models

struct LookupRequest: Encodable {
    let slug: String
}

struct LoginRequest: Encodable {
    let slug: String
    let username: String
    let password: String
}

struct LoginResponse: Decodable {
    let token: String
    let expiresAt: String
    let client: ClientProfile
    let tenant: TenantBranding
}

struct TenantBranding: Decodable, Equatable {
    let tenantId: String?
    let companyName: String
    let slug: String?
    let logoUrl: String?
    let primaryColor: String?
    let tagline: String?
    let supportEmail: String?
    let supportPhone: String?
}

// MARK: - Client Profile

struct ClientProfile: Decodable, Identifiable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let status: String?
    let dotNumber: String?
    let mcNumber: String?
    let einNumber: String?
}

// MARK: - Dashboard

struct DashboardResponse: Decodable {
    let client: ClientProfile
    let summary: DashboardSummary
    let recentTickets: [Ticket]
    let recentInvoices: [Invoice]
    let pendingActions: [PendingAction]
}

struct DashboardMeta: Decodable {
    let generatedAt: String?
}

struct DashboardSummary: Decodable {
    let openTickets: Int
    let overdueTickets: Int
    let totalDocuments: Int
    let totalOwed: Double
    let outstandingInvoices: Int
    let pendingSignatures: Int
    let pendingNotarizations: Int
}

struct PendingAction: Decodable, Identifiable {
    let type: String
    let id: String
    let title: String
    let status: String
    let createdAt: String
}

// MARK: - Ticket

struct Ticket: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let serviceType: String?
    let status: String
    let priority: String?
    let dueDate: String?
    let createdAt: String
    let updatedAt: String?
}

// MARK: - Invoice

struct Invoice: Decodable, Identifiable {
    let id: String
    let invoiceNumber: String?
    let amount: Double?
    let status: String
    let dueDate: String?
    let description: String?
    let createdAt: String
}

// MARK: - Document

struct Document: Decodable, Identifiable {
    let id: String
    let name: String
    let type: String?
    let fileUrl: String?
    let createdAt: String
}

// MARK: - Signature

struct SignatureRequest: Decodable, Identifiable {
    let id: String
    let documentName: String
    let status: String
    let signedAt: String?
    let createdAt: String
}

// MARK: - Notarization

struct Notarization: Decodable, Identifiable {
    let id: String
    let documentName: String
    let status: String
    let notarizationType: String?
    let scheduledDate: String?
    let completedDate: String?
    let createdAt: String
}

// MARK: - API Error Response (for decoding server errors)

struct APIErrorBody: Decodable {
    let message: String?
    let code: String?
    let error: String?
}
