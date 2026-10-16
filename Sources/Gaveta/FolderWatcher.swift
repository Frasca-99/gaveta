import CoreServices
import Foundation

/// A folder to watch and what counts as a capture in it.
struct WatchRule {
    let folder: URL
    /// Only files macOS tagged as screenshots, for shared folders like the
    /// Desktop. They must also be fresh: a screenshot moved there from the
    /// drawer keeps its old creation date and is not added again.
    var onlyFreshScreenshots = false
    var acceptsRecordings = false
}

/// Reports new captures through FSEvents, which names each file that
/// changed, so a folder is never listed again on every change.
final class FolderWatcher {
    private let rules: [WatchRule]
    private let onNew: (URL) -> Void
    private let onGone: () -> Void
    private var stream: FSEventStreamRef?
    private var seen: Set<String> = []

    static let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "heic", "tif", "tiff", "gif", "webp"]
    static let videoExtensions: Set<String> = ["mov", "mp4", "m4v"]

    init(rules: [WatchRule], onNew: @escaping (URL) -> Void, onGone: @escaping () -> Void) {
        self.rules = rules
        self.onNew = onNew
        self.onGone = onGone
    }

    deinit { stop() }

    func start() {
        guard stream == nil, !rules.isEmpty else { return }
        var context = FSEventStreamContext(
            version: 0, info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil, release: nil, copyDescription: nil)
        let flags = kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes
            | kFSEventStreamCreateFlagNoDefer
        guard let stream = FSEventStreamCreate(
            nil, folderWatcherCallback, &context, rules.map(\.folder.path) as CFArray,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 0.05, FSEventStreamCreateFlags(flags))
        else { return }
        FSEventStreamSetDispatchQueue(stream, .main)
        FSEventStreamStart(stream)
        self.stream = stream
    }

    func stop() {
        guard let stream else { return }
        FSEventStreamStop(stream)
        FSEventStreamInvalidate(stream)
        FSEventStreamRelease(stream)
        self.stream = nil
    }

    fileprivate func handle(_ paths: [String]) {
        var somethingLeft = false
        for path in paths {
            let url = URL(fileURLWithPath: path)
            guard !url.lastPathComponent.hasPrefix("."), let rule = rule(for: url) else { continue }
            if FileManager.default.fileExists(atPath: path) {
                guard !seen.contains(path) else { continue }
                // The screenshot tag can land a moment after the file does.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                    self?.consider(url, under: rule)
                }
            } else {
                seen.remove(path)
                somethingLeft = true
            }
        }
        if somethingLeft { onGone() }
    }

    private func consider(_ url: URL, under rule: WatchRule) {
        guard !seen.contains(url.path), FileManager.default.fileExists(atPath: url.path),
              accepts(url, under: rule) else { return }
        seen.insert(url.path)
        onNew(url)
    }

    private func accepts(_ url: URL, under rule: WatchRule) -> Bool {
        let ext = url.pathExtension.lowercased()
        if Self.videoExtensions.contains(ext) { return rule.acceptsRecordings }
        guard Self.imageExtensions.contains(ext) else { return false }
        guard rule.onlyFreshScreenshots else { return true }
        let created = (try? url.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
        return isScreenshot(url) && Date().timeIntervalSince(created) < 20
    }

    private func isScreenshot(_ url: URL) -> Bool {
        getxattr(url.path, "com.apple.metadata:kMDItemIsScreenCapture", nil, 0, 0, 0) >= 0
    }

    private func rule(for url: URL) -> WatchRule? {
        let parent = url.deletingLastPathComponent().resolvingSymlinksInPath().standardizedFileURL.path
        return rules.first { $0.folder.resolvingSymlinksInPath().standardizedFileURL.path == parent }
    }
}

private let folderWatcherCallback: FSEventStreamCallback = { _, info, _, paths, _, _ in
    guard let info else { return }
    let watcher = Unmanaged<FolderWatcher>.fromOpaque(info).takeUnretainedValue()
    let list = Unmanaged<CFArray>.fromOpaque(paths).takeUnretainedValue() as? [String] ?? []
    watcher.handle(list)
}
