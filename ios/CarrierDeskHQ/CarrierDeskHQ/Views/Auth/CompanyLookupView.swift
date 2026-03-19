import SwiftUI

struct CompanyLookupView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var slug = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer()

                // Logo & branding
                VStack(spacing: 16) {
                    Image(systemName: "truck.box.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)

                    Text("CarrierDesk HQ")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Enter your company code to get started")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, 48)

                // Slug input
                VStack(spacing: 16) {
                    TextField("Company Code", text: $slug)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .font(.body)
                        .padding(.horizontal)

                    Button {
                        authViewModel.slug = slug
                        Task {
                            await authViewModel.lookupCompany()
                        }
                    } label: {
                        if authViewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Continue")
                                .fontWeight(.semibold)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(slug.isEmpty || authViewModel.isLoading)
                    .padding(.horizontal)
                }

                if let error = authViewModel.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.top, 12)
                        .padding(.horizontal)
                }

                Spacer()
                Spacer()
            }
            .navigationDestination(isPresented: Binding<Bool>(
                get: { authViewModel.tenant != nil },
                set: { if !$0 { authViewModel.tenant = nil } }
            )) {
                if let tenant = authViewModel.tenant {
                    LoginView(tenant: tenant)
                        .environmentObject(authViewModel)
                }
            }
        }
        .onAppear {
            if let savedSlug = KeychainService.getSlug() {
                slug = savedSlug
            }
        }
    }
}
