import SwiftUI

struct TicketDetailView: View {
    let ticket: Ticket

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(ticket.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    HStack(spacing: 8) {
                        StatusBadge(status: ticket.status)
                        if let priority = ticket.priority {
                            StatusBadge(status: priority)
                        }
                    }
                }

                Divider()

                // Details
                if let serviceType = ticket.serviceType {
                    detailRow("Service Type", value: serviceType)
                }

                if let description = ticket.description, !description.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Description")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(description)
                            .font(.body)
                    }
                }

                if let dueDate = ticket.dueDate {
                    detailRow("Due Date", value: formatDate(dueDate))
                }

                if let createdAt = ticket.createdAt {
                    detailRow("Created", value: formatDate(createdAt))
                }

                if let updatedAt = ticket.updatedAt {
                    detailRow("Last Updated", value: formatDate(updatedAt))
                }
            }
            .padding()
        }
        .navigationTitle("Ticket Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func detailRow(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.body)
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return dateString }
            return date.formatted(date: .abbreviated, time: .shortened)
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
