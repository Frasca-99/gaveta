import AppKit
import SwiftUI

/// A transparent window on the right edge of the screen that the drawer
/// slides out of. It floats over every app and Space, never takes focus, and
/// stays out of full screen Spaces.
final class DrawerPanel: NSPanel {
    init(rootView: some View) {
        super.init(contentRect: NSRect(x: 0, y: 0, width: DrawerLayout.windowWidth, height: 600),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        hidesOnDeactivate = false
        isMovable = false
        acceptsMouseMovedEvents = true

        let host = NSHostingView(rootView: rootView)
        host.sizingOptions = []
        contentView = host
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    /// Against the right edge, centred in the space the menu bar and Dock
    /// leave, as tall as the drawer can ever get.
    func place(on screen: NSScreen) {
        let visible = screen.visibleFrame
        let height = DrawerLayout.maxHeight(for: visible.height) + DrawerLayout.shadowRoom * 2
        let frame = NSRect(x: visible.maxX - DrawerLayout.windowWidth, y: visible.midY - height / 2,
                           width: DrawerLayout.windowWidth, height: height)
        if self.frame != frame { setFrame(frame, display: true) }
    }

    /// The open drawer on screen, as the view lays it out.
    func drawerRect(for drawer: Drawer) -> NSRect {
        let maximum = frame.height - DrawerLayout.shadowRoom * 2
        let placement = DrawerLayout.placement(for: drawer, maximum: maximum)
        let top = frame.maxY - DrawerLayout.shadowRoom - placement.top
        return NSRect(x: frame.maxX - DrawerLayout.drawerWidth, y: top - placement.height,
                      width: DrawerLayout.drawerWidth, height: placement.height)
    }

    /// Where the front card stands on screen, as the view lays it out once
    /// the drawer has slid open or out by a crack.
    func frontCardRect(for drawer: Drawer) -> NSRect? {
        let count = drawer.pins.count
        guard count > 0 else { return nil }
        let maximum = frame.height - DrawerLayout.shadowRoom * 2
        let placement = DrawerLayout.placement(for: drawer, maximum: maximum)
        let stack = CardStack(count: count, hovered: drawer.hoveredIndex, room: DrawerLayout.stackRoom(maximum: maximum))
        // When the cards run taller than the drawer, it is scrolled to the front.
        let visible = placement.height - DrawerLayout.rail * 2 - DrawerLayout.footerHeight
        let top = min(stack.top(count - 1), visible - CardStack.cardHeight - CardStack.bottomInset)
        let slide = drawer.isOpen ? 0 : DrawerLayout.drawerWidth - DrawerLayout.peekWidth
        let x = frame.maxX - DrawerLayout.drawerWidth + slide + DrawerLayout.frontWidth + CardStack.leftInset
        let cardTop = frame.maxY - (DrawerLayout.shadowRoom + placement.top + DrawerLayout.rail + top)
        return NSRect(x: x, y: cardTop - CardStack.cardHeight, width: CardStack.cardWidth, height: CardStack.cardHeight)
    }

    /// The part that shows while a new capture peeks in.
    func peekRect(for drawer: Drawer) -> NSRect {
        var rect = drawerRect(for: drawer)
        rect.origin.x = frame.maxX - DrawerLayout.peekWidth
        rect.size.width = DrawerLayout.peekWidth
        return rect
    }
}
