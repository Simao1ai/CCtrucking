import SwiftUI

struct CompanyLookupView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var slug = ""

    var body: some View {
        NavigationStack {
            ZStack {
                // Navy gradient background matching landing page hero
                Brand.heroGradient
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()

                    // Logo & branding
                    VStack(spacing: 16) {
                        Image(systemName: "truck.box.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(Brand.amber)

                        BrandTitle()

                        Text("Enter your company code to get started")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
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
                                    .tint(Brand.foreground)
                            } else {
                                Text("Continue")
                                    .fontWeight(.semibold)
                                    .foregroundStyle(Brand.foreground)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Brand.amber)
                        .controlSize(.large)
                        .disabled(slug.isEmpty || authViewModel.isLoading)
                        .padding(.horizontal)
                    }

                    if let error = authViewModel.error {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.yellow)
                            Text(error)
                                .foregroundStyle(.white)
                        }
                        .font(.callout)
                        .padding(12)
                        .background(Color.red.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.top, 12)
                        .padding(.horizontal, 24)
                    }

                    Spacer()
                    Spacer()
                }
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
