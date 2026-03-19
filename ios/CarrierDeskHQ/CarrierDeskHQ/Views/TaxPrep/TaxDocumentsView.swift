import SwiftUI

@MainActor
class TaxDocumentsViewModel: ObservableObject {
    @Published var documents: [TaxDocument] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            documents = try await APIService.shared.getTaxDocuments()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func approve(_ id: String) async {
        do {
            try await APIService.shared.approveTaxDocument(id: id)
            await load()
        } catch {}
    }

    func reject(_ id: String, feedback: String) async {
        do {
            try await APIService.shared.rejectTaxDocument(id: id, feedback: feedback)
            await load()
        } catch {}
    }
}

struct TaxDocumentsView: View {
    @StateObject private var viewModel = TaxDocumentsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.documents.isEmpty {
                    ProgressView("Loading tax documents...")
                } else if let error = viewModel.error, viewModel.documents.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.documents.isEmpty {
                    EmptyStateView(
                        icon: "doc.text.magnifyingglass",
                        title: "No Tax Documents",
                        message: "Your tax documents will appear here."
                    )
                } else {
                    documentsList
                }
            }
            .navigationTitle("Tax Prep")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var documentsList: some View {
        List(viewModel.documents) { doc in
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: iconForType(doc.documentType))
                        .foregroundStyle(Brand.navy)
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(doc.documentType)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        if let payer = doc.payerName {
                            Text(payer)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Tax Year \(doc.taxYear)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        StatusBadge(status: doc.status, compact: true)
                    }
                }

                if let income = doc.totalIncome {
                    HStack {
                        Label(formatCurrency(income), systemImage: "arrow.up.circle")
                            .font(.caption)
                            .foregroundStyle(.green)
                        if let fed = doc.federalWithholding {
                            Label(formatCurrency(fed), systemImage: "building.columns")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                    }
                }

                if let feedback = doc.rejectionFeedback {
                    Text("Feedback: \(feedback)")
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                // Action buttons for pending review
                if doc.status == "pending_review" || doc.status == "pending" {
                    HStack {
                        Button {
                            Task { await viewModel.approve(doc.id) }
                        } label: {
                            Label("Approve", systemImage: "checkmark.circle")
                                .font(.caption)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .controlSize(.small)

                        Button {
                            Task { await viewModel.reject(doc.id, feedback: "Needs correction") }
                        } label: {
                            Label("Reject", systemImage: "xmark.circle")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                        .controlSize(.small)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func iconForType(_ type: String) -> String {
        switch type.lowercased() {
        case "w-2", "w2": return "doc.text.fill"
        case "1099", "1099-nec", "1099-misc": return "doc.plaintext"
        case "1040": return "doc.richtext"
        default: return "doc.fill"
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
