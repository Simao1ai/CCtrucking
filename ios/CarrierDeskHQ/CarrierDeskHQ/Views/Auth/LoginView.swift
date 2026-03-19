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

    var primaryColor: Color {
        if let hex = tenant.primaryColor {
            return Color(hex: hex)
        }
        return .blue
    }

    var body: some View {
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
                            .foregroundStyle(primaryColor)
                    }
                    .frame(height: 80)
                } else {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(primaryColor)
                }

                Text(tenant.companyName)
                    .font(.title2)
                    .fontWeight(.bold)

                if let tagline = tenant.tagline {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
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
                            .tint(.white)
                    } else {
                        Text("Sign In")
                            .fontWeight(.semibold)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(primaryColor)
                .controlSize(.large)
                .disabled(username.isEmpty || password.isEmpty || authViewModel.isLoading)
            }
            .padding(.horizontal, 24)

            if let error = authViewModel.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 12)
                    .padding(.horizontal)
            }

            Spacer()

            // Support info
            VStack(spacing: 4) {
                if let email = tenant.supportEmail {
                    Label(email, systemImage: "envelope")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let phone = tenant.supportPhone {
                    Label(phone, systemImage: "phone")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.bottom, 24)
        }
        .navigationBarBackButtonHidden(false)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") {
                    authViewModel.resetToLookup()
                    authViewModel.clearError()
                }
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
