import Foundation
import Security

enum KeychainService {
    private static let tokenKey = "com.carrierdeskhq.authToken"
    private static let tenantKey = "com.carrierdeskhq.tenantData"
    private static let slugKey = "com.carrierdeskhq.slug"

    // MARK: - Auth Token

    static func saveToken(_ token: String) {
        save(key: tokenKey, data: token.data(using: .utf8)!)
    }

    static func getToken() -> String? {
        guard let data = load(key: tokenKey) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func deleteToken() {
        delete(key: tokenKey)
    }

    // MARK: - Slug

    static func saveSlug(_ slug: String) {
        save(key: slugKey, data: slug.data(using: .utf8)!)
    }

    static func getSlug() -> String? {
        guard let data = load(key: slugKey) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func deleteSlug() {
        delete(key: slugKey)
    }

    // MARK: - Tenant Branding

    static func saveTenant(_ tenant: TenantBranding) {
        if let data = try? JSONEncoder().encode(tenant) {
            save(key: tenantKey, data: data)
        }
    }

    static func getTenant() -> TenantBranding? {
        guard let data = load(key: tenantKey) else { return nil }
        return try? JSONDecoder().decode(TenantBranding.self, from: data)
    }

    static func deleteTenant() {
        delete(key: tenantKey)
    }

    // MARK: - Clear All

    static func clearAll() {
        deleteToken()
        deleteSlug()
        deleteTenant()
    }

    // MARK: - Keychain Operations

    private static func save(key: String, data: Data) {
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    private static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    private static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
