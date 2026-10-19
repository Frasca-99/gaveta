import Foundation

/// The app speaks the Mac's language: Portuguese when it comes first in the
/// user's languages, English otherwise. Like any Mac app, it can be set on
/// its own: `defaults write com.neto.Gaveta AppleLanguages -array pt-BR`.
enum Language {
    static let isPortuguese = Locale.preferredLanguages.first?.lowercased().hasPrefix("pt") ?? false
    static var locale: Locale { Locale(identifier: isPortuguese ? "pt_BR" : "en_US") }
}

/// The Portuguese text or the English one, by the Mac's language.
func tr(_ pt: String, _ en: String) -> String {
    Language.isPortuguese ? pt : en
}
