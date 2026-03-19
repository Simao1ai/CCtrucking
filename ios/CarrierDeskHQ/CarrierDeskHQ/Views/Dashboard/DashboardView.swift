import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var notificationsViewModel: NotificationsViewModel
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showNotifications = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground).ignoresSafeArea()

                if viewModel.isLoading && viewModel.dashboard == nil {
                    ProgressView("Loading dashboard...")
                } else if let error = viewModel.error, viewModel.dashboard == nil {
                    ErrorBanner(message: error) {
                        await viewModel.loadDashboard()
                    }
                } else if let dashboard = viewModel.dashboard {
                    dashboardContent(dashboard)
                } else {
                    ErrorBanner(message: "Unable to load dashboard.") {
                        await viewModel.loadDashboard()
                    }
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
                    HStack(spacing: 16) {
                        Button {
                            showNotifications = true
                        } label: {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: "bell")
                                if notificationsViewModel.unreadCount > 0 {
                                    Text("\(min(notificationsViewModel.unreadCount, 99))")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .padding(3)
                                        .background(Color.red)
                                        .clipShape(Circle())
                                        .offset(x: 6, y: -6)
                                }
                            }
                        }

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
            }
            .task {
                await viewModel.loadDashboard()
                await notificationsViewModel.loadUnreadCount()
            }
            .refreshable {
                await viewModel.refresh()
                await notificationsViewModel.loadUnreadCount()
            }
            .sheet(isPresented: $showNotifications) {
                NotificationsView()
            }
        }
    }

    @ViewBuilder
    private func dashboardContent(_ dashboard: DashboardResponse) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                // Welcome header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(greeting + ",")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(dashboard.client.contactName ?? dashboard.client.companyName)
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(dashboard.client.companyName)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.horizontal)

                // Action Needed banner
                actionNeededSection(dashboard)

                // Summary cards (2x2 grid)
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                ], spacing: 10) {
                    SummaryCard(
                        title: "Active Services",
                        value: "\(dashboard.summary.openTickets)",
                        subtitle: "\(dashboard.recentTickets.filter { $0.status == "completed" }.count) completed",
                        icon: "briefcase.fill",
                        accentColor: Brand.blue
                    )
                    SummaryCard(
                        title: "Amount Due",
                        value: formatCurrency(dashboard.summary.totalOwed),
                        subtitle: "\(dashboard.summary.outstandingInvoices) outstanding",
                        icon: "dollarsign.circle.fill",
                        accentColor: dashboard.summary.totalOwed > 0 ? .red : .green
                    )
                    SummaryCard(
                        title: "Total Paid",
                        value: "$0",
                        subtitle: "All time",
                        icon: "checkmark.circle.fill",
                        accentColor: .green
                    )
                    SummaryCard(
                        title: "Documents",
                        value: "\(dashboard.summary.totalDocuments)",
                        subtitle: "\(dashboard.summary.pendingSignatures) pending",
                        icon: "doc.fill",
                        accentColor: Brand.navy
                    )
                }
                .padding(.horizontal)

                // Services section
                if !dashboard.recentTickets.isEmpty {
                    sectionHeader("Services", linkText: "All services")
                    LazyVStack(spacing: 0) {
                        ForEach(dashboard.recentTickets) { ticket in
                            TicketRow(ticket: ticket)
                            if ticket.id != dashboard.recentTickets.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }

                // Invoices section
                if !dashboard.recentInvoices.isEmpty {
                    sectionHeader("Invoices", linkText: "All invoices")
                    LazyVStack(spacing: 0) {
                        ForEach(dashboard.recentInvoices) { invoice in
                            InvoiceRow(invoice: invoice)
                            if invoice.id != dashboard.recentInvoices.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }

                // Pending Actions
                if !dashboard.pendingActions.isEmpty {
                    sectionHeader("Pending Actions", linkText: nil)
                    LazyVStack(spacing: 0) {
                        ForEach(dashboard.pendingActions) { action in
                            HStack {
                                Image(systemName: action.type == "signature" ? "signature" : "checkmark.seal")
                                    .foregroundStyle(.orange)
                                    .frame(width: 24)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(action.title)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    Text(action.type.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                StatusBadge(status: action.status ?? "pending", compact: true)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            if action.id != dashboard.pendingActions.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }

                // Account section
                accountSection(dashboard.client)
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Action Needed

    @ViewBuilder
    private func actionNeededSection(_ dashboard: DashboardResponse) -> some View {
        let overdueInvoices = dashboard.recentInvoices.filter { $0.status == "overdue" }
        let sentInvoices = dashboard.recentInvoices.filter { $0.status == "sent" }
        let hasActions = !overdueInvoices.isEmpty || !sentInvoices.isEmpty ||
                         dashboard.summary.pendingSignatures > 0

        if hasActions {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                        .font(.caption)
                    Text("Action Needed")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.orange)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.orange.opacity(0.08))

                if !overdueInvoices.isEmpty {
                    actionRow(
                        icon: "exclamationmark.square.fill",
                        iconColor: .red,
                        text: "\(overdueInvoices.count) overdue invoice\(overdueInvoices.count > 1 ? "s" : "")",
                        detail: formatCurrency(overdueInvoices.compactMap(\.amount).reduce(0, +)),
                        detailColor: .red
                    )
                }

                if !sentInvoices.isEmpty {
                    actionRow(
                        icon: "clock.fill",
                        iconColor: .blue,
                        text: "\(sentInvoices.count) invoice\(sentInvoices.count > 1 ? "s" : "") awaiting payment",
                        detail: formatCurrency(sentInvoices.compactMap(\.amount).reduce(0, +)),
                        detailColor: .primary
                    )
                }

                if dashboard.summary.pendingSignatures > 0 {
                    actionRow(
                        icon: "doc.text.fill",
                        iconColor: .orange,
                        text: "\(dashboard.summary.pendingSignatures) document\(dashboard.summary.pendingSignatures > 1 ? "s" : "") requested",
                        detail: nil,
                        detailColor: .primary
                    )
                }
            }
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.orange.opacity(0.3), lineWidth: 1)
            )
            .padding(.horizontal)
        }
    }

    private func actionRow(icon: String, iconColor: Color, text: String, detail: String?, detailColor: Color) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
            Spacer()
            if let detail {
                Text(detail)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(detailColor)
            }
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Account Section

    private func accountSection(_ client: ClientProfile) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "building.2")
                    .foregroundStyle(.secondary)
                    .font(.caption)
                Text("Account")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            Divider()

            HStack(alignment: .top, spacing: 0) {
                if let contact = client.contactName {
                    accountField("Contact", value: contact)
                }
                if let email = client.email {
                    accountField("Email", value: email)
                }
                if let phone = client.phone {
                    accountField("Phone", value: phone)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            if client.dotNumber != nil || client.mcNumber != nil || client.einNumber != nil {
                Divider()
                HStack(alignment: .top, spacing: 0) {
                    if let dot = client.dotNumber {
                        accountField("DOT #", value: dot)
                    }
                    if let mc = client.mcNumber {
                        accountField("MC #", value: mc)
                    }
                    if let ein = client.einNumber {
                        accountField("EIN", value: ein)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
        }
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private func accountField(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String, linkText: String?) -> some View {
        HStack {
            Text(title)
                .font(.headline)
            Spacer()
            if let linkText {
                Text(linkText)
                    .font(.caption)
                    .foregroundStyle(Brand.blue)
            }
        }
        .padding(.horizontal)
        .padding(.top, 4)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 17 { return "Good afternoon" }
        return "Good evening"
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }
}

// MARK: - Summary Card

struct SummaryCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    let icon: String
    var accentColor: Color = Brand.blue
    var color: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(color ?? accentColor)
                    .frame(width: 4, height: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title.uppercased())
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .fontWeight(.medium)
                    Text(value)
                        .font(.title3)
                        .fontWeight(.bold)
                }
            }
            if let subtitle {
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
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
                if let dueDate = ticket.dueDate {
                    Text(formatDate(dueDate))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return "" }
            return date.formatted(.dateTime.month(.abbreviated).day())
        }
        return date.formatted(.dateTime.month(.abbreviated).day())
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
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
