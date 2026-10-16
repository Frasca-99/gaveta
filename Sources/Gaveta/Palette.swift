import AppKit
import SwiftUI

/// The materials of a card catalog drawer: oak, brass, felt and card stock.
enum Palette {
    static let oak = Color(hex: 0xC8925A)
    static let oakLight = Color(hex: 0xE2B47E)
    static let oakDark = Color(hex: 0x8A5A2E)
    static let felt = Color(hex: 0x1F4A3A)
    static let brass = Color(hex: 0xC9A24B)
    static let brassLight = Color(hex: 0xF1D891)
    static let brassDark = Color(hex: 0x7C6224)
    static let paper = Color(hex: 0xFBF8F1)
    static let cream = Color(hex: 0xF7EED7)
    static let creamDark = Color(hex: 0xEADBB6)
    /// Dark brown ink, for labels and tabs.
    static let ink = Color(hex: 0x3A2A14)
    /// The line under each card's picture.
    static let meta = Color(hex: 0x6A6458)
    /// Text set on the felt.
    static let onFelt = Color(hex: 0xD9E6DE)
    static let stamp = Color(hex: 0xB3362B)

    static let woodFront = LinearGradient(stops: [.init(color: oakLight, location: 0), .init(color: oak, location: 0.55),
                                                  .init(color: oakDark, location: 1)],
                                          startPoint: .leading, endPoint: .trailing)
    static let brassBar = LinearGradient(stops: [.init(color: brassLight, location: 0), .init(color: brass, location: 0.45),
                                                 .init(color: brassDark, location: 1)],
                                         startPoint: .leading, endPoint: .trailing)
}

/// The label maker's face, for the drawer's label, the tabs and the stamp.
/// American Typewriter ships with macOS.
enum Typewriter {
    static func font(_ size: CGFloat) -> Font { .custom("American Typewriter", size: size) }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
}

/// Green baize with a faint weave, tiled from one small square.
struct Felt: View {
    var body: some View {
        ZStack {
            Palette.felt
            Image(nsImage: Self.tile).resizable(resizingMode: .tile)
            RadialGradient(colors: [.white.opacity(0.07), .clear], center: UnitPoint(x: 0.3, y: 0.1),
                           startRadius: 0, endRadius: 320)
        }
    }

    /// Specks of light and dark, from a fixed seed so every redraw matches.
    private static let tile: NSImage = NSImage(size: NSSize(width: 64, height: 64), flipped: false) { _ in
        var seed: UInt32 = 0x9E37_79B9
        func next() -> CGFloat {
            seed = seed &* 1_664_525 &+ 1_013_904_223
            return CGFloat(seed >> 8) / CGFloat(1 << 24)
        }
        for _ in 0..<320 {
            let light = next() > 0.5
            (light ? NSColor.white : NSColor.black).withAlphaComponent(0.025 + next() * 0.04).setFill()
            NSRect(x: next() * 64, y: next() * 64, width: 1, height: 1).fill()
        }
        return true
    }
}

/// Grain running across an oak board.
struct WoodGrain: View {
    var body: some View {
        Canvas { context, size in
            var y: CGFloat = 4
            var line = 0
            while y < size.height {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addQuadCurve(to: CGPoint(x: size.width, y: y + 3),
                                  control: CGPoint(x: size.width / 2, y: y + (line % 2 == 0 ? -2 : 4)))
                context.stroke(path, with: .color(Color(red: 0.35, green: 0.2, blue: 0.08).opacity(0.13)), lineWidth: 1)
                y += 7 + CGFloat(line % 3) * 2
                line += 1
            }
        }
        .allowsHitTesting(false)
    }
}
