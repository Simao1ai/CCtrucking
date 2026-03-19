import SwiftUI

struct DocumentsListView: View {
    @StateObject private var viewModel = DocumentsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.documents.isEmpty {
                    ProgressView("Loading documents...")
                } else if let error = viewModel.error, viewModel.documents.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.documents.isEmpty {
                    EmptyStateView(
                        icon: "doc.fill",
                        title: "No Documents",
                        message: "You don't have any documents yet."
                    )
                } else {
                    documentsList
                }
            }
            .navigationTitle("Documents")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var documentsList: some View {
        List(viewModel.documents) { doc in
            HStack {
                Image(systemName: iconForType(doc.type))
                    .font(.title3)
                    .foregroundStyle(.blue)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text(doc.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    HStack {
                        if let type = doc.type {
                            Text(type.uppercased())
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Text(formatDate(doc.createdAt))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if doc.fileUrl != nil {
                    Image(systemName: "arrow.down.circle")
                        .foregroundStyle(.blue)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func iconForType(_ type: String?) -> String {
        switch type?.lowercased() {
        case "pdf": return "doc.fill"
        case "image", "jpg", "jpeg", "png": return "photo"
        case "receipt": return "receipt"
        default: return "doc.fill"
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
