import SwiftUI

struct InvoiceDetailView: View {
    let invoice: Invoice

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(invoice.invoiceNumber ?? "Invoice")
                        .font(.title2)
                        .fontWeight(.bold)

                    StatusBadge(status: invoice.status)
                }

                Divider()

                if let amount = invoice.amount {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Amount")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(formatCurrency(amount))
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(invoice.status == "overdue" ? .red : .primary)
                    }
                }

                if let description = invoice.description, !description.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Description")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(description)
                            .font(.body)
                    }
                }

                if let dueDate = invoice.dueDate {
                    detailRow("Due Date", value: formatDate(dueDate))
                }

                detailRow("Created", value: formatDate(invoice.createdAt))
            }
            .padding()
        }
        .navigationTitle("Invoice Details")
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

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
