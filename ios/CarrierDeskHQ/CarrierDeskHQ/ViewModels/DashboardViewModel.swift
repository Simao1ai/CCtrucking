import SwiftUI

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var dashboard: DashboardResponse?
    @Published var isLoading = false
    @Published var error: String?

    func loadDashboard() async {
        isLoading = true
        error = nil

        do {
            dashboard = try await APIService.shared.getDashboard()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        do {
            dashboard = try await APIService.shared.getDashboard()
        } catch {
            // Silent refresh failure
        }
    }
}
