import AppKit
import SwiftUI

/// A handle drawn as a short line that bends like an elastic band: its
/// middle, where it is held or pushed, goes ahead of its ends.
struct ElasticLine: Shape {
    /// How far the middle stands off to the side, in points; positive is to
    /// the right.
    var bend: CGFloat

    var animatableData: CGFloat {
        get { bend }
        set { bend = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY + 2))
        // A quadratic curve passes halfway to its control point.
        path.addQuadCurve(to: CGPoint(x: rect.midX, y: rect.maxY - 2),
                          control: CGPoint(x: rect.midX + bend * 2, y: rect.midY))
        return path
    }
}

// MARK: The glass drawer's grip

/// The glass drawer's grip: dragged sideways it makes the drawer wider, for
/// bigger cards, or narrower again. It bends towards where it is pulled, the
/// faster the more, and straightens with a wobble when the pull stops. A
/// double click puts the drawer back to its usual width.
struct ResizeGrip: View {
    @ObservedObject var drawer: Drawer
    @State private var bend: CGFloat = 0

    /// Kept small: the glass drawer is the quiet one.
    private static let most: CGFloat = 7
    /// Let go past a limit, the drawer comes back with a little bounce.
    static let springBack = Animation.spring(response: 0.42, dampingFraction: 0.48)

    /// How much the band bends: with the speed of the pull, and with the
    /// tension while the drawer is held past its limits.
    private func bend(speed: CGFloat) -> CGFloat {
        max(-Self.most, min(Self.most, speed / 70 - drawer.stretch / 5))
    }

    var body: some View {
        ElasticLine(bend: bend)
            .stroke(Color.primary.opacity(drawer.resizing ? 0.4 : 0.2), style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .frame(width: 26, height: 40)
            .contentShape(Rectangle())
            .overlay(GripControl(
                begin: {
                    drawer.resizing = true
                    return drawer.glassWidth
                },
                move: { width, stretch, speed in
                    drawer.glassWidth = width
                    drawer.stretch = stretch
                    bend = bend(speed: speed)
                },
                pause: { bend = bend(speed: 0) },
                end: {
                    drawer.resizing = false
                    Prefs.glassWidth = drawer.glassWidth
                    bend = 0
                    withAnimation(Self.springBack) { drawer.stretch = 0 }
                },
                reset: {
                    withAnimation(Self.springBack) { drawer.glassWidth = DrawerLayout.standardBoxWidth }
                    Prefs.glassWidth = DrawerLayout.standardBoxWidth
                }
            ))
            .animation(.spring(response: 0.22, dampingFraction: 0.4), value: bend)
            .help("Arraste para alargar a gaveta. Clique duplo volta ao normal.")
            .accessibilityHidden(true)
    }
}

/// Turns a drag on the grip into a width: measured on the screen, so the
/// drawer can move under the pointer as it grows. Works on the first click,
/// though the drawer never becomes the key window.
struct GripControl: NSViewRepresentable {
    /// The drag starts; returns the width it starts from.
    var begin: () -> CGFloat
    /// The width for where the pointer is, how far past a limit the drawer
    /// gives, and how fast the pointer goes (points a second, positive to the right).
    var move: (_ width: CGFloat, _ stretch: CGFloat, _ speed: CGFloat) -> Void
    /// The pointer stopped, still holding.
    var pause: () -> Void
    var end: () -> Void
    var reset: () -> Void

    func makeNSView(context: Context) -> GripView { GripView() }

    func updateNSView(_ view: GripView, context: Context) {
        view.begin = begin
        view.move = move
        view.pause = pause
        view.end = end
        view.reset = reset
    }

    final class GripView: NSView {
        var begin: (() -> CGFloat)?
        var move: ((CGFloat, CGFloat, CGFloat) -> Void)?
        var pause: (() -> Void)?
        var end: (() -> Void)?
        var reset: (() -> Void)?

        private var start: (x: CGFloat, width: CGFloat)?
        private var last: (x: CGFloat, time: TimeInterval) = (0, 0)
        private var stillTimer: Timer?
        private var tracking: NSTrackingArea?

        override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

        override func updateTrackingAreas() {
            super.updateTrackingAreas()
            if let tracking { removeTrackingArea(tracking) }
            let area = NSTrackingArea(rect: .zero, options: [.mouseEnteredAndExited, .cursorUpdate, .activeAlways, .inVisibleRect],
                                      owner: self, userInfo: nil)
            addTrackingArea(area)
            tracking = area
        }

        override func mouseEntered(with event: NSEvent) { NSCursor.resizeLeftRight.set() }
        override func cursorUpdate(with event: NSEvent) { NSCursor.resizeLeftRight.set() }
        override func mouseExited(with event: NSEvent) {
            if start == nil { NSCursor.arrow.set() }
        }

        override func mouseDown(with event: NSEvent) {
            if event.clickCount == 2 {
                reset?()
                return
            }
            guard let width = begin?() else { return }
            let x = NSEvent.mouseLocation.x
            start = (x, width)
            last = (x, event.timestamp)
        }

