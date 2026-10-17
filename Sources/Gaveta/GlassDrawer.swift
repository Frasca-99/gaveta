import AppKit
import SwiftUI

/// What a card shows besides its picture.
struct CardState {
    var hovered = false
    var selected = false
    /// Something is selected, so every card shows its circle.
    var selecting = false
    var copied = false
    var dragging = false
    /// Flying in or being thrown out: the card keeps its place unseen.
    var hidden = false
}

/// The drawer as a pane of glass: it takes on whatever is behind it, so it
/// sits lighter over the screen than the oak and felt. Shut, it is a small
/// capsule against the edge; opening, the capsule grows into the drawer.
/// The cards stand exactly where the card catalog stands them, so the
/// pointer, the flights and the drags work the same in both.
struct GlassDrawerView: View {
    @ObservedObject var drawer: Drawer

    static let radius: CGFloat = 26
    /// The drawer shut: a capsule the drawer grows out of.
    static let capsule = CGSize(width: 52, height: 128)

    var body: some View {
        GeometryReader { geo in
            let maximum = geo.size.height - DrawerLayout.shadowRoom * 2
            let placement = DrawerLayout.placement(for: drawer, maximum: maximum)
            let out = drawer.isOpen || drawer.peeking
            let pane = out
                ? CGSize(width: DrawerLayout.drawerWidth, height: placement.height)
                : CGSize(width: Self.capsule.width, height: min(Self.capsule.height, placement.height))
            let shape = UnevenRoundedRectangle(topLeadingRadius: leading, bottomLeadingRadius: leading,
                                               bottomTrailingRadius: Self.radius, topTrailingRadius: Self.radius,
                                               style: .continuous)
            ZStack(alignment: .trailing) {
                GlassPane(shape: shape, cornerRadius: leading)
                    .frame(width: pane.width, height: pane.height)
                // The system draws the glass behind the window's own pixels,
                // which stay clear there, and macOS lets a click on clear
                // pixels through to the app behind: a click on bare glass (the
                // grip's strip, between cards) went past the drawer and closed
                // it. A tint too faint to see makes the glass hold its clicks.
                shape.fill(Color.black.opacity(0.015))
                    .frame(width: pane.width, height: pane.height)
                content(maximum: maximum)
                    .frame(width: DrawerLayout.drawerWidth, height: placement.height)
                    .mask(alignment: .trailing) {
                        shape.frame(width: pane.width, height: pane.height)
                    }
                    .opacity(out ? 1 : 0)
                    .allowsHitTesting(out)
                capsuleLabel
                    .frame(width: Self.capsule.width, height: Self.capsule.height)
                    .opacity(out ? 0 : 1)
            }
            .frame(width: DrawerLayout.drawerWidth, height: placement.height, alignment: .trailing)
            .keyframeAnimator(initialValue: CGFloat(0), trigger: drawer.arrivals) { content, nudge in
                content.offset(x: nudge)
            } keyframes: { _ in
                // A card landing gives the glass a soft push.
                KeyframeTrack {
                    CubicKeyframe(-4, duration: 0.12)
                    CubicKeyframe(1, duration: 0.14)
                    CubicKeyframe(0, duration: 0.18)
                }
            }
            .offset(x: slide)
            .padding(.top, DrawerLayout.shadowRoom + placement.top)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topTrailing)
        }
        // A little looser than the oak drawer: the glass settles like a drop.
        .animation(.spring(response: 0.44, dampingFraction: 0.76), value: drawer.isOpen)
        .animation(.spring(response: 0.46, dampingFraction: 0.8), value: drawer.peeking)
        // Quick enough to keep up with the pointer running down the stack.
        .animation(.spring(response: 0.24, dampingFraction: 0.86), value: drawer.hovered)
        .animation(.spring(response: 0.3, dampingFraction: 0.88), value: drawer.pins.count)
    }

    /// The left corners, the ones the grip pulls: stretched past the
    /// widest the glass goes taut and they tighten nearly square; squeezed
    /// past the narrowest they round out. The right ones, against the edge
    /// of the screen, stay as they are.
    private var leading: CGFloat {
        let stretch = drawer.stretch
        return stretch >= 0 ? max(5, Self.radius - stretch * 0.6) : min(38, Self.radius - stretch * 0.3)
    }

    /// Open, out by a crack, or the capsule just past the edge.
    private var slide: CGFloat {
        if drawer.isOpen { return 0 }
        if drawer.peeking { return DrawerLayout.drawerWidth - DrawerLayout.peekWidth }
        return Self.capsule.width + 24
    }

    private func content(maximum: CGFloat) -> some View {
        HStack(spacing: 0) {
            spine
            VStack(spacing: 0) {
                Color.clear.frame(height: DrawerLayout.rail)
                VStack(spacing: 0) {
                    if drawer.pins.isEmpty {
                        emptyState
                    } else {
                        StackView(drawer: drawer, maximum: maximum)
                        footer
                    }
                }
                .frame(maxHeight: .infinity)
                Color.clear.frame(height: DrawerLayout.rail)
            }
            .frame(width: DrawerLayout.boxWidth)
        }
    }

    /// Where the oak front stands: only how many there are, and the grip.
    private var spine: some View {
        VStack(spacing: 14) {
            Text("\(drawer.pins.count)")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
            ResizeGrip(drawer: drawer)
        }
        .frame(width: DrawerLayout.frontWidth)
        .frame(maxHeight: .infinity)
        .overlay(alignment: .trailing) {
            Rectangle().fill(.primary.opacity(0.08)).frame(width: 1).padding(.vertical, 22)
        }
    }

    /// What the capsule says while it is a capsule.
    private var capsuleLabel: some View {
        Text("\(drawer.pins.count)")
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.secondary)
        .allowsHitTesting(false)
    }

    /// The selection bar, the same choices as the oak drawer's.
    private var footer: some View {
        let count = drawer.selection.count
        let total = drawer.pins.count
        return HStack(spacing: 7) {
            if count == 0 {
                if total > 1 {
                    GlassBarButton(title: "Selecionar todos", systemImage: "checkmark.circle") { drawer.selectAll() }
                    Spacer()
                    Text("ou ⌘-clique").font(.system(size: 11)).lineLimit(1).foregroundStyle(.secondary)
                } else {
                    Text("Clique para copiar").font(.system(size: 11)).foregroundStyle(.secondary)
                    Spacer()
                }
            } else {
                Text("\(count) de \(total)")
                    .font(.system(size: 12, weight: .semibold))
                    .monospacedDigit()
                Spacer()
                if count < total {
                    GlassBarButton(title: "Todos", systemImage: "checkmark.circle") { drawer.selectAll() }
                }
                GlassBarButton(title: count == 1 ? "Copiar" : "Copiar todos", systemImage: "doc.on.doc", main: true) {
                    drawer.copySelection()
                }
                GlassBarButton(title: nil, systemImage: "xmark") { drawer.clearSelection() }
                    .help("Limpar seleção")
            }
        }
        .padding(.leading, 16)
        .padding(.trailing, 12)
        .frame(height: DrawerLayout.footerHeight)
        .overlay(alignment: .top) {
            Rectangle().fill(.primary.opacity(0.08)).frame(height: 1).padding(.horizontal, 14)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "tray")
                .font(.system(size: 26, weight: .light))
                .foregroundStyle(.secondary)
            Text("Gaveta vazia").font(.system(size: 14, weight: .semibold))
            Text("Tire um print com ⌘⇧4 e ele cai aqui.")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// One capture as a plain card on the glass: the whole picture and what it
/// is, with when it was taken beside the words instead of on a tab.
struct GlassCardView: View {
    let pin: Pin
    /// How much of the card shows above the one in front of it.
    let reveal: CGFloat
    var state = CardState()
    /// The drawer's width this card was laid out for. Its layout reads the
    /// width from DrawerLayout, which SwiftUI does not watch: as an input, a
    /// new width redraws every card, even the bands nobody touched.
    var width = DrawerLayout.boxWidth

    static let radius: CGFloat = 12

    /// In the whole layout the picture stands in the middle of its slot, so
    /// a wide capture leaves even room above and below it instead of a blank
    /// under the words; in a band it keeps to the top, where the band shows.
    static func photoTop(_ photo: CGSize, slot: CGFloat?) -> CGFloat {
        guard let slot else { return CardStack.border }
        return CardStack.border + ((slot - photo.height) / 2).rounded()
    }

    /// The words in the whole layout, just under the picture's slot.
    static func captionTop(slot: CGFloat) -> CGFloat { CardStack.border + slot + 6 }

    var body: some View {
        let slot = CardStack.slot(for: reveal)
        let photo = CardStack.photoSize(for: pin.thumbnail.size, reveal: reveal)
        let slotWidth = slot == nil ? CardStack.bandPhotoWidth : CardStack.photoWidth
        let top = Self.photoTop(photo, slot: slot)
        let shape = RoundedRectangle(cornerRadius: Self.radius, style: .continuous)
        ZStack(alignment: .topLeading) {
            // The shadow comes from the card's shape alone: cheap to draw as cards move.
            shape.fill(Color(nsColor: .controlBackgroundColor))
                .shadow(color: .black.opacity(0.16), radius: 10, y: -2)
            picture(size: photo)
                .offset(x: CardStack.border + (slotWidth - photo.width) / 2, y: top)
            caption(slot: slot)
        }
        .frame(width: CardStack.cardWidth, height: CardStack.cardHeight, alignment: .topLeading)
        .overlay(shape.strokeBorder(.primary.opacity(0.08), lineWidth: 0.5))
        .overlay {
            if state.selected { shape.strokeBorder(Color.accentColor, lineWidth: 2) }
        }
        .overlay(alignment: .topLeading) {
            if state.hovered || state.selecting || state.selected {
                SelectCircle(selected: state.selected)
                    .padding(14)
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            }
        }
        .overlay(alignment: .topTrailing) {
            if state.hovered {
                CloseMark()
                    .padding(14)
                    .transition(.opacity)
            }
        }
        .overlay(alignment: .topLeading) {
            if state.copied {
                CopiedBadge().position(x: CardStack.border + slotWidth / 2, y: top + photo.height / 2)
            }
        }
        .scaleEffect(state.hovered && !state.dragging ? 1.012 : 1, anchor: .bottom)
        .opacity(state.hidden ? 0 : state.dragging ? 0.45 : 1)
        .animation(.easeOut(duration: 0.15), value: state.hovered)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: state.copied)
    }

    private func picture(size: CGSize) -> some View {
        Image(nsImage: pin.thumbnail)
            .resizable()
            .interpolation(.high)
            .frame(width: size.width, height: size.height)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(.black.opacity(0.08), lineWidth: 0.5))
            .overlay {
                if pin.isVideo {
                    let side = min(36, size.height * 0.6)
                    Image(systemName: "play.fill")
                        .font(.system(size: side * 0.4, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: side, height: side)
                        .background(Circle().fill(Color.black.opacity(0.55)))
                }
            }
    }

    /// Under the picture in the whole layout, the age at the right; beside
    /// it in a band, one short line each: what it is, its size, its age.
    /// Always within the card, at any width of the drawer: what does not fit
    /// is cut. Each stands at its own place, so the one fading out as a card
    /// turns from whole to band, or back, does not slide past the edge.
    private func caption(slot: CGFloat?) -> some View {
        TimelineView(.periodic(from: .now, by: 30)) { context in
            let age = RelativeTime.string(for: pin.date, now: context.date)
            ZStack(alignment: .topLeading) {
                if let slot {
                    HStack(spacing: 8) {
                        Text("\(pin.kind) · \(pin.detail)")
                            .truncationMode(.tail)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        // The age keeps its room; the words before it give way.
                        Text(age).layoutPriority(1)
                    }
                    .frame(width: CardStack.photoWidth - 4)
                    .offset(x: CardStack.border + 2, y: Self.captionTop(slot: slot))
                    .transition(.opacity)
                } else {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pin.kind).fontWeight(.medium).foregroundStyle(.primary)
                        Text(pin.detail)
                        Text(age)
                    }
                    .truncationMode(.tail)
                    .frame(width: CardStack.bandWordsWidth, alignment: .leading)
                    .offset(x: CardStack.bandWordsX, y: CardStack.border + 3)
                    .transition(.opacity)
                }
            }
        }
        .font(.system(size: 11))
        .monospacedDigit()
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
}

