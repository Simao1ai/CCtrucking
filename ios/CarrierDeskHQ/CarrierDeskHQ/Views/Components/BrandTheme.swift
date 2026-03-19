import SwiftUI

/// Brand colors matching the CarrierDeskHQ landing page
enum Brand {
    // Deep navy – hero/sidebar background
    static let navy = Color(hex: "#1a3352")

    // Primary blue – main interactive color
    static let blue = Color(hex: "#1e56b8")

    // Amber/gold accent – CTAs, "HQ" highlight
    static let amber = Color(hex: "#f59e0b")

    // Dark foreground text
    static let foreground = Color(hex: "#1a2638")

    // Hero gradient colors
    static let heroStart = Color(hex: "#1a3352")
    static let heroMid = Color(hex: "#1f3d5e")
    static let heroEnd = Color(hex: "#24476a")

    /// Gradient matching the landing page hero section
    static var heroGradient: LinearGradient {
        LinearGradient(
            colors: [heroStart, heroMid, heroEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// Branded "CarrierDeskHQ" text matching the landing page logo typography
struct BrandTitle: View {
    var size: Font = .largeTitle

    var body: some View {
        HStack(spacing: 0) {
            Text("CarrierDesk")
                .font(size)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            Text("HQ")
                .font(size)
                .fontWeight(.bold)
                .foregroundStyle(Brand.amber)
        }
    }
}