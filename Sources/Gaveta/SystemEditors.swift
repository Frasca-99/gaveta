import AppKit
import Quartz
import UniformTypeIdentifiers

/// Opens a capture in the system's Markup editor, the one macOS shows for a
/// screenshot's floating thumbnail, and writes the result over the file.
@MainActor
final class MarkupEditor: NSObject, NSSharingServiceDelegate {
    static let shared = MarkupEditor()

    private var target: URL?
    private var onSaved: ((URL) -> Void)?

    func edit(_ url: URL, onSaved: @escaping (URL) -> Void) {
        guard let service = NSSharingService(named: NSSharingService.Name("com.apple.MarkupUI.Markup")),
              service.canPerform(withItems: [url]) else {
            NSWorkspace.shared.open(url)
            return
        }
        target = url
        self.onSaved = onSaved
        service.delegate = self
        NSApp.activate(ignoringOtherApps: true)
        service.perform(withItems: [url])
    }

    /// Done was pressed. The editor hands back the edited image in one of a
    /// few shapes; whichever it is, it ends up as the file's new contents.
    nonisolated func sharingService(_ sharingService: NSSharingService, didShareItems items: [Any]) {
        guard let item = items.first else { return }
        switch item {
        case let url as URL:
            let data = try? Data(contentsOf: url)
            Task { @MainActor in self.write(data) }
        case let provider as NSItemProvider:
            provider.loadDataRepresentation(forTypeIdentifier: UTType.image.identifier) { data, _ in
                Task { @MainActor in self.write(data) }
            }
        case let image as NSImage:
            let data = image.tiffRepresentation
            Task { @MainActor in self.write(data) }
        case let data as Data:
            Task { @MainActor in self.write(data) }
        default:
            break
        }
    }

    private func write(_ data: Data?) {
        guard let target, let data else { return }
        // The file keeps its format: a PNG stays a PNG.
        var output = data
        if target.pathExtension.lowercased() == "png", !data.starts(with: [0x89, 0x50, 0x4E, 0x47]),
           let png = NSBitmapImageRep(data: data)?.representation(using: .png, properties: [:]) {
            output = png
        }
        guard (try? output.write(to: target, options: .atomic)) != nil else {
            NSSound.beep()
            return
        }
        onSaved?(target)
        self.target = nil
    }
}

/// Quick Look over the drawer's captures, with the arrow keys moving through
/// the rest of them.
@MainActor
final class QuickLook: NSObject, QLPreviewPanelDataSource {
    static let shared = QuickLook()

    private var urls: [URL] = []
    private(set) var index = 0

    func show(_ urls: [URL], at index: Int) {
        guard !urls.isEmpty, let panel = QLPreviewPanel.shared() else { return }
        self.urls = urls
        self.index = index
        NSApp.activate(ignoringOtherApps: true)
        if panel.isVisible {
            panel.reloadData()
            panel.currentPreviewItemIndex = index
        } else {
            panel.makeKeyAndOrderFront(nil)
        }
    }

    nonisolated func numberOfPreviewItems(in panel: QLPreviewPanel!) -> Int {
        MainActor.assumeIsolated { urls.count }
    }

    nonisolated func previewPanel(_ panel: QLPreviewPanel!, previewItemAt index: Int) -> QLPreviewItem! {
        MainActor.assumeIsolated { urls[index] as NSURL }
    }
}
