import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?

    @Published var slug: String = ""
    @Published var tenant: TenantBranding?
    @Published var client: ClientProfile?

    init() {
        // Check for existing session
        if KeychainService.getToken() != nil {
            self.isAuthenticated = true
            self.slug = KeychainService.getSlug() ?? ""
            self.tenant = KeychainService.getTenant()
        }
    }

    // MARK: - Company Lookup

    func lookupCompany() async {
        guard !slug.isEmpty else {
            error = "Please enter your company code."
            return
        }

        isLoading = true
        error = nil

        do {
            let branding = try await APIService.shared.lookup(slug: slug)
            tenant = branding
            KeychainService.saveSlug(slug)
            KeychainService.saveTenant(branding)
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Login

    func login(username: String, password: String) async {
        guard !username.isEmpty, !password.isEmpty else {
            error = "Please enter your username and password."
            return
        }

        isLoading = true
        error = nil

        do {
            let response = try await APIService.shared.login(
                slug: slug,
                username: username,
                password: password
            )
            client = response.client
            tenant = response.tenant
            KeychainService.saveTenant(response.tenant)
            isAuthenticated = true
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Logout

    func logout() async {
        try? await APIService.shared.logout()
        KeychainService.clearAll()
        isAuthenticated = false
        client = nil
        tenant = nil
        slug = ""
    }

    func clearError() {
        error = nil
    }

    func resetToLookup() {
        tenant = nil
        KeychainService.deleteTenant()
    }
}
