import SwiftUI

struct TicketsListView: View {
    @StateObject private var viewModel = TicketsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.tickets.isEmpty {
                    ProgressView("Loading tickets...")
                } else if let error = viewModel.error, viewModel.tickets.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.tickets.isEmpty {
                    EmptyStateView(
                        icon: "ticket",
                        title: "No Tickets",
                        message: "You don't have any service tickets yet."
                    )
                } else {
                    ticketsList
                }
            }
            .navigationTitle("Tickets")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    filterMenu
                }
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.refresh() }
        }
    }

    private var ticketsList: some View {
        List(viewModel.tickets) { ticket in
            NavigationLink {
                TicketDetailView(ticket: ticket)
            } label: {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(ticket.title)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        StatusBadge(status: ticket.status, compact: true)
                    }

                    HStack {
                        if let serviceType = ticket.serviceType {
                            Text(serviceType)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if let priority = ticket.priority {
                            StatusBadge(status: priority, compact: true)
                        }
                    }

                    if let dueDate = ticket.dueDate {
                        Text("Due: \(formatDate(dueDate))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var filterMenu: some View {
        Menu {
            ForEach(Array(zip(viewModel.statusOptions, viewModel.statusLabels)), id: \.1) { option, label in
                Button {
                    viewModel.selectedStatus = option
                    Task { await viewModel.load() }
                } label: {
                    HStack {
                        Text(label)
                        if viewModel.selectedStatus == option {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Image(systemName: "line.3.horizontal.decrease.circle")
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
