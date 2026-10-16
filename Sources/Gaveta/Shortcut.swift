import AppKit
import Carbon.HIToolbox

/// The shortcut that opens and closes the drawer: ⌃⌥G unless changed.
struct Shortcut: Equatable {
    let keyCode: Int
    /// Carbon modifier flags, as the hot key API takes them.
    let modifiers: Int
    /// The key as the menu shows it: "G", "Espaço".
    let key: String

    static let standard = Shortcut(keyCode: kVK_ANSI_G, modifiers: controlKey | optionKey, key: "G")

    /// As macOS writes shortcuts: ⌃⌥⇧⌘ and the key.
    var label: String {
        var text = ""
        if modifiers & controlKey != 0 { text += "⌃" }
        if modifiers & optionKey != 0 { text += "⌥" }
        if modifiers & shiftKey != 0 { text += "⇧" }
        if modifiers & cmdKey != 0 { text += "⌘" }
        return text + key
    }

    /// For the menu item's key equivalent.
    var menuKey: String { key.count == 1 ? key.lowercased() : "" }
    var menuModifiers: NSEvent.ModifierFlags {
        var flags: NSEvent.ModifierFlags = []
        if modifiers & controlKey != 0 { flags.insert(.control) }
        if modifiers & optionKey != 0 { flags.insert(.option) }
        if modifiers & shiftKey != 0 { flags.insert(.shift) }
        if modifiers & cmdKey != 0 { flags.insert(.command) }
        return flags
    }

    /// From a key press, if it makes a usable global shortcut. It needs ⌘, ⌃
    /// or ⌥, so typing alone never sets it off.
    init?(event: NSEvent) {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        guard !flags.intersection([.command, .control, .option]).isEmpty else { return nil }
        var modifiers = 0
        if flags.contains(.control) { modifiers |= controlKey }
        if flags.contains(.option) { modifiers |= optionKey }
        if flags.contains(.shift) { modifiers |= shiftKey }
        if flags.contains(.command) { modifiers |= cmdKey }
        let key: String
        switch Int(event.keyCode) {
        case kVK_Space: key = "Espaço"
        case kVK_Return: key = "↩"
        case kVK_LeftArrow: key = "←"
        case kVK_RightArrow: key = "→"
        case kVK_UpArrow: key = "↑"
        case kVK_DownArrow: key = "↓"
        default:
            let typed = (event.charactersIgnoringModifiers ?? "").uppercased()
            guard let scalar = typed.unicodeScalars.first, !CharacterSet.controlCharacters.contains(scalar) else {
                return nil
            }
            key = typed
        }
        self.init(keyCode: Int(event.keyCode), modifiers: modifiers, key: key)
    }

    init(keyCode: Int, modifiers: Int, key: String) {
        self.keyCode = keyCode
        self.modifiers = modifiers
        self.key = key
    }
}

/// Asks for a new shortcut in a small window: the next key press with ⌘, ⌃
/// or ⌥ becomes it. Esc cancels; Delete leaves the drawer without one.
@MainActor
final class ShortcutRecorder: NSObject, NSWindowDelegate {
    enum Result {
        case set(Shortcut)
        case removed
        case cancelled
    }

    private var window: NSWindow?
    private var monitor: Any?
    private var done: ((Result) -> Void)?

    func record(current: Shortcut?, done: @escaping (Result) -> Void) {
        self.done = done
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 340, height: 130),
                              styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Atalho da Gaveta"
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.level = .modalPanel

        let title = NSTextField(labelWithString: "Pressione o novo atalho")
        title.font = .systemFont(ofSize: 15, weight: .semibold)
        let now = NSTextField(labelWithString: current.map { "Atual: \($0.label)" } ?? "Sem atalho")
        now.textColor = .secondaryLabelColor
        let hint = NSTextField(labelWithString: "Use ⌘, ⌃ ou ⌥. Esc cancela, Delete remove o atalho.")
        hint.font = .systemFont(ofSize: 11)
        hint.textColor = .secondaryLabelColor
        let stack = NSStackView(views: [title, now, hint])
        stack.orientation = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false
        window.contentView?.addSubview(stack)
        if let content = window.contentView {
            NSLayoutConstraint.activate([
                stack.centerXAnchor.constraint(equalTo: content.centerXAnchor),
                stack.centerYAnchor.constraint(equalTo: content.centerYAnchor),
            ])
        }

        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            MainActor.assumeIsolated { self?.handle(event) }
            return nil
        }
        window.center()
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        self.window = window
    }

    private func handle(_ event: NSEvent) {
        switch Int(event.keyCode) {
        case kVK_Escape:
            finish(.cancelled)
        case kVK_Delete, kVK_ForwardDelete:
            finish(.removed)
        default:
            if let shortcut = Shortcut(event: event) {
                finish(.set(shortcut))
            } else {
                NSSound.beep()
            }
        }
    }

    nonisolated func windowWillClose(_ notification: Notification) {
        MainActor.assumeIsolated { finish(.cancelled) }
    }

    private func finish(_ result: Result) {
        guard let done else { return }
        self.done = nil
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
        window?.delegate = nil
        window?.close()
        window = nil
        done(result)
    }
}
