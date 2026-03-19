import SwiftUI

struct NotarizationsListView: View {
    @StateObject private var viewModel = NotarizationsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.notarizations.isEmpty {
                    ProgressView("Loading notarizations...")
                } else if let error = viewModel.error, viewModel.notarizations.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.notarizations.isEmpty {
                    EmptyStateView(
                        icon: "checkmark.seal",
                        title: "No Notarizations",
                        message: "You don't have any notarization requests."
                    )
                } else {
                    notarizationsList
                }
            }
            .navigationTitle("Notarizations")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var notarizationsList: some View {
        List(viewModel.notarizations) { notarization in
            HStack {
                Image(systemName: statusIcon(notarization.status))
                    .font(.title3)
                    .foregroundStyle(statusColor(notarization.status))
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text(notarization.documentName)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let type = notarization.notarizationType {
                        Text(type)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let scheduled = notarization.scheduledDate {
                        Text("Scheduled: \(formatDate(scheduled))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    if let completed = notarization.completedDate {
                        Text("Completed: \(formatDate(completed))")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }

                Spacer()
                StatusBadge(status: notarization.status, compact: true)
            }
            .padding(.vertical, 4)
        }
    }

    private func statusIcon(_ status: String) -> String {
        switch status.lowercased() {
        case "completed": return "checkmark.seal.fill"
        case "scheduled": return "calendar"
        default: return "clock"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "completed": return .green
        case "scheduled": return .blue
        default: return .orange
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return dateString }
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}
