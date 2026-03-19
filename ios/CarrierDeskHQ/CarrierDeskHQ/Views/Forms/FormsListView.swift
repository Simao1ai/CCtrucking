import SwiftUI

@MainActor
class FormsViewModel: ObservableObject {
    @Published var forms: [FilledForm] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            forms = try await APIService.shared.getForms()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct FormsListView: View {
    @StateObject private var viewModel = FormsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.forms.isEmpty {
                    ProgressView("Loading forms...")
                } else if let error = viewModel.error, viewModel.forms.isEmpty {
                    ErrorBanner(message: error) { await viewModel.load() }
                } else if viewModel.forms.isEmpty {
                    EmptyStateView(
                        icon: "doc.text",
                        title: "No Forms",
                        message: "Your forms will appear here when assigned."
                    )
                } else {
                    formsList
                }
            }
            .navigationTitle("Forms")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var formsList: some View {
        List(viewModel.forms) { form in
            HStack {
                Image(systemName: (form.status ?? "") == "submitted" ? "doc.text.fill" : "doc.text")
                    .foregroundStyle((form.status ?? "") == "submitted" ? .green : Brand.navy)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 4) {
                    Text(form.name ?? "Form")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    if let date = form.updatedAt ?? form.createdAt {
                        Text(formatDate(date))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                StatusBadge(status: form.status ?? "pending", compact: true)
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
