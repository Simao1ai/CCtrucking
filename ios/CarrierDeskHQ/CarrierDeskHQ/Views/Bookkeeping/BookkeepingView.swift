import SwiftUI

@MainActor
class BookkeepingViewModel: ObservableObject {
    @Published var subscription: BookkeepingSubscription?
    @Published var transactions: [BankTransaction] = []
    @Published var summaries: [MonthlySummary] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var selectedTab = 0

    func load() async {
        isLoading = true
        error = nil
        do {
            async let sub = APIService.shared.getBookkeepingSubscription()
            async let txns = APIService.shared.getTransactions()
            async let sums = APIService.shared.getMonthlySummaries()
            subscription = try await sub
            transactions = try await txns
            summaries = try await sums
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct BookkeepingView: View {
    @StateObject private var viewModel = BookkeepingViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.transactions.isEmpty && viewModel.summaries.isEmpty {
                    ProgressView("Loading bookkeeping...")
                } else if let error = viewModel.error, viewModel.transactions.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else {
                    bookkeepingContent
                }
            }
            .navigationTitle("Bookkeeping")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var bookkeepingContent: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Subscription status
                if let sub = viewModel.subscription {
                    subscriptionCard(sub)
                } else {
                    noSubscriptionCard
                }

                // Monthly summaries
                if !viewModel.summaries.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Monthly Summary")
                            .font(.headline)
                            .padding(.horizontal)
                        ForEach(viewModel.summaries.sorted(by: { ($0.year * 100 + $0.month) > ($1.year * 100 + $1.month) })) { summary in
                            summaryRow(summary)
                        }
                    }
                }

                // Recent transactions
                if !viewModel.transactions.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Recent Transactions")
                            .font(.headline)
                            .padding(.horizontal)
                        ForEach(viewModel.transactions.prefix(20)) { txn in
                            transactionRow(txn)
                        }
                    }
                }

                if viewModel.transactions.isEmpty && viewModel.summaries.isEmpty && viewModel.subscription != nil {
                    EmptyStateView(
                        icon: "banknote",
                        title: "No Transactions",
                        message: "Upload a bank statement to get started."
                    )
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
    }

    private func subscriptionCard(_ sub: BookkeepingSubscription) -> some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(.green)
                Text("Bookkeeping Active")
                    .fontWeight(.semibold)
                Spacer()
                StatusBadge(status: sub.status, compact: true)
            }
            HStack {
                Text("\(sub.plan.capitalized) Plan")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(formatCurrency(sub.price) + "/mo")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private var noSubscriptionCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "banknote")
                .font(.title)
                .foregroundStyle(Brand.navy)
            Text("Bookkeeping Service")
                .font(.headline)
            Text("Contact your provider to activate bookkeeping.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private func summaryRow(_ summary: MonthlySummary) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text(monthName(summary.month) + " \(summary.year)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
            }
            HStack {
                VStack(alignment: .leading) {
                    Text("Income")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatCurrency(summary.totalIncome))
                        .font(.subheadline)
                        .foregroundStyle(.green)
                }
                Spacer()
                VStack {
                    Text("Expenses")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatCurrency(summary.totalExpenses))
                        .font(.subheadline)
                        .foregroundStyle(.red)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("Net")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatCurrency(summary.netIncome))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(summary.netIncome >= 0 ? .green : .red)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    private func transactionRow(_ txn: BankTransaction) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(txn.description)
                    .font(.subheadline)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Text(txn.category)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(Capsule())
                    if txn.reviewed {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }
            }
            Spacer()
            Text(formatCurrency(txn.amount))
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(txn.amount >= 0 ? .green : .primary)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        var components = DateComponents()
        components.month = month
        guard let date = Calendar.current.date(from: components) else { return "\(month)" }
        return formatter.string(from: date)
    }
}
