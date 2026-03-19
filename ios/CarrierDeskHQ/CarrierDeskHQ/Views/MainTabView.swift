import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var notificationsViewModel = NotificationsViewModel()

    var body: some View {
        TabView {
            DashboardView()
                .environmentObject(authViewModel)
                .environmentObject(notificationsViewModel)
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }

            TicketsListView()
                .tabItem {
                    Label("Services", systemImage: "briefcase.fill")
                }

            InvoicesListView()
                .tabItem {
                    Label("Invoices", systemImage: "doc.text.fill")
                }

            ChatView()
                .tabItem {
                    Label("Messages", systemImage: "bubble.left.and.bubble.right.fill")
                }

            MoreView()
                .environmentObject(authViewModel)
                .environmentObject(notificationsViewModel)
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
        }
        .task {
            await notificationsViewModel.loadUnreadCount()
        }
    }
}
