import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized(String)
    case forbidden(String)
    case rateLimited(String)
    case notFound
    case locked(String)
    case serverError(String)
    case decodingError(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized(let msg):
            return msg
        case .forbidden(let msg):
            return msg
        case .rateLimited(let msg):
            return msg
        case .notFound:
            return "Resource not found."
        case .locked(let msg):
            return msg
        case .serverError(let msg):
            return msg
        case .decodingError(let msg):
            return "Failed to parse response: \(msg)"
        case .networkError(let msg):
            return msg
        }
    }
}

actor APIService {
    static let shared = APIService()

    private let baseURL = "https://5bc1639c-cdfb-4dc2-bdfb-64e5c5f8792e-00-3lwilqk7gnhaf.worf.replit.dev/api/v1/mobile"
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
    }

    // MARK: - Token Management

    private var authToken: String? {
        get { KeychainService.getToken() }
    }

    // MARK: - Auth Endpoints

    func lookup(slug: String) async throws -> TenantBranding {
        let body = LookupRequest(slug: slug.lowercased().trimmingCharacters(in: .whitespaces))
        let response: APIResponse<TenantBranding> = try await post("/auth/lookup", body: body, authenticated: false)
        return response.data
    }

    func login(slug: String, username: String, password: String) async throws -> LoginResponse {
        let body = LoginRequest(
            slug: slug.lowercased().trimmingCharacters(in: .whitespaces),
            username: username,
            password: password
        )
        let response: APIResponse<LoginResponse> = try await post("/auth/login", body: body, authenticated: false)

        // Store token
        KeychainService.saveToken(response.data.token)

        return response.data
    }

    func logout() async throws {
        let _: APIResponse<[String: String]>? = try? await post("/auth/logout", body: EmptyBody(), authenticated: true)
        KeychainService.deleteToken()
    }

    func getCurrentUser() async throws -> ClientProfile {
        let response: APIResponse<ClientProfile> = try await get("/auth/me")
        return response.data
    }

    // MARK: - Client Endpoints

    func getDashboard() async throws -> DashboardResponse {
        let response: APIResponse<DashboardResponse> = try await get("/client/dashboard")
        return response.data
    }

    func getTickets(status: String? = nil) async throws -> [Ticket] {
        var params: [String: String] = [:]
        if let status { params["status"] = status }
        let response: APIListResponse<Ticket> = try await get("/client/tickets", queryParams: params)
        return response.data
    }

    func getInvoices(status: String? = nil) async throws -> [Invoice] {
        var params: [String: String] = [:]
        if let status { params["status"] = status }
        let response: APIListResponse<Invoice> = try await get("/client/invoices", queryParams: params)
        return response.data
    }

    func getDocuments() async throws -> [Document] {
        let response: APIListResponse<Document> = try await get("/client/documents")
        return response.data
    }

    func getSignatures() async throws -> [SignatureRequest] {
        let response: APIListResponse<SignatureRequest> = try await get("/client/signatures")
        return response.data
    }

    func getNotarizations() async throws -> [Notarization] {
        let response: APIListResponse<Notarization> = try await get("/client/notarizations")
        return response.data
    }

    // MARK: - Bookkeeping Endpoints

    func getBookkeepingSubscription() async throws -> BookkeepingSubscription? {
        let response: APIResponse<BookkeepingSubscription?> = try await get("/bookkeeping/subscription")
        return response.data
    }

    func getTransactions(month: Int? = nil, year: Int? = nil) async throws -> [BankTransaction] {
        var params: [String: String] = [:]
        if let month { params["month"] = "\(month)" }
        if let year { params["year"] = "\(year)" }
        let response: APIListResponse<BankTransaction> = try await get("/bookkeeping/transactions", queryParams: params)
        return response.data
    }

    func getMonthlySummaries() async throws -> [MonthlySummary] {
        let response: APIListResponse<MonthlySummary> = try await get("/bookkeeping/summaries")
        return response.data
    }

    // MARK: - Tax Document Endpoints

    func getTaxDocuments(year: Int? = nil) async throws -> [TaxDocument] {
        var params: [String: String] = [:]
        if let year { params["year"] = "\(year)" }
        let response: APIListResponse<TaxDocument> = try await get("/tax/documents", queryParams: params)
        return response.data
    }

    func approveTaxDocument(id: String) async throws {
        let _: APIResponse<[String: String]> = try await post("/tax/documents/\(id)/approve", body: EmptyBody())
    }

    func rejectTaxDocument(id: String, feedback: String) async throws {
        struct RejectBody: Encodable { let feedback: String }
        let _: APIResponse<[String: String]> = try await post("/tax/documents/\(id)/reject", body: RejectBody(feedback: feedback))
    }

    // MARK: - Chat Endpoints

    func getChatMessages() async throws -> [ChatMessage] {
        let response: APIListResponse<ChatMessage> = try await get("/chat")
        return response.data
    }

    func sendChatMessage(_ message: String) async throws -> ChatMessage {
        let response: APIResponse<ChatMessage> = try await post("/chat", body: SendMessageRequest(message: message))
        return response.data
    }

    // MARK: - Forms Endpoints

    func getForms() async throws -> [FilledForm] {
        let response: APIListResponse<FilledForm> = try await get("/forms")
        return response.data
    }

    // MARK: - HTTP Methods

    private func get<T: Decodable>(_ path: String, queryParams: [String: String] = [:]) async throws -> T {
        var urlString = "\(baseURL)\(path)"

        if !queryParams.isEmpty {
            let query = queryParams.map { "\($0.key)=\($0.value)" }.joined(separator: "&")
            urlString += "?\(query)"
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return try await execute(request)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B, authenticated: Bool = true) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(body)

        if authenticated, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return try await execute(request)
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError("Network error: \(error.localizedDescription)")
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError("Invalid response")
        }

        switch httpResponse.statusCode {
        case 200...299:
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                #if DEBUG
                if let jsonString = String(data: data, encoding: .utf8) {
                    print("⚠️ Decode error for \(T.self): \(error)")
                    print("⚠️ Raw JSON: \(jsonString.prefix(2000))")
                }
                #endif
                throw APIError.decodingError(error.localizedDescription)
            }

        case 401:
            KeychainService.deleteToken()
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.unauthorized(apiErr?.message ?? "Invalid credentials. Please try again.")

        case 403:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.forbidden(apiErr?.message ?? "Access denied")

        case 404:
            throw APIError.notFound

        case 423:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.locked(apiErr?.message ?? "Account locked. Try again later.")

        case 429:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.rateLimited(apiErr?.message ?? "Too many attempts. Please try again later.")

        default:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.serverError(apiErr?.message ?? "Server error (\(httpResponse.statusCode))")
        }
    }
}

// MARK: - Helper Types

private struct EmptyBody: Encodable {}

private struct APIErrorResponse: Decodable {
    let message: String?
    let error: String?
}
