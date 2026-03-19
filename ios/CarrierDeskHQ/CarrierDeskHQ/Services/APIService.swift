import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case forbidden(String)
    case notFound
    case locked(String)
    case serverError(String)
    case decodingError(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized:
            return "Invalid credentials. Please try again."
        case .forbidden(let msg):
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

    private let baseURL = "https://carrierdeskhq.com/api/v1/mobile"
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
                throw APIError.decodingError(error.localizedDescription)
            }

        case 401:
            KeychainService.deleteToken()
            throw APIError.unauthorized

        case 403:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.forbidden(apiErr?.message ?? "Access denied")

        case 404:
            throw APIError.notFound

        case 423:
            let apiErr = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.locked(apiErr?.message ?? "Account locked. Try again later.")

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
