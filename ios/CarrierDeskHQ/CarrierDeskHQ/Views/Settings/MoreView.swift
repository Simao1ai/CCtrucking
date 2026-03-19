import SwiftUI

struct MoreView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            List {
                // Documents section (matching web sidebar)
                Section("Documents") {
                    NavigationLink {
                        DocumentsListView()
                    } label: {
                        Label("Documents", systemImage: "doc.fill")
                    }

                    NavigationLink {
                        SignaturesListView()
                    } label: {
                        Label("Sign Documents", systemImage: "signature")
                    }

                    NavigationLink {
                        TaxDocumentsView()
                    } label: {
                        Label("Tax Documents", systemImage: "doc.text.magnifyingglass")
                    }
                }

                // Financial section
                Section("Financial") {
                    NavigationLink {
                        InvoicesListView()
                    } label: {
                        Label("Invoices", systemImage: "doc.text.fill")
                    }

                    NavigationLink {
                        BookkeepingView()
                    } label: {
                        Label("Bookkeeping", systemImage: "banknote")
                    }
                }

                // Additional
                Section("Other") {
                    NavigationLink {
                        FormsListView()
                    } label: {
                        Label("Forms", systemImage: "doc.text")
                    }

                    NavigationLink {
                        NotarizationsListView()
                    } label: {
                        Label("Notarizations", systemImage: "checkmark.seal")
                    }
                }

                // Profile section
                if let client = authViewModel.client {
                    Section("Account") {
                        detailRow("Company", value: client.companyName)
                        if let contact = client.contactName {
                            detailRow("Contact", value: contact)
                        }
                        if let email = client.email {
                            detailRow("Email", value: email)
                        }
                        if let phone = client.phone {
                            detailRow("Phone", value: phone)
                        }
                        if let address = client.address {
                            let fullAddress = [address, client.city, client.state, client.zipCode]
                                .compactMap { $0 }
                                .joined(separator: ", ")
                            detailRow("Address", value: fullAddress)
                        }
                    }

                    if client.dotNumber != nil || client.mcNumber != nil || client.einNumber != nil {
                        Section("Regulatory") {
                            if let dot = client.dotNumber {
                                detailRow("DOT #", value: dot)
                            }
                            if let mc = client.mcNumber {
                                detailRow("MC #", value: mc)
                            }
                            if let ein = client.einNumber {
                                detailRow("EIN", value: ein)
                            }
                        }
                    }
                }

                // Support info
                if let tenant = authViewModel.tenant {
                    Section("Support") {
                        detailRow("Provider", value: tenant.companyName)
                        if let email = tenant.supportEmail {
                            detailRow("Email", value: email)
                        }
                        if let phone = tenant.supportPhone {
                            detailRow("Phone", value: phone)
                        }
                    }
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        Task { await authViewModel.logout() }
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                                .fontWeight(.medium)
                        }
                    }
                }
            }
            .navigationTitle("More")
            .task {
                if authViewModel.client == nil {
                    if let client = try? await APIService.shared.getCurrentUser() {
                        authViewModel.client = client
                    }
                }
            }
        }
    }

    private func detailRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .multilineTextAlignment(.trailing)
        }
    }
}
