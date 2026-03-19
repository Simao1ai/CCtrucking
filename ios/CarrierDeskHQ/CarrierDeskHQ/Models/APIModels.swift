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

// MARK: - Flexible Decoding Helpers

/// Decodes a Double that might arrive as a String, Number, or null from the backend
private func decodeFlexibleDouble<K: CodingKey>(from container: KeyedDecodingContainer<K>, forKey key: K) -> Double? {
    if let doubleVal = try? container.decodeIfPresent(Double.self, forKey: key) {
        return doubleVal
    } else if let intVal = try? container.decodeIfPresent(Int.self, forKey: key) {
        return Double(intVal)
    } else if let stringVal = try? container.decodeIfPresent(String.self, forKey: key) {
        return Double(stringVal)
    }
    return nil
}

/// Decodes a required Double that might arrive as a String or Number
private func decodeFlexibleDoubleRequired<K: CodingKey>(from container: KeyedDecodingContainer<K>, forKey key: K) throws -> Double {
    if let doubleVal = try? container.decode(Double.self, forKey: key) {
        return doubleVal
    } else if let intVal = try? container.decode(Int.self, forKey: key) {
        return Double(intVal)
    } else if let stringVal = try? container.decode(String.self, forKey: key) {
        if let d = Double(stringVal) { return d }
    }
    return 0
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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        openTickets = (try? container.decode(Int.self, forKey: .openTickets)) ?? 0
        overdueTickets = (try? container.decode(Int.self, forKey: .overdueTickets)) ?? 0
        totalDocuments = (try? container.decode(Int.self, forKey: .totalDocuments)) ?? 0
        outstandingInvoices = (try? container.decode(Int.self, forKey: .outstandingInvoices)) ?? 0
        pendingSignatures = (try? container.decode(Int.self, forKey: .pendingSignatures)) ?? 0
        pendingNotarizations = (try? container.decode(Int.self, forKey: .pendingNotarizations)) ?? 0
        totalOwed = decodeFlexibleDouble(from: container, forKey: .totalOwed) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case openTickets, overdueTickets, totalDocuments, totalOwed
        case outstandingInvoices, pendingSignatures, pendingNotarizations
    }
}

struct PendingAction: Decodable, Identifiable {
    let type: String
    let id: String
    let title: String
    let status: String?
    let createdAt: String?
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
    let createdAt: String?
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
    let createdAt: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        invoiceNumber = try container.decodeIfPresent(String.self, forKey: .invoiceNumber)
        status = try container.decode(String.self, forKey: .status)
        dueDate = try container.decodeIfPresent(String.self, forKey: .dueDate)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        amount = decodeFlexibleDouble(from: container, forKey: .amount)
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
    let documentName: String?
    let status: String
    let signedAt: String?
    let createdAt: String?
}

// MARK: - Notarization

struct Notarization: Decodable, Identifiable {
    let id: String
    let documentName: String?
    let status: String
    let notarizationType: String?
    let scheduledDate: String?
    let completedDate: String?
    let createdAt: String?
}

// MARK: - Bookkeeping

struct BookkeepingSubscription: Decodable {
    let id: String
    let plan: String
    let price: Double
    let status: String
    let startDate: String?
    let endDate: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        plan = try container.decode(String.self, forKey: .plan)
        status = try container.decode(String.self, forKey: .status)
        startDate = try container.decodeIfPresent(String.self, forKey: .startDate)
        endDate = try container.decodeIfPresent(String.self, forKey: .endDate)
        price = decodeFlexibleDouble(from: container, forKey: .price) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case id, plan, price, status, startDate, endDate
    }
}

struct BankTransaction: Decodable, Identifiable {
    let id: String
    let transactionDate: String?
    let description: String?
    let amount: Double
    let category: String?
    let reviewed: Bool
    let bankName: String?
    let accountLast4: String?
    let statementMonth: Int
    let statementYear: Int
    let createdAt: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        transactionDate = try container.decodeIfPresent(String.self, forKey: .transactionDate)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        reviewed = (try? container.decode(Bool.self, forKey: .reviewed)) ?? false
        bankName = try container.decodeIfPresent(String.self, forKey: .bankName)
        accountLast4 = try container.decodeIfPresent(String.self, forKey: .accountLast4)
        statementMonth = (try? container.decode(Int.self, forKey: .statementMonth)) ?? 0
        statementYear = (try? container.decode(Int.self, forKey: .statementYear)) ?? 0
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        amount = decodeFlexibleDouble(from: container, forKey: .amount) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case id, transactionDate, description, amount, category, reviewed
        case bankName, accountLast4, statementMonth, statementYear, createdAt
    }
}

struct MonthlySummary: Decodable, Identifiable {
    let id: String
    let month: Int
    let year: Int
    let totalIncome: Double
    let totalExpenses: Double
    let netIncome: Double
    let generatedAt: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        month = (try? container.decode(Int.self, forKey: .month)) ?? 0
        year = (try? container.decode(Int.self, forKey: .year)) ?? 0
        generatedAt = try container.decodeIfPresent(String.self, forKey: .generatedAt)
        totalIncome = decodeFlexibleDouble(from: container, forKey: .totalIncome) ?? 0
        totalExpenses = decodeFlexibleDouble(from: container, forKey: .totalExpenses) ?? 0
        netIncome = decodeFlexibleDouble(from: container, forKey: .netIncome) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case id, month, year, totalIncome, totalExpenses, netIncome, generatedAt
    }
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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        taxYear = (try? container.decode(Int.self, forKey: .taxYear)) ?? 0
        documentType = (try? container.decode(String.self, forKey: .documentType)) ?? ""
        payerName = try container.decodeIfPresent(String.self, forKey: .payerName)
        fileName = try container.decodeIfPresent(String.self, forKey: .fileName)
        fileType = try container.decodeIfPresent(String.self, forKey: .fileType)
        status = (try? container.decode(String.self, forKey: .status)) ?? "pending"
        confidenceLevel = try container.decodeIfPresent(String.self, forKey: .confidenceLevel)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        rejectionFeedback = try container.decodeIfPresent(String.self, forKey: .rejectionFeedback)
        approvedAt = try container.decodeIfPresent(String.self, forKey: .approvedAt)
        analyzedAt = try container.decodeIfPresent(String.self, forKey: .analyzedAt)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        totalIncome = decodeFlexibleDouble(from: container, forKey: .totalIncome)
        federalWithholding = decodeFlexibleDouble(from: container, forKey: .federalWithholding)
        stateWithholding = decodeFlexibleDouble(from: container, forKey: .stateWithholding)
    }

    private enum CodingKeys: String, CodingKey {
        case id, taxYear, documentType, payerName, fileName, fileType
        case totalIncome, federalWithholding, stateWithholding
        case status, confidenceLevel, notes, rejectionFeedback
        case approvedAt, analyzedAt, createdAt
    }
}

// MARK: - Chat

struct ChatMessage: Decodable, Identifiable {
    let id: String
    let senderId: String?
    let senderName: String?
    let senderRole: String?
    let message: String
    let createdAt: String?
}

struct SendMessageRequest: Encodable {
    let message: String
}

// MARK: - Forms

struct FilledForm: Decodable, Identifiable {
    let id: String
    let templateId: String?
    let name: String?
    let status: String?
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
