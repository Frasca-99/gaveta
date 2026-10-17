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

    /// How the drawer looks: the oak card catalog, or glass.
    static var drawerStyle: DrawerStyle {
        get { DrawerStyle(rawValue: store.string(forKey: "drawerStyle") ?? "") ?? .catalog }
        set { store.set(newValue.rawValue, forKey: "drawerStyle") }
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
