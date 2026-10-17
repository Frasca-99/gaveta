import AppKit

/// Decides when the drawer is open: resting the pointer against the right
/// edge of the screen, the shortcut or the menu, or a new capture peeking in.
@MainActor
final class EdgeTrigger {
    private let panel: DrawerPanel
    private let drawer: Drawer
    private var monitors: [Any] = []
    private var timer: Timer?

    private var dwellSince: Date?
    /// How far the mouse has pushed on against the edge, past where the
    /// pointer stops.
    private var pushed: CGFloat = 0
    /// The handle at the edge, taut as the drawer is about to open.
    private let handle = EdgeHandle()
    private var awaySince: Date?
    private var peekUntil: Date?
    /// Opened on purpose: stays until the pointer has visited and left.
    private var pinned = false
    private var visited = false

    /// How long the pointer rests on the edge before the drawer opens.
    private let dwell: TimeInterval = 0.26
    /// Pushing this far on against the edge opens it at once.
    private let pushToOpen: CGFloat = 36
    /// How long the pointer is away before the drawer closes.
    private let grace: TimeInterval = 0.5

    var onScreenChange: ((NSScreen) -> Void)?

    init(panel: DrawerPanel, drawer: Drawer) {
        self.panel = panel
        self.drawer = drawer
        // A click anywhere else closes it, as with any popover.
        monitors.append(NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.drawer.dragging.isEmpty else { return }
                // A click that went through the drawer to the app behind was
                // still meant for the drawer.
                if self.drawer.isOpen, self.panel.drawerRect(for: self.drawer).contains(NSEvent.mouseLocation) { return }
                self.close()
            }
        } as Any)
        // The pointer stops at the edge, but the mouse still reports moving:
        // pushing on is what pulls the handle taut.
        monitors.append(NSEvent.addGlobalMonitorForEvents(matching: [.mouseMoved]) { [weak self] event in
            MainActor.assumeIsolated { self?.pushedOn(event.deltaX) }
        } as Any)
        let timer = Timer(timeInterval: 0.06, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.tick() }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    // MARK: Opening and closing

    func toggle() {
        drawer.isOpen ? close() : open(pinned: true)
    }

    /// A new capture: the drawer comes out by a crack, the capture slides
    /// in, and it goes back. Resting the pointer on the crack opens it.
    func peek() {
        guard !drawer.isOpen else { return }
        handle.letGo()
        dwellSince = nil
        if !drawer.peeking {
            if let screen = Self.screenUnderPointer() {
                panel.place(on: screen)
                onScreenChange?(screen)
            }
            panel.orderFrontRegardless()
            drawer.peeking = true
        }
        peekUntil = Date().addingTimeInterval(1.8)
    }

    private func endPeek() {
        drawer.peeking = false
        peekUntil = nil
        orderOutWhenShut()
    }

    func open(pinned: Bool = false, on screen: NSScreen? = nil) {
        handle.letGo()
        dwellSince = nil
        pushed = 0
        self.pinned = self.pinned || pinned
        visited = false
        awaySince = nil
        guard !drawer.isOpen else { return }
        // Already out by a crack: it opens where it is.
        if !drawer.peeking, let screen = screen ?? Self.screenUnderPointer() {
            panel.place(on: screen)
            onScreenChange?(screen)
        }
        panel.orderFrontRegardless()
        drawer.peeking = false
        peekUntil = nil
        drawer.isOpen = true
    }

    func close() {
        guard drawer.isOpen || drawer.peeking else { return }
        drawer.isOpen = false
        drawer.peeking = false
        drawer.hovered = nil
        drawer.clearSelection()
        pinned = false
        peekUntil = nil
        orderOutWhenShut()
    }

    /// Takes the window away once the drawer has slid back in.
    private func orderOutWhenShut() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { [weak self] in
            guard let self, !self.drawer.isOpen, !self.drawer.peeking else { return }
            self.panel.orderOut(nil)
        }
    }

    /// An empty drawer closes, unless it was opened on purpose.
    func drawerChanged() {
        if drawer.pins.isEmpty && !pinned { close() }
    }

    // MARK: Pointer

    private func tick() {
        let mouse = NSEvent.mouseLocation
        let now = Date()

        if drawer.peeking {
            if panel.peekRect(for: drawer).insetBy(dx: -4, dy: -4).contains(mouse) {
                open()
                visited = true
            } else if let peekUntil, now >= peekUntil {
                endPeek()
            }
            return
        }

        guard drawer.isOpen else {
            guard !drawer.pins.isEmpty, let screen = Self.screenUnderPointer(), Self.isOnRightEdge(mouse, of: screen) else {
                if dwellSince != nil { handle.letGo() }
                dwellSince = nil
                pushed = 0
                return
            }
            if dwellSince == nil {
                dwellSince = now
                pushed = 0
                handle.show(at: mouse, on: screen, style: drawer.style)
            } else {
                handle.follow(mouse.y, on: screen)
            }
            pull(now: now)
            return
        }

        if !drawer.dragging.isEmpty || drawer.resizing { return }
        if panel.drawerRect(for: drawer).insetBy(dx: -24, dy: -24).contains(mouse) {
            visited = true
            awaySince = nil
            return
        }
        if pinned && !visited { return }
        if let since = awaySince {
            if now.timeIntervalSince(since) >= grace { close() }
        } else {
            awaySince = now
        }
    }

    /// The mouse moved on with the pointer held at the edge.
    private func pushedOn(_ delta: CGFloat) {
        guard delta > 0, dwellSince != nil, !drawer.isOpen, !drawer.peeking else { return }
        pushed += delta
        pull()
    }

    /// How taut the handle is: resting on the edge pulls it over the dwell,
    /// pushing on pulls it faster. Taut, the drawer opens.
    private func pull(now: Date = Date()) {
        guard let since = dwellSince else { return }
        let tension = now.timeIntervalSince(since) / dwell + Double(pushed / pushToOpen)
        guard tension >= 1 else {
            handle.pull(CGFloat(tension))
            return
        }
        open(on: Self.screenUnderPointer())
    }

    // MARK: Screens

    static func screenUnderPointer() -> NSScreen? {
        let mouse = NSEvent.mouseLocation
        return NSScreen.screens.first { NSMouseInRect(mouse, $0.frame, false) } ?? NSScreen.main
    }

    /// Against the right edge, within the drawer's height, and only where
    /// the edge is real: a second display to the right makes it a crossing.
    static func isOnRightEdge(_ point: NSPoint, of screen: NSScreen) -> Bool {
        guard point.x >= screen.frame.maxX - 2 else { return false }
        let beyond = NSPoint(x: screen.frame.maxX + 1, y: point.y)
        guard !NSScreen.screens.contains(where: { NSMouseInRect(beyond, $0.frame, false) }) else { return false }
        let visible = screen.visibleFrame
        let height = DrawerLayout.maxHeight(for: visible.height)
        return abs(point.y - visible.midY) <= height / 2
    }
}
