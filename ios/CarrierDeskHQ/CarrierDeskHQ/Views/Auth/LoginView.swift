import SwiftUI

struct LoginView: View {
    let tenant: TenantBranding
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var username = ""
    @State private var password = ""
    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case username, password
    }

    var body: some View {
        ZStack {
            // Navy gradient background matching landing page
            Brand.heroGradient
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Tenant branding
                VStack(spacing: 12) {
                    if let logoUrl = tenant.logoUrl, let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            Image(systemName: "building.2.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(Brand.amber)
                        }
                        .frame(height: 80)
                    } else {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Brand.amber)
                    }

                    Text(tenant.companyName)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    if let tagline = tenant.tagline {
                        Text(tagline)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                .padding(.bottom, 40)

                // Login form
                VStack(spacing: 16) {
                    TextField("Username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .username)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .password }

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .focused($focusedField, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { loginAction() }

                    Button(action: loginAction) {
                        if authViewModel.isLoading {
                            ProgressView()
                                .tint(Brand.foreground)
                        } else {
                            Text("Sign In")
                                .fontWeight(.semibold)
                                .foregroundStyle(Brand.foreground)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Brand.amber)
                    .controlSize(.large)
                    .disabled(username.isEmpty || password.isEmpty || authViewModel.isLoading)
                }
                .padding(.horizontal, 24)

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

                // Support info
                VStack(spacing: 4) {
                    if let email = tenant.supportEmail {
                        Label(email, systemImage: "envelope")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                    if let phone = tenant.supportPhone {
                        Label(phone, systemImage: "phone")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .navigationBarBackButtonHidden(false)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") {
                    authViewModel.resetToLookup()
                    authViewModel.clearError()
                }
                .foregroundStyle(.white)
            }
        }
        .onAppear {
            authViewModel.clearError()
        }
    }

    private func loginAction() {
        Task {
            await authViewModel.login(username: username, password: password)
        }
    }
}

// MARK: - Color from Hex

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
