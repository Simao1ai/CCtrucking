import SwiftUI

struct DocumentsListView: View {
    @StateObject private var viewModel = DocumentsViewModel()
    @State private var searchText = ""

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
                        message: "All your compliance documents and files will appear here."
                    )
                } else {
                    documentsContent
                }
            }
            .navigationTitle("Documents")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var pendingCount: Int {
        viewModel.documents.filter { $0.status == "pending" }.count
    }

    private var filteredDocuments: [Document] {
        if searchText.isEmpty { return viewModel.documents }
        return viewModel.documents.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.type ?? "").localizedCaseInsensitiveContains(searchText)
        }
    }

    private var documentsContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Subtitle with pending badge
                HStack {
                    Text("All your compliance documents and files")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if pendingCount > 0 {
                        Text("\(pendingCount) pending")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.orange)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.orange.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    Spacer()
                }
                .padding(.horizontal)

                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search documents...", text: $searchText)
                        .textFieldStyle(.plain)
                }
                .padding(10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)

                // Documents list
                LazyVStack(spacing: 0) {
                    ForEach(filteredDocuments) { doc in
                        documentRow(doc)
                        if doc.id != filteredDocuments.last?.id {
                            Divider().padding(.leading, 56)
                        }
                    }
                }
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
    }

    private func documentRow(_ doc: Document) -> some View {
        HStack {
            Image(systemName: iconForType(doc.type))
                .font(.title3)
                .foregroundStyle(Brand.navy)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(doc.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                if let type = doc.type {
                    Text(type)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                if let status = doc.status {
                    StatusBadge(status: status, compact: true)
                }
                if let createdAt = doc.createdAt {
                    Text(formatDate(createdAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
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
            return date.formatted(.dateTime.month(.abbreviated).day().year())
        }
        return date.formatted(.dateTime.month(.abbreviated).day().year())
    }
}
