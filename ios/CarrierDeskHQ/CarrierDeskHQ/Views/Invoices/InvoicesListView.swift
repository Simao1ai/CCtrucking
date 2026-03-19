import SwiftUI

struct InvoicesListView: View {
    @StateObject private var viewModel = InvoicesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.invoices.isEmpty {
                    ProgressView("Loading invoices...")
                } else if let error = viewModel.error, viewModel.invoices.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.invoices.isEmpty {
                    EmptyStateView(
                        icon: "doc.text",
                        title: "No Invoices",
                        message: "You don't have any invoices yet."
                    )
                } else {
                    invoicesList
                }
            }
            .navigationTitle("Invoices")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    filterMenu
                }
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.refresh() }
        }
    }

    private var invoicesList: some View {
        List(viewModel.invoices) { invoice in
            NavigationLink {
                InvoiceDetailView(invoice: invoice)
            } label: {
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
                        if let dueDate = invoice.dueDate {
                            Text("Due: \(formatDate(dueDate))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
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

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
