import SwiftUI

@main
struct CarrierDeskHQApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if authViewModel.isAuthenticated {
                    MainTabView()
                        .environmentObject(authViewModel)
                } else {
                    CompanyLookupView()
                        .environmentObject(authViewModel)
                }
            }
            .animation(.easeInOut, value: authViewModel.isAuthenticated)
        }
    }
}
