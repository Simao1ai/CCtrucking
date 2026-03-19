import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            List {
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
                    }

                    if client.dotNumber != nil || client.mcNumber != nil {
                        Section("Compliance") {
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
                    Section("Company") {
                        detailRow("Provider", value: tenant.companyName)
                        if let email = tenant.supportEmail {
                            detailRow("Support Email", value: email)
                        }
                        if let phone = tenant.supportPhone {
                            detailRow("Support Phone", value: phone)
                        }
                    }
                }

                // App info
                Section("App") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }

                // Sign out
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
            .navigationTitle("Settings")
            .task {
                // Load profile if not already loaded
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
        }
    }
}
