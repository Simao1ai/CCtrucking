import SwiftUI

struct StatusBadge: View {
    let status: String
    var compact: Bool = false

    var color: Color {
        switch status.lowercased() {
        case "open", "sent", "pending", "scheduled":
            return .blue
        case "in_progress", "in-progress":
            return .orange
        case "completed", "paid", "signed":
            return .green
        case "closed", "cancelled":
            return .gray
        case "overdue", "critical":
            return .red
        case "high":
            return .orange
        case "medium":
            return .yellow
        case "low":
            return .green
        default:
            return .secondary
        }
    }

    var displayText: String {
        status
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .capitalized
    }

    var body: some View {
        Text(displayText)
            .font(compact ? .caption2 : .caption)
            .fontWeight(.medium)
            .padding(.horizontal, compact ? 6 : 8)
            .padding(.vertical, compact ? 2 : 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    var color: Color = .blue

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
}

struct ErrorBanner: View {
    let message: String
    var retry: (() async -> Void)?

    var body: some View {
        VStack(spacing: 8) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)

            if let retry {
                Button("Try Again") {
                    Task { await retry() }
                }
                .font(.subheadline)
                .buttonStyle(.bordered)
            }
        }
        .padding()
    }
}
