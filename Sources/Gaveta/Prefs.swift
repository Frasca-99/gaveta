import Foundation

/// Gaveta's own settings.
enum Prefs {
    private static var store: UserDefaults { .standard }

    static var takeOverCaptures: Bool {
        get { store.bool(forKey: "takeOverCaptures") }
        set { store.set(newValue, forKey: "takeOverCaptures") }
    }

    static var askedAboutTakeover: Bool {
        get { store.bool(forKey: "askedAboutTakeover") }
        set { store.set(newValue, forKey: "askedAboutTakeover") }
    }

    /// The user's screenshot settings from before Gaveta changed them.
    static var savedCaptureSettings: [String: Any]? {
        get { store.dictionary(forKey: "savedCaptureSettings") }
        set { store.set(newValue, forKey: "savedCaptureSettings") }
    }

    /// What is in the drawer, newest first.
    static var pinPaths: [String] {
        get { store.stringArray(forKey: "pinPaths") ?? [] }
        set { store.set(newValue, forKey: "pinPaths") }
    }

    /// Images copied to the clipboard go in the drawer too. Off unless chosen.
    static var copiedImages: Bool {
        get { store.bool(forKey: "copiedImages") }
        set { store.set(newValue, forKey: "copiedImages") }
    }

    /// How the drawer looks: the oak card catalog, or glass. Until the user
    /// picks one, glass where the system has Liquid Glass (macOS 26 and
    /// later); before that the glass would only be frosted, and the oak
    /// drawer looks better.
    static var drawerStyle: DrawerStyle {
        get { DrawerStyle(rawValue: store.string(forKey: "drawerStyle") ?? "") ?? defaultDrawerStyle }
        set { store.set(newValue.rawValue, forKey: "drawerStyle") }
    }

    /// How wide the glass drawer's box is, after its grip was dragged.
    static var glassWidth: CGFloat {
        get {
            let width = store.double(forKey: "glassWidth")
            return width > 0 ? CGFloat(width) : DrawerLayout.standardBoxWidth
        }
        set { store.set(Double(newValue), forKey: "glassWidth") }
    }

    static var defaultDrawerStyle: DrawerStyle {
        if #available(macOS 26, *) { return .glass }
        return .catalog
    }

    /// The shortcut for the drawer; nil when the user removed it.
    static var shortcut: Shortcut? {
        get {
            if store.bool(forKey: "shortcutRemoved") { return nil }
            guard let key = store.string(forKey: "shortcutKey") else { return .standard }
            return Shortcut(keyCode: store.integer(forKey: "shortcutKeyCode"),
                            modifiers: store.integer(forKey: "shortcutModifiers"), key: key)
        }
        set {
            store.set(newValue == nil, forKey: "shortcutRemoved")
            guard let newValue else { return }
            store.set(newValue.keyCode, forKey: "shortcutKeyCode")
            store.set(newValue.modifiers, forKey: "shortcutModifiers")
            store.set(newValue.key, forKey: "shortcutKey")
        }
    }
}
