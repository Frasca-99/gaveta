import AppKit
import SwiftUI

enum DrawerLayout {
    /// The oak front with the label and the pull.
    static let frontWidth: CGFloat = 58
    /// The felt-lined box the cards stand in, as the card catalog has it.
    static let standardBoxWidth: CGFloat = 300
    /// How wide the box is now: the card catalog's never changes, the glass
    /// drawer's follows its grip. The drawer sets it; everything that lays
    /// the cards out or finds them under the pointer reads it.
    nonisolated(unsafe) static var boxWidth: CGFloat = standardBoxWidth
    /// The widest the glass drawer goes on a screen: half of it at most.
    static func widestBox(for screen: NSScreen?) -> CGFloat {
        let room = (screen ?? NSScreen.main)?.visibleFrame.width ?? 1440
        return max(standardBoxWidth, min(600, room / 2 - frontWidth))
    }
    static var drawerWidth: CGFloat { frontWidth + boxWidth }
    /// Room around the drawer inside its window for its shadow.
    static let shadowRoom: CGFloat = 44
    static var windowWidth: CGFloat { drawerWidth + shadowRoom }
    /// How much shows when a new capture peeks in: the front and the
    /// cards' edges.
    static let peekWidth: CGFloat = 120
    static let rail: CGFloat = 10
    static let footerHeight: CGFloat = 44
    static let emptyHeight: CGFloat = 230

    /// The tallest the drawer gets on a screen with this much room.
    static func maxHeight(for available: CGFloat) -> CGFloat {
        min(available - 40, 900)
    }

    /// What the cards may take at rest, in a drawer this tall at most.
    static func stackRoom(maximum: CGFloat) -> CGFloat {
        maximum - rail * 2 - footerHeight
    }

    static func height(count: Int, hovered: Int?, maximum: CGFloat) -> CGFloat {
        guard count > 0 else { return emptyHeight }
        let stack = CardStack(count: count, hovered: hovered, room: stackRoom(maximum: maximum))
        return rail * 2 + stack.height + footerHeight
    }

    /// Where the drawer sits in its window, from the window's top.
    struct Placement {
        let top: CGFloat
        let height: CGFloat
    }

    /// Centred for its height at rest. When a card opens up under the
    /// pointer it grows downwards only, so nothing under the pointer moves.
    @MainActor
    static func placement(for drawer: Drawer, maximum: CGFloat) -> Placement {
        let count = drawer.pins.count
        let rest = min(height(count: count, hovered: nil, maximum: maximum), maximum)
        let top = (maximum - rest) / 2
        let current = height(count: count, hovered: drawer.hoveredIndex, maximum: maximum)
        return Placement(top: top, height: min(current, maximum - top))
    }
}

/// The drawer of a card catalog, sliding out of the right edge: an oak
/// front with a brass label holder and pull, and a felt-lined box with the
/// captures standing in it as index cards, the newest in front.
struct DrawerView: View {
    @ObservedObject var drawer: Drawer

    var body: some View {
        switch drawer.style {
        case .catalog: catalog
        case .glass: GlassDrawerView(drawer: drawer)
        }
    }

