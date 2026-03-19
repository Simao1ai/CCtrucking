import SwiftUI

struct TicketsListView: View {
    @StateObject private var viewModel = TicketsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.tickets.isEmpty {
                    ProgressView("Loading services...")
                } else if let error = viewModel.error, viewModel.tickets.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else {
                    servicesContent
                }
            }
            .navigationTitle("Services")
            .task { await viewModel.load() }
            .refreshable { await viewModel.refresh() }
        }
    }

    private var servicesContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header subtitle
                HStack {
                    Text("Request new services or track existing ones")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal)

                // Status summary cards
                HStack(spacing: 10) {
                    statusCard(
                        title: "Open",
                        count: viewModel.tickets.filter { $0.status == "open" }.count,
                        subtitle: "Awaiting action",
                        color: Brand.blue
                    )
                    statusCard(
                        title: "In Progress",
                        count: viewModel.tickets.filter { $0.status == "in_progress" }.count,
                        subtitle: "Being worked on",
                        color: .orange
                    )
                    statusCard(
                        title: "Completed",
                        count: viewModel.tickets.filter { $0.status == "completed" || $0.status == "closed" }.count,
                        subtitle: "Finished",
                        color: .green
                    )
                }
                .padding(.horizontal)

                // Filter tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(zip(viewModel.statusOptions, viewModel.statusLabels)), id: \.1) { option, label in
                            let isSelected = viewModel.selectedStatus == option
                            let count = countForStatus(option)
                            Button {
                                viewModel.selectedStatus = option
                                Task { await viewModel.load() }
                            } label: {
                                Text("\(label) (\(count))")
                                    .font(.subheadline)
                                    .fontWeight(isSelected ? .semibold : .regular)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Brand.navy : Color.clear)
                                    .foregroundStyle(isSelected ? .white : .primary)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .stroke(isSelected ? Color.clear : Color(.separator), lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                // Tickets list
                if viewModel.tickets.isEmpty {
                    EmptyStateView(
                        icon: "briefcase",
                        title: "No Services",
                        message: "You don't have any service requests yet."
                    )
                    .padding(.top, 32)
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.tickets) { ticket in
                            NavigationLink {
                                TicketDetailView(ticket: ticket)
                            } label: {
                                serviceRow(ticket)
                            }
                            .buttonStyle(.plain)
                            if ticket.id != viewModel.tickets.last?.id {
                                Divider().padding(.leading, 56)
                            }
                        }
                    }
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
    }

    private func statusCard(title: String, count: Int, subtitle: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption2)
                .foregroundStyle(.secondary)
                .fontWeight(.medium)
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 3)
                .padding(.leading, 0)
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func serviceRow(_ ticket: Ticket) -> some View {
        HStack(alignment: .top) {
            Image(systemName: ticket.status == "in_progress" ? "arrow.triangle.2.circlepath" : "circle")
                .foregroundStyle(ticket.status == "in_progress" ? .orange : Brand.blue)
                .frame(width: 28)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 4) {
                Text(ticket.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let serviceType = ticket.serviceType {
                    Text(serviceType)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let desc = ticket.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                StatusBadge(status: ticket.status, compact: true)
                if let dueDate = ticket.dueDate {
                    Text("Due \(formatDate(dueDate))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text("Opened \(formatDate(ticket.createdAt))")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func countForStatus(_ status: String?) -> Int {
        guard let status else { return viewModel.tickets.count }
        return viewModel.tickets.filter { $0.status == status }.count
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return dateString }
            return date.formatted(.dateTime.month(.abbreviated).day().year())
        }
        return date.formatted(.dateTime.month(.abbreviated).day().year())
    }
}
