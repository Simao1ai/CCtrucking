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

struct TenantBranding: Codable, Equatable {
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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        invoiceNumber = try container.decodeIfPresent(String.self, forKey: .invoiceNumber)
        status = try container.decode(String.self, forKey: .status)
        dueDate = try container.decodeIfPresent(String.self, forKey: .dueDate)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        createdAt = try container.decode(String.self, forKey: .createdAt)

        // Backend sends decimal as string (e.g. "100.00"), handle both String and Number
        if let doubleVal = try? container.decodeIfPresent(Double.self, forKey: .amount) {
            amount = doubleVal
        } else if let stringVal = try? container.decodeIfPresent(String.self, forKey: .amount) {
            amount = Double(stringVal)
        } else {
            amount = nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case id, invoiceNumber, amount, status, dueDate, description, createdAt
    }
}

// MARK: - Document

struct Document: Decodable, Identifiable {
    let id: String
    let name: String
    let type: String?
    let status: String?
    let createdAt: String?
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

// MARK: - Bookkeeping

struct BookkeepingSubscription: Decodable {
    let id: String
    let plan: String
    let price: Double
    let status: String
    let startDate: String?
    let endDate: String?
}

struct BankTransaction: Decodable, Identifiable {
    let id: String
    let transactionDate: String
    let description: String
    let amount: Double
    let category: String
    let reviewed: Bool
    let bankName: String?
    let accountLast4: String?
    let statementMonth: Int
    let statementYear: Int
    let createdAt: String?
}

struct MonthlySummary: Decodable, Identifiable {
    let id: String
    let month: Int
    let year: Int
    let totalIncome: Double
    let totalExpenses: Double
    let netIncome: Double
    let generatedAt: String?
}

// MARK: - Tax Documents

struct TaxDocument: Decodable, Identifiable {
    let id: String
    let taxYear: Int
    let documentType: String
    let payerName: String?
    let fileName: String?
    let fileType: String?
    let totalIncome: Double?
    let federalWithholding: Double?
    let stateWithholding: Double?
    let status: String
    let confidenceLevel: String?
    let notes: String?
    let rejectionFeedback: String?
    let approvedAt: String?
    let analyzedAt: String?
    let createdAt: String?
}

// MARK: - Chat

struct ChatMessage: Decodable, Identifiable {
    let id: String
    let senderId: String
    let senderName: String
    let senderRole: String
    let message: String
    let createdAt: String
}

struct SendMessageRequest: Encodable {
    let message: String
}

// MARK: - Forms

struct FilledForm: Decodable, Identifiable {
    let id: String
    let templateId: String?
    let name: String
    let status: String
    let signatureRequestId: String?
    let createdAt: String?
    let updatedAt: String?
}

// MARK: - API Error Response (for decoding server errors)

struct APIErrorBody: Decodable {
    let message: String?
    let code: String?
    let error: String?
}
