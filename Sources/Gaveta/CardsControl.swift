import AppKit
import SwiftUI

/// The AppKit layer over the whole stack of cards: hover, clicks, the
/// context menu and dragging captures out as real files. One layer for all
/// of them, because the cards overlap: which card a point belongs to comes
/// from the stack's layout, front to back, not from whichever view happens
/// to be on top mid-animation.
struct CardsControl: NSViewRepresentable {
    let drawer: Drawer
    /// Back to front, as the cards stand.
    let cards: [Pin]
    let stack: CardStack

    func makeNSView(context: Context) -> CardsControlView {
        let view = CardsControlView()
        updateNSView(view, context: context)
        return view
    }

    func updateNSView(_ view: CardsControlView, context: Context) {
        view.drawer = drawer
        view.cards = cards
        view.stack = stack
        drawer.frameOnScreen = { [weak view] id in view?.screenFrame(of: id) }
        drawer.onRemoved = { [weak view] in view?.refreshSoon() }
    }
}

final class CardsControlView: NSView, NSDraggingSource {
    weak var drawer: Drawer?
    var cards: [Pin] = []
    var stack = CardStack(count: 0, hovered: nil, room: 0)

    private var pressed: (point: NSPoint, pin: Pin)?
    private var dragStarted = false
    /// The captures in the drag that is under way.
    private var dragged: [UUID] = []
    /// Fires Markup if the press is held without moving.
    private var holdTimer: Timer?
    /// The press already did something (Markup or Quick Look), so letting
    /// go copies nothing.
    private var pressUsed = false
    private var trackingArea: NSTrackingArea?
    /// Closes the open card a moment after the pointer left every card.
    private var letGo: Timer?

    /// Long enough not to fire on a slow click, short enough to feel deliberate.
    private let holdDelay: TimeInterval = 0.5

