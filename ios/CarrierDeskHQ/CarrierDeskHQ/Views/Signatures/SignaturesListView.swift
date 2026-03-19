import SwiftUI

struct SignaturesListView: View {
    @StateObject private var viewModel = SignaturesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.signatures.isEmpty {
                    ProgressView("Loading signatures...")
                } else if let error = viewModel.error, viewModel.signatures.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.signatures.isEmpty {
                    EmptyStateView(
                        icon: "signature",
                        title: "No Signature Requests",
                        message: "You don't have any documents to sign."
                    )
                } else {
                    signaturesList
                }
            }
            .navigationTitle("Signatures")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var signaturesList: some View {
        List(viewModel.signatures) { sig in
            HStack {
                Image(systemName: sig.status == "signed" ? "checkmark.seal.fill" : "signature")
                    .font(.title3)
                    .foregroundStyle(sig.status == "signed" ? .green : .orange)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text(sig.documentName ?? "Signature Request")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let createdAt = sig.createdAt {
                        Text(formatDate(createdAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let signedAt = sig.signedAt {
                        Text("Signed: \(formatDate(signedAt))")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }

                Spacer()
                StatusBadge(status: sig.status, compact: true)
            }
            .padding(.vertical, 4)
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