/// Pressed on a card that was just copied.
struct CopiedBadge: View {
    var body: some View {
        Label("Copiado", systemImage: "checkmark")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Capsule().fill(.black.opacity(0.72)))
            .fixedSize()
            .transition(.scale(scale: 0.8).combined(with: .opacity))
    }
}

/// A small pill on the glass that works on the first click, though the
/// drawer never becomes the key window.
struct GlassBarButton: View {
    let title: String?
    let systemImage: String
    var main = false
    let action: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: systemImage).font(.system(size: 10, weight: .semibold))
            if let title { Text(title).font(.system(size: 11, weight: .medium)) }
        }
        .foregroundStyle(main ? Color.white : Color.primary)
        .padding(.horizontal, title == nil ? 7 : 10)
        .frame(height: 24)
        .background(Capsule().fill(main ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(Color.primary.opacity(0.08))))
        .fixedSize()
        .overlay(FirstClick(action: action))
    }
}

/// The glass itself: Liquid Glass from macOS 26, drawn by SwiftUI so it
/// grows and shrinks with the drawer's own animation; before that, the
/// system's frosted material.
struct GlassPane<S: Shape>: View {
    let shape: S
    /// For the frosted material, which takes one radius for every corner.
    var cornerRadius: CGFloat

    var body: some View {
        if #available(macOS 26, *) {
            Color.clear.glassEffect(.regular, in: shape)
        } else {
            FrostedPane(cornerRadius: cornerRadius)
        }
    }
}

/// The frosted material behind the window, for macOS 14 and 15.
struct FrostedPane: NSViewRepresentable {
    var cornerRadius: CGFloat

    func makeNSView(context: Context) -> NSVisualEffectView {
        let frosted = NSVisualEffectView()
        frosted.material = .popover
        frosted.blendingMode = .behindWindow
        frosted.state = .active
        frosted.wantsLayer = true
        frosted.layer?.cornerCurve = .continuous
        frosted.layer?.masksToBounds = true
        return frosted
    }

    func updateNSView(_ view: NSVisualEffectView, context: Context) {
        view.layer?.cornerRadius = cornerRadius
    }
}
