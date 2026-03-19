import SwiftUI

struct MoreView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            List {
                // Services section
                Section("Services") {
                    NavigationLink {
                        DocumentsListView()
                    } label: {
                        Label("Documents", systemImage: "folder.fill")
                    }

                    NavigationLink {
                        BookkeepingView()
                    } label: {
                        Label("Bookkeeping", systemImage: "banknote")
                    }

                    NavigationLink {
                        TaxDocumentsView()
                    } label: {
                        Label("Tax Prep", systemImage: "doc.text.magnifyingglass")
                    }

                    NavigationLink {
                        FormsListView()
                    } label: {
                        Label("Forms", systemImage: "doc.text")
                    }

                    NavigationLink {
                        SignaturesListView()
                    } label: {
                        Label("Signatures", systemImage: "signature")
                    }

                    NavigationLink {
                        NotarizationsListView()
                    } label: {
                        Label("Notarizations", systemImage: "checkmark.seal")
                    }
                }

                // Profile section
                if let client = authViewModel.client {
                    Section("Profile") {
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
                                detailRow("DOT Number", value: dot)
                            }
                            if let mc = client.mcNumber {
                                detailRow("MC Number", value: mc)
                            }
                            if let ein = client.einNumber {
                                detailRow("EIN", value: ein)
                            }
                        }
                    }
                }

                // Tenant info
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

                // App & sign out
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.1.0")
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task { await authViewModel.logout() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                                .fontWeight(.medium)
                            Spacer()
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