    override var isFlipped: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let trackingArea { removeTrackingArea(trackingArea) }
        let area = NSTrackingArea(rect: .zero,
                                  options: [.mouseMoved, .mouseEnteredAndExited, .activeAlways, .inVisibleRect],
                                  owner: self, userInfo: nil)
        addTrackingArea(area)
        trackingArea = area
    }

    // MARK: Finding the card

    private func hit(_ event: NSEvent) -> (pin: Pin, part: CardStack.Part)? {
        hit(at: convert(event.locationInWindow, from: nil))
    }

    private func hit(at point: NSPoint, wide: Bool = false) -> (pin: Pin, part: CardStack.Part)? {
        guard let drawer else { return nil }
        guard let found = stack.hit(point, tabs: drawer.style == .catalog, wide: wide, shift: { self.shift(of: $0, in: drawer) }),
              found.index < cards.count else { return nil }
        return (cards[found.index], found.part)
    }

    private func shift(of index: Int, in drawer: Drawer) -> CGFloat {
        guard index < cards.count else { return 0 }
        let id = cards[index].id
        return CardStack.shift(hovered: drawer.hovered == id, selected: drawer.selection.contains(id))
    }

    /// A card's place on screen, scrolled where it is now.
    func screenFrame(of id: UUID) -> CGRect? {
        guard let drawer, drawer.isOpen, let window, window.isVisible,
              let index = cards.firstIndex(where: { $0.id == id }) else { return nil }
        let rect = stack.cardRect(index, shift: shift(of: index, in: drawer))
        return window.convertToScreen(convert(rect, to: nil))
    }

    // MARK: Hover

    override func mouseMoved(with event: NSEvent) { updateHover(event) }
    override func mouseEntered(with event: NSEvent) { updateHover(event) }

    override func mouseExited(with event: NSEvent) {
        guard let drawer, drawer.dragging.isEmpty, drawer.hovered != nil else { return }
        letGoSoon()
    }

    override func scrollWheel(with event: NSEvent) {
        super.scrollWheel(with: event)
        updateHover(event)
    }

    private func updateHover(_ event: NSEvent) {
        updateHover(at: convert(event.locationInWindow, from: nil))
    }

    private func updateHover(at point: NSPoint) {
        // A drag out, or Quick Look opening under a force click, keeps the
        // mouse-up from ever reaching this view. With the button no longer
        // down, that press is over: without this, the card under the pointer
        // would not light up (nor show its X) until the next click.
        if pressed != nil, NSEvent.pressedMouseButtons & 1 == 0 { endPress() }
        guard let drawer, drawer.dragging.isEmpty, pressed == nil else { return }
        // The whole row is the card's: the open card slides a little left,
        // and the pointer reaching for its X at the right must not fall off it.
        if let id = hit(at: point, wide: true)?.pin.id {
            letGo?.invalidate()
            letGo = nil
            if drawer.hovered != id { drawer.hovered = id }
            return
        }
        if drawer.hovered != nil { letGoSoon() }
    }

    /// On no card, between cards or past the stack's edge: the open card
    /// waits a moment before it closes, in case the pointer was only passing
    /// on its way back to it. Another card takes over at once.
    private func letGoSoon() {
        guard letGo == nil else { return }
        let timer = Timer(timeInterval: 0.3, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.letGo = nil
                guard let drawer = self.drawer, drawer.isOpen, drawer.dragging.isEmpty, self.pressed == nil,
                      let window = self.window else { return }
                let point = self.convert(window.mouseLocationOutsideOfEventStream, from: nil)
                let id = self.bounds.contains(point) ? self.hit(at: point, wide: true)?.pin.id : nil
                if drawer.hovered != id { drawer.hovered = id }
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        letGo = timer
    }

    /// Once the stack has been laid out again, after a card left it.
    func refreshSoon() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) { [weak self] in self?.refreshHover() }
    }

    /// Hover from where the pointer is now, for when it has not moved since.
    private func refreshHover() {
        guard let window else { return }
        updateHover(at: convert(window.mouseLocationOutsideOfEventStream, from: nil))
    }

    private func endPress() {
        pressed = nil
        dragStarted = false
        pressUsed = false
        holdTimer?.invalidate()
    }

    // MARK: Clicks

    override func mouseDown(with event: NSEvent) {
        guard let drawer, let found = hit(event) else { return }
        let (pin, part) = found
        let modifiers = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        let showsMarks = drawer.hovered == pin.id
        if part == .close && showsMarks {
            drawer.discard(pin.id, thrown: true)
        } else if (part == .dot && (showsMarks || !drawer.selection.isEmpty)) || modifiers.contains(.command) {
            drawer.toggleSelection(pin.id)
        } else if modifiers.contains(.shift) {
            drawer.extendSelection(to: pin.id)
        } else if event.clickCount == 2 {
            drawer.open(pin.id)
        } else {
            pressed = (convert(event.locationInWindow, from: nil), pin)
            dragStarted = false
            pressUsed = false
            startHold()
        }
    }

    private func startHold() {
        holdTimer?.invalidate()
        let timer = Timer(timeInterval: holdDelay, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, let pin = self.pressed?.pin, !self.dragStarted, !self.pressUsed else { return }
                self.pressUsed = true
                self.drawer?.markup(pin.id)
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        holdTimer = timer
    }

    /// A force click on a trackpad opens Quick Look, as in Finder.
    override func pressureChange(with event: NSEvent) {
        guard event.stage == 2, let pin = pressed?.pin, !dragStarted, !pressUsed else { return }
        pressUsed = true
        holdTimer?.invalidate()
        drawer?.quickLook(pin.id)
    }

    override func mouseDragged(with event: NSEvent) {
        guard let (start, pin) = pressed.map({ ($0.point, $0.pin) }), !dragStarted, !pressUsed else { return }
        let point = convert(event.locationInWindow, from: nil)
        guard hypot(point.x - start.x, point.y - start.y) > 4 else { return }
        dragStarted = true
        holdTimer?.invalidate()

        // A selected card brings the rest of the selection with it, fanned
        // out a little under the pointer.
        let pins = drawer?.dragSet(from: pin.id) ?? [pin]
        let items = pins.enumerated().map { index, pin in
            let item = NSDraggingItem(pasteboardWriter: pin.url as NSURL)
            let offset = CGFloat(index) * 6
            let frame = dragFrame(around: NSPoint(x: point.x + offset, y: point.y + offset), for: pin.thumbnail.size)
            item.setDraggingFrame(frame, contents: pin.thumbnail)
            return item
        }
        dragged = pins.map(\.id)
        drawer?.dragging = Set(dragged)
        let session = beginDraggingSession(with: items, event: event, source: self)
        session.animatesToStartingPositionsOnCancelOrFail = true
        if items.count > 1 { session.draggingFormation = .stack }
    }

    override func mouseUp(with event: NSEvent) {
        defer { pressed = nil }
        holdTimer?.invalidate()
        guard let pin = pressed?.pin, !dragStarted, !pressUsed else { return }
        drawer?.copy(pin.id)
    }

    override func menu(for event: NSEvent) -> NSMenu? {
        guard let drawer, let pin = hit(event)?.pin else { return nil }
        let menu = NSMenu()
        let count = drawer.selection.count
        if count > 1, drawer.selection.contains(pin.id) {
            menu.addItem(ActionMenuItem("Copiar \(count) prints") { drawer.copySelection() })
            menu.addItem(ActionMenuItem("Tirar \(count) prints da gaveta") { drawer.discardSelection(thrown: true) })
            menu.addItem(.separator())
            if count < drawer.pins.count {
                menu.addItem(ActionMenuItem("Selecionar todos") { drawer.selectAll() })
            }
            menu.addItem(ActionMenuItem("Limpar seleção") { drawer.clearSelection() })
            return menu
        }
        menu.addItem(ActionMenuItem("Copiar") { drawer.copy(pin.id) })
        menu.addItem(ActionMenuItem("Abrir") { drawer.open(pin.id) })
        if !pin.isVideo {
            menu.addItem(ActionMenuItem("Marcação") { drawer.markup(pin.id) })
        }
        menu.addItem(ActionMenuItem("Visualização Rápida") { drawer.quickLook(pin.id) })
        menu.addItem(ActionMenuItem("Mostrar no Finder") { drawer.showInFinder(pin.id) })
        if drawer.isInGavetaFolder(pin) {
            menu.addItem(ActionMenuItem("Guardar na Mesa") { drawer.keepOnDesktop(pin.id) })
        }
        menu.addItem(.separator())
        menu.addItem(ActionMenuItem(drawer.selection.contains(pin.id) ? "Tirar da seleção" : "Selecionar") {
            drawer.toggleSelection(pin.id)
        })
        if drawer.pins.count > 1 {
            menu.addItem(ActionMenuItem("Selecionar todos") { drawer.selectAll() })
        }
        menu.addItem(ActionMenuItem("Tirar da gaveta") { drawer.discard(pin.id, thrown: true) })
        return menu
    }

    /// The capture at a comfortable size, centred under the pointer.
    private func dragFrame(around point: NSPoint, for size: NSSize) -> NSRect {
        let box = NSSize(width: 180, height: 120)
        let scale = min(box.width / max(size.width, 1), box.height / max(size.height, 1), 1)
        let fitted = NSSize(width: size.width * scale, height: size.height * scale)
        return NSRect(x: point.x - fitted.width / 2, y: point.y - fitted.height / 2,
                      width: fitted.width, height: fitted.height)
    }

    // MARK: NSDraggingSource

    func draggingSession(_ session: NSDraggingSession,
                         sourceOperationMaskFor context: NSDraggingContext) -> NSDragOperation {
        context == .outsideApplication ? [.copy, .move, .delete, .generic] : []
    }

    func draggingSession(_ session: NSDraggingSession, endedAt screenPoint: NSPoint, operation: NSDragOperation) {
        drawer?.dragEnded(dragged, operation: operation)
        dragged = []
        endPress()
        refreshHover()
    }
}

/// A menu item that runs a closure.
final class ActionMenuItem: NSMenuItem {
    private let run: () -> Void

    init(_ title: String, key: String = "", action: @escaping () -> Void) {
        run = action
        super.init(title: title, action: #selector(runAction), keyEquivalent: key)
        target = self
    }

    @available(*, unavailable)
    required init(coder: NSCoder) { fatalError() }

    @objc private func runAction() { run() }
}
