import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.dashboard == nil {
                    ProgressView("Loading dashboard...")
                } else if let error = viewModel.error, viewModel.dashboard == nil {
                    ErrorBanner(message: error) {
                        await viewModel.loadDashboard()
                    }
                } else if let dashboard = viewModel.dashboard {
                    dashboardContent(dashboard)
                }
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if let tenant = authViewModel.tenant,
                       let logoUrl = tenant.logoUrl,
                       let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            EmptyView()
                        }
                        .frame(height: 28)
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if let tenant = authViewModel.tenant {
                        Menu {
                            Text(tenant.companyName)
                            Divider()
                            Button(role: .destructive) {
                                Task { await authViewModel.logout() }
                            } label: {
                                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            }
                        } label: {
                            Image(systemName: "person.circle")
                        }
                    }
                }
            }
            .task {
                await viewModel.loadDashboard()
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
    }

    @ViewBuilder
    private func dashboardContent(_ dashboard: DashboardResponse) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Welcome
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Welcome back,")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(dashboard.client.companyName)
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
                .padding(.horizontal)

                // Summary cards
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    SummaryCard(
                        title: "Open Tickets",
                        value: "\(dashboard.summary.openTickets)",
                        icon: "ticket",
                        color: Brand.blue
                    )
                    SummaryCard(
                        title: "Outstanding",
                        value: formatCurrency(dashboard.summary.totalOwed),
                        icon: "dollarsign.circle",
                        color: dashboard.summary.totalOwed > 0 ? .orange : .green
                    )
                    SummaryCard(
                        title: "Documents",
                        value: "\(dashboard.summary.totalDocuments)",
                        icon: "doc.fill",
                        color: Brand.navy
                    )
                }
                .padding(.horizontal)

                // Alerts row
                if dashboard.summary.overdueTickets > 0 || dashboard.summary.pendingSignatures > 0 {
                    HStack(spacing: 12) {
                        if dashboard.summary.overdueTickets > 0 {
                            alertBadge(
                                "\(dashboard.summary.overdueTickets) Overdue",
                                icon: "exclamationmark.triangle",
                                color: .red
                            )
                        }
                        if dashboard.summary.pendingSignatures > 0 {
                            alertBadge(
                                "\(dashboard.summary.pendingSignatures) To Sign",
                                icon: "signature",
                                color: .orange
                            )
                        }
                    }
                    .padding(.horizontal)
                }

                // Recent Tickets
                if !dashboard.recentTickets.isEmpty {
                    sectionHeader("Recent Tickets")
                    LazyVStack(spacing: 8) {
                        ForEach(dashboard.recentTickets) { ticket in
                            TicketRow(ticket: ticket)
                        }
                    }
                    .padding(.horizontal)
                }

                // Recent Invoices
                if !dashboard.recentInvoices.isEmpty {
                    sectionHeader("Recent Invoices")
                    LazyVStack(spacing: 8) {
                        ForEach(dashboard.recentInvoices) { invoice in
                            InvoiceRow(invoice: invoice)
                        }
                    }
                    .padding(.horizontal)
                }

                // Pending Actions
                if !dashboard.pendingActions.isEmpty {
                    sectionHeader("Pending Actions")
                    LazyVStack(spacing: 8) {
                        ForEach(dashboard.pendingActions) { action in
                            HStack {
                                Image(systemName: action.type == "signature" ? "signature" : "checkmark.seal")
                                    .foregroundStyle(.orange)
                                VStack(alignment: .leading) {
                                    Text(action.title)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    Text(action.type.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                StatusBadge(status: action.status, compact: true)
                            }
                            .padding(12)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
    }

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.headline)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 4)
    }

    private func alertBadge(_ text: String, icon: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
            Text(text)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }
}

// MARK: - Row Components

struct TicketRow: View {
    let ticket: Ticket

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(ticket.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                if let serviceType = ticket.serviceType {
                    Text(serviceType)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                StatusBadge(status: ticket.status, compact: true)
                if let priority = ticket.priority {
                    StatusBadge(status: priority, compact: true)
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct InvoiceRow: View {
    let invoice: Invoice

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(invoice.invoiceNumber ?? "Invoice")
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let desc = invoice.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                if let amount = invoice.amount {
                    Text(formatCurrency(amount))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                StatusBadge(status: invoice.status, compact: true)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
