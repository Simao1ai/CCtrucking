import SwiftUI

@MainActor
class TicketsViewModel: ObservableObject {
    @Published var tickets: [Ticket] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var selectedStatus: String?

    let statusOptions = [nil, "open", "in_progress", "completed", "closed"]
    let statusLabels = ["All", "Open", "In Progress", "Completed", "Closed"]

    func load() async {
        isLoading = true
        error = nil
        do {
            tickets = try await APIService.shared.getTickets(status: selectedStatus)
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func refresh() async {
        do {
            tickets = try await APIService.shared.getTickets(status: selectedStatus)
        } catch {}
    }
}

@MainActor
class InvoicesViewModel: ObservableObject {
    @Published var invoices: [Invoice] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var selectedStatus: String?

    let statusOptions = [nil, "sent", "paid", "overdue"]
    let statusLabels = ["All", "Sent", "Paid", "Overdue"]

    func load() async {
        isLoading = true
        error = nil
        do {
            invoices = try await APIService.shared.getInvoices(status: selectedStatus)
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func refresh() async {
        do {
            invoices = try await APIService.shared.getInvoices(status: selectedStatus)
        } catch {}
    }
}

@MainActor
class DocumentsViewModel: ObservableObject {
    @Published var documents: [Document] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            documents = try await APIService.shared.getDocuments()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class SignaturesViewModel: ObservableObject {
    @Published var signatures: [SignatureRequest] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            signatures = try await APIService.shared.getSignatures()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
class NotarizationsViewModel: ObservableObject {
    @Published var notarizations: [Notarization] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        error = nil
        do {
            notarizations = try await APIService.shared.getNotarizations()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
