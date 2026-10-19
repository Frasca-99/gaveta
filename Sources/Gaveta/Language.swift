import Foundation

/// The app's language. By default the Mac's: Portuguese when it comes first
/// in the user's languages, English otherwise. The menu bar menu can pin
/// either one, and so can System Settings › Language & Region › Applications,
/// which sets AppleLanguages for this app alone.
enum Language: String, CaseIterable {
    case automatic, portuguese, english

    /// The key the choice is kept under; the drawer's views watch it to redraw.
    static let key = "language"

    /// What the user picked in the menu; automatic until they pick.
    static var choice: Language {
        get { Language(rawValue: UserDefaults.standard.string(forKey: key) ?? "") ?? .automatic }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: key) }
    }

    static var isPortuguese: Bool {
        switch choice {
        case .portuguese: true
        case .english: false
        case .automatic: Locale.preferredLanguages.first?.lowercased().hasPrefix("pt") ?? false
        }
    }

    static var locale: Locale { Locale(identifier: isPortuguese ? "pt_BR" : "en_US") }
}

/// The Portuguese text or the English one, by the app's language.
func tr(_ pt: String, _ en: String) -> String {
    Language.isPortuguese ? pt : en
}