        override func mouseDragged(with event: NSEvent) {
            guard let start else { return }
            NSCursor.resizeLeftRight.set()
            let x = NSEvent.mouseLocation.x
            let speed = (x - last.x) / max(event.timestamp - last.time, 1.0 / 240)
            last = (x, event.timestamp)
            // The drawer stands against the right edge: pulling left widens it.
            let widest = DrawerLayout.widestBox(for: window?.screen)
            let narrowest = DrawerLayout.standardBoxWidth
            let wanted = start.width - (x - start.x)
            let width = min(widest, max(narrowest, wanted))
            // Past a limit it still gives, less and less: a rubber band.
            // Squeezed, it gives less: the cards narrow with the drawer.
            let stretch = Self.rubber(wanted - widest) - Self.rubber(narrowest - wanted, most: 24)
            move?(width.rounded(), stretch, speed)

            // No movement for a moment: the band goes slack.
            stillTimer?.invalidate()
            let timer = Timer(timeInterval: 0.08, repeats: false) { [weak self] _ in
                MainActor.assumeIsolated { self?.pause?() }
            }
            RunLoop.main.add(timer, forMode: .common)
            stillTimer = timer
        }

        /// How much a pull `beyond` a limit shows: all of it at first, then
        /// less and less, never more than `most` points.
        static func rubber(_ beyond: CGFloat, most: CGFloat = 44) -> CGFloat {
            guard beyond > 0 else { return 0 }
            return (1 - 1 / (beyond * 0.55 / most + 1)) * most
        }

        override func mouseUp(with event: NSEvent) {
            stillTimer?.invalidate()
            if start != nil { end?() }
            start = nil
            if !bounds.contains(convert(event.locationInWindow, from: nil)) { NSCursor.arrow.set() }
        }
    }
}

// MARK: The handle at the edge of the screen

/// The handle at the edge of the screen. It shows up where the pointer rests
/// against the edge and bends towards it as the drawer is about to open, like
/// an elastic pulled taut; pushing on against the edge pulls it faster. Then
/// the drawer springs out. It is only drawn: clicks go straight through it.
@MainActor
final class EdgeHandle {
    private let model = EdgeHandleModel()
    private let window: NSPanel
    private static let size = NSSize(width: 40, height: 140)

    init() {
        window = NSPanel(contentRect: NSRect(origin: .zero, size: Self.size),
                         styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.ignoresMouseEvents = true
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        window.hidesOnDeactivate = false
        let host = NSHostingView(rootView: EdgeHandleView(model: model))
        host.sizingOptions = []
        window.contentView = host
    }

    var isShown: Bool { model.shown }

    func show(at point: NSPoint, on screen: NSScreen, style: DrawerStyle) {
        model.style = style
        model.tension = 0
        follow(point.y, on: screen)
        window.orderFrontRegardless()
        model.shown = true
    }

    /// The pointer slides along the edge: the handle goes with it.
    func follow(_ y: CGFloat, on screen: NSScreen) {
        let half = Self.size.height / 2
        let visible = screen.visibleFrame
        let centre = min(visible.maxY - half, max(visible.minY + half, y))
        let frame = NSRect(x: screen.frame.maxX - Self.size.width, y: centre - half,
                           width: Self.size.width, height: Self.size.height)
        if window.frame != frame { window.setFrame(frame, display: false) }
    }

    /// From 0, slack, to 1, about to open.
    func pull(_ tension: CGFloat) {
        model.tension = min(1, max(0, tension))
    }

    /// The drawer opened, or the pointer left: the band snaps back and goes.
    func letGo() {
        guard model.shown else { return }
        model.shown = false
        model.tension = 0
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            guard let self, !self.model.shown else { return }
            self.window.orderOut(nil)
        }
    }
}

@MainActor
final class EdgeHandleModel: ObservableObject {
    @Published var shown = false
    @Published var tension: CGFloat = 0
    @Published var style: DrawerStyle = .catalog
}

/// A brass pull for the card catalog, a light band for the glass drawer;
/// the brass one bends more, the glass one stays quiet.
struct EdgeHandleView: View {
    @ObservedObject var model: EdgeHandleModel

    var body: some View {
        let glass = model.style == .glass
        let most: CGFloat = glass ? 7 : 11
        ElasticLine(bend: model.tension * most)
            .stroke(glass ? AnyShapeStyle(Color.white) : AnyShapeStyle(Palette.brassBar),
                    style: StrokeStyle(lineWidth: glass ? 5 : 7, lineCap: .round))
            .shadow(color: .black.opacity(glass ? 0.3 : 0.45), radius: glass ? 2.5 : 2, x: -0.5, y: 1)
            .frame(width: 26, height: glass ? 64 : 72)
            .padding(.trailing, 6)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
            .offset(x: model.shown ? 0 : 16)
            .opacity(model.shown ? 1 : 0)
            .animation(.spring(response: 0.2, dampingFraction: 0.38), value: model.tension)
            .animation(.easeOut(duration: 0.16), value: model.shown)
    }
}