    private var catalog: some View {
        GeometryReader { geo in
            let maximum = geo.size.height - DrawerLayout.shadowRoom * 2
            let placement = DrawerLayout.placement(for: drawer, maximum: maximum)
            HStack(spacing: 0) {
                DrawerFront(count: drawer.pins.count)
                box(maximum: maximum)
            }
            .frame(width: DrawerLayout.drawerWidth, height: placement.height)
            .compositingGroup()
            .shadow(color: .black.opacity(0.35), radius: 13, x: -12, y: 16)
            .keyframeAnimator(initialValue: CGFloat(0), trigger: drawer.arrivals) { content, nudge in
                content.offset(x: nudge)
            } keyframes: { _ in
                // A card landing knocks the drawer back a little.
                KeyframeTrack {
                    CubicKeyframe(-6, duration: 0.1)
                    CubicKeyframe(2, duration: 0.12)
                    CubicKeyframe(0, duration: 0.16)
                }
            }
            .offset(x: slide)
            .padding(.top, DrawerLayout.shadowRoom + placement.top)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topTrailing)
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.8), value: drawer.isOpen)
        .animation(.spring(response: 0.42, dampingFraction: 0.8), value: drawer.peeking)
        .animation(.spring(response: 0.34, dampingFraction: 0.84), value: drawer.hovered)
        .animation(.spring(response: 0.34, dampingFraction: 0.86), value: drawer.pins.count)
    }

    /// Open, out by a crack, or shut inside the edge.
    private var slide: CGFloat {
        if drawer.isOpen { return 0 }
        if drawer.peeking { return DrawerLayout.drawerWidth - DrawerLayout.peekWidth }
        return DrawerLayout.drawerWidth + 20
    }

    private func box(maximum: CGFloat) -> some View {
        VStack(spacing: 0) {
            rail
            VStack(spacing: 0) {
                if drawer.pins.isEmpty {
                    emptyState
                } else {
                    StackView(drawer: drawer, maximum: maximum)
                    footer
                }
            }
            .frame(maxHeight: .infinity)
            .background(Felt())
            .overlay(alignment: .leading) {
                LinearGradient(colors: [.black.opacity(0.5), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(width: 22)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .top) {
                LinearGradient(colors: [.black.opacity(0.35), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: 14)
                    .allowsHitTesting(false)
            }
            .clipped()
            rail
        }
        .frame(width: DrawerLayout.boxWidth)
    }

    private var rail: some View {
        LinearGradient(colors: [Palette.oak, Palette.oakDark], startPoint: .top, endPoint: .bottom)
            .frame(height: DrawerLayout.rail)
    }

    /// The selection bar. With nothing selected it offers to select
    /// everything, and says how to pick a few.
    private var footer: some View {
        let count = drawer.selection.count
        let total = drawer.pins.count
        return HStack(spacing: 7) {
            if count == 0 {
                if total > 1 {
                    BarButton(title: "Selecionar todos", systemImage: "checkmark.circle") { drawer.selectAll() }
                    Spacer()
                    Text("ou use a bolinha").font(.system(size: 11)).lineLimit(1).opacity(0.6)
                } else {
                    Text("Clique para copiar").font(.system(size: 11)).opacity(0.6)
                    Spacer()
                }
            } else {
                Text("\(count) de \(total)")
                    .font(.system(size: 12, weight: .semibold))
                    .monospacedDigit()
                Spacer()
                if count < total {
                    BarButton(title: "Todos", systemImage: "checkmark.circle") { drawer.selectAll() }
                }
                BarButton(title: count == 1 ? "Copiar" : "Copiar todos", systemImage: "doc.on.doc", main: true) {
                    drawer.copySelection()
                }
                BarButton(title: nil, systemImage: "xmark") { drawer.clearSelection() }
                    .help("Limpar seleção")
            }
        }
        .foregroundStyle(Palette.onFelt)
        .padding(.leading, 16)
        .padding(.trailing, 12)
        .frame(height: DrawerLayout.footerHeight)
        .overlay(alignment: .top) { Rectangle().fill(.white.opacity(0.08)).frame(height: 1) }
    }

    private var emptyState: some View {
        VStack(spacing: 6) {
            Text("Gaveta vazia").font(Typewriter.font(16))
            Text("Tire um print com ⌘⇧4 e ele cai aqui.")
                .font(.system(size: 12))
                .opacity(0.8)
        }
        .foregroundStyle(Palette.onFelt)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// The drawer's oak front: a label holder reading PRINTS, a brass pull and
/// how many cards are inside.
struct DrawerFront: View {
    let count: Int

    var body: some View {
        let shape = UnevenRoundedRectangle(topLeadingRadius: 12, bottomLeadingRadius: 12, style: .continuous)
        VStack(spacing: 20) {
            label
            Capsule()
                .fill(Palette.brassBar)
                .overlay(Capsule().strokeBorder(.white.opacity(0.25), lineWidth: 1))
                .frame(width: 18, height: 54)
                .shadow(color: .black.opacity(0.45), radius: 2, y: 2)
            Text("\(count)")
                .font(Typewriter.font(12))
                .monospacedDigit()
                .foregroundStyle(Palette.ink.opacity(0.75))
        }
        .frame(width: DrawerLayout.frontWidth)
        .frame(maxHeight: .infinity)
        .background(shape.fill(Palette.woodFront))
        .overlay(WoodGrain().clipShape(shape))
        .overlay(alignment: .leading) {
            Rectangle().fill(Palette.cream.opacity(0.35)).frame(width: 2).clipShape(shape)
        }
        .overlay(alignment: .trailing) {
            Rectangle().fill(.black.opacity(0.18)).frame(width: 2)
        }
    }

    /// Typed on a card behind a brass frame, read from bottom to top.
    private var label: some View {
        Text("PRINTS")
            .font(Typewriter.font(15))
            .tracking(4.8)
            .foregroundStyle(Palette.ink)
            .fixedSize()
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 4)
                .fill(LinearGradient(colors: [Palette.cream, Palette.creamDark], startPoint: .top, endPoint: .bottom)))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Palette.brass, lineWidth: 3))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Palette.brassDark, lineWidth: 1).padding(-0.5))
            .rotationEffect(.degrees(-90))
            .frame(width: 32, height: 116)
    }
}

