import SwiftUI

@MainActor
class NotificationsViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var unreadCount: Int = 0
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            async let notifs = APIService.shared.getNotifications()
            async let count = APIService.shared.getUnreadNotificationCount()
            notifications = try await notifs
            unreadCount = try await count
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadUnreadCount() async {
        do {
            unreadCount = try await APIService.shared.getUnreadNotificationCount()
        } catch {}
    }

    func markRead(_ id: String) async {
        do {
            try await APIService.shared.markNotificationRead(id: id)
            if let idx = notifications.firstIndex(where: { $0.id == id }) {
                let n = notifications[idx]
                notifications[idx] = AppNotification(
                    id: n.id, title: n.title, message: n.message,
                    type: n.type, link: n.link, read: true, createdAt: n.createdAt
                )
            }
            unreadCount = max(0, unreadCount - 1)
        } catch {}
    }

    func markAllRead() async {
        do {
            try await APIService.shared.markAllNotificationsRead()
            notifications = notifications.map {
                AppNotification(
                    id: $0.id, title: $0.title, message: $0.message,
                    type: $0.type, link: $0.link, read: true, createdAt: $0.createdAt
                )
            }
            unreadCount = 0
        } catch {}
    }
}

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    ProgressView("Loading notifications...")
                } else if let error = viewModel.error, viewModel.notifications.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.notifications.isEmpty {
                    EmptyStateView(
                        icon: "bell.slash",
                        title: "No Notifications",
                        message: "You're all caught up!"
                    )
                } else {
                    notificationsList
                }
            }
            .navigationTitle("Notifications")
            .toolbar {
                if viewModel.unreadCount > 0 {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Mark All Read") {
                            Task { await viewModel.markAllRead() }
                        }
                        .font(.caption)
                    }
                }
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var notificationsList: some View {
        List(viewModel.notifications) { notif in
            Button {
                if !notif.read {
                    Task { await viewModel.markRead(notif.id) }
                }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: iconForType(notif.type))
                        .foregroundStyle(colorForType(notif.type))
                        .frame(width: 24)
                        .padding(.top, 2)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(notif.title)
                            .font(.subheadline)
                            .fontWeight(notif.read ? .regular : .semibold)
                            .foregroundStyle(.primary)
                        Text(notif.message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                        if let createdAt = notif.createdAt {
                            Text(formatTime(createdAt))
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }

                    Spacer()

                    if !notif.read {
                        Circle()
                            .fill(Brand.blue)
                            .frame(width: 8, height: 8)
                            .padding(.top, 6)
                    }
                }
                .padding(.vertical, 4)
            }
            .listRowBackground(notif.read ? Color.clear : Brand.blue.opacity(0.04))
        }
    }

    private func iconForType(_ type: String) -> String {
        switch type {
        case "chat", "message": return "bubble.left.fill"
        case "warning": return "exclamationmark.triangle.fill"
        case "invoice": return "dollarsign.circle.fill"
        case "document": return "doc.fill"
        case "signature": return "signature"
        default: return "bell.fill"
        }
    }

    private func colorForType(_ type: String) -> Color {
        switch type {
        case "chat", "message": return Brand.blue
        case "warning": return .orange
        case "invoice": return .green
        case "document": return Brand.navy
        case "signature": return .purple
        default: return .secondary
        }
    }

    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return "" }
            return date.formatted(.relative(presentation: .named))
        }
        return date.formatted(.relative(presentation: .named))
    }
}
