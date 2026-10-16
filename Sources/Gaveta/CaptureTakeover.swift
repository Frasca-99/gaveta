import Foundation

/// Points macOS screenshots and recordings at Gaveta's folder and turns off the
/// floating thumbnail, so each capture is written the moment it is taken.
/// The user's values are saved first and put back by `release()`.
enum CaptureTakeover {
    static let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("Gaveta/Capturas", isDirectory: true)

    private static let domain = "com.apple.screencapture" as CFString

    /// Every key Gaveta changes, with the value it sets. macOS 27 has separate
    /// keys for screenshots and recordings; earlier versions read the plain
    /// ones, so both are written.
    private static var managed: [String: Any] {
        [
            "location": folder.path,
            "location-screenshot": folder.path,
            "location-screenrecording": folder.path,
            "target": "file",
            "target-screenshot": "file",
            "target-screenrecording": "file",
            "show-thumbnail": false,
        ]
    }

    static var isEngaged: Bool {
        guard let path = read("location") as? String else { return false }
        return URL(fileURLWithPath: (path as NSString).expandingTildeInPath).standardizedFileURL
            == folder.standardizedFileURL
    }

    static func engage() {
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        // Still engaged from a crash: what was saved then is the user's, and
        // the current values are ours, so nothing is saved over it.
        if !isEngaged {
            var saved: [String: Any] = [:]
            for key in managed.keys {
                if let value = read(key) { saved[key] = value }
            }
            Prefs.savedCaptureSettings = saved
        }
        for (key, value) in managed { write(key, value) }
    }

    static func release() {
        guard isEngaged else { return }
        let saved = Prefs.savedCaptureSettings ?? [:]
        // A key the user never had is removed, back to the macOS default.
        for key in managed.keys { write(key, saved[key]) }
        Prefs.savedCaptureSettings = nil
    }

    /// Where macOS saves screenshots: the Desktop unless set otherwise.
    static func screenshotFolder() -> URL {
        let raw = (read("location-screenshot") as? String) ?? (read("location") as? String)
        if let raw, !raw.isEmpty {
            let url = URL(fileURLWithPath: (raw as NSString).expandingTildeInPath, isDirectory: true)
            var isDirectory: ObjCBool = false
            if FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), isDirectory.boolValue {
                return url
            }
        }
        return desktop
    }

    static let desktop = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Desktop", isDirectory: true)

    private static func read(_ key: String) -> Any? {
        CFPreferencesAppSynchronize(domain)
        return CFPreferencesCopyAppValue(key as CFString, domain)
    }

    /// Goes through cfprefsd, so the screenshot service sees it at once.
    private static func write(_ key: String, _ value: Any?) {
        CFPreferencesSetAppValue(key as CFString, value.map { $0 as AnyObject }, domain)
        CFPreferencesAppSynchronize(domain)
    }
}
