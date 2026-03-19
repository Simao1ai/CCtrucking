import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        TabView {
            DashboardView()
                .environmentObject(authViewModel)
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }

            TicketsListView()
                .tabItem {
                    Label("Tickets", systemImage: "ticket.fill")
                }

            InvoicesListView()
                .tabItem {
                    Label("Invoices", systemImage: "doc.text.fill")
                }

            DocumentsListView()
                .tabItem {
                    Label("Documents", systemImage: "folder.fill")
                }

            SettingsView()
                .environmentObject(authViewModel)
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
        }
    }
}