/// A small pill on the felt that works on the first click, though the
/// drawer never becomes the key window.
struct BarButton: View {
    let title: String?
    let systemImage: String
    var main = false
    let action: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: systemImage).font(.system(size: 10, weight: .semibold))
            if let title { Text(title).font(.system(size: 11, weight: .medium)) }
        }
        .foregroundStyle(main ? Color(hex: 0x2A1D11) : Palette.onFelt)
        .padding(.horizontal, title == nil ? 7 : 10)
        .frame(height: 24)
        .background(Capsule().fill(main ? AnyShapeStyle(Palette.brass) : AnyShapeStyle(Color.white.opacity(0.12))))
        .fixedSize()
        .overlay(FirstClick(action: action))
    }
}

/// Catches a click on a view without the window having to be key first.
struct FirstClick: NSViewRepresentable {
    let action: () -> Void

    func makeNSView(context: Context) -> FirstClickView { FirstClickView() }
    func updateNSView(_ view: FirstClickView, context: Context) { view.action = action }

    final class FirstClickView: NSView {
        var action: (() -> Void)?
        override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
        override func mouseDown(with event: NSEvent) {}
        override func mouseUp(with event: NSEvent) {
            if bounds.contains(convert(event.locationInWindow, from: nil)) { action?() }
        }
    }
}

/// The captures standing in the drawer, newest in front, scrolled to the
/// front. Both styles stand them the same way, so the pointer finds them the
/// same way; only the cards are drawn differently.
struct StackView: View {
    @ObservedObject var drawer: Drawer
    let maximum: CGFloat

    private static let frontID = "front"

    var body: some View {
        let list = drawer.stackOrder
        let stack = CardStack(count: list.count, hovered: drawer.hoveredIndex,
                              room: DrawerLayout.stackRoom(maximum: maximum))
        let selecting = !drawer.selection.isEmpty
        let glass = drawer.style == .glass
        return ScrollViewReader { proxy in
            ScrollView(.vertical) {
                VStack(spacing: 0) {
                    ZStack(alignment: .topLeading) {
                        ForEach(Array(list.enumerated()), id: \.element.id) { index, pin in
                            let hovered = drawer.hovered == pin.id
                            let selected = drawer.selection.contains(pin.id)
                            let card = CardState(hovered: hovered && drawer.dragging.isEmpty, selected: selected,
                                                 selecting: selecting, copied: drawer.copied.contains(pin.id),
                                                 dragging: drawer.dragging.contains(pin.id),
                                                 hidden: drawer.landing.contains(pin.id) || drawer.departing.contains(pin.id))
                            Group {
                                if glass {
                                    GlassCardView(pin: pin, reveal: stack.reveal(index), state: card)
                                } else {
                                    CardView(pin: pin, reveal: stack.reveal(index), hovered: card.hovered,
                                             selected: selected, selecting: selecting, copied: card.copied,
                                             dragging: card.dragging, hidden: card.hidden)
                                }
                            }
                            .offset(x: CardStack.leftInset + CardStack.shift(hovered: hovered, selected: selected),
                                    y: stack.top(index))
                            .transition(.card)
                        }
                    }
                    .frame(width: DrawerLayout.boxWidth, height: stack.height, alignment: .topLeading)
                    .overlay(CardsControl(drawer: drawer, cards: list, stack: stack))
                    Color.clear.frame(height: 0).id(Self.frontID)
                }
            }
            .scrollIndicators(.never)
            .onAppear { proxy.scrollTo(Self.frontID, anchor: .bottom) }
            .onChange(of: drawer.pins.first?.id) { proxy.scrollTo(Self.frontID, anchor: .bottom) }
            .onChange(of: drawer.isOpen) { if drawer.isOpen { proxy.scrollTo(Self.frontID, anchor: .bottom) } }
        }
    }
}
