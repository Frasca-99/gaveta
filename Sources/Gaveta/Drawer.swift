import AppKit
import SwiftUI

/// One capture in the drawer.
struct Pin: Identifiable, Equatable {
    var id = UUID()
    let url: URL
    let thumbnail: NSImage
    let date: Date
    let detail: String

    var isVideo: Bool { FolderWatcher.videoExtensions.contains(url.pathExtension.lowercased()) }

    /// What the card says it is, under its picture.
    var kind: String {
        if isVideo { return "Gravação" }
        if url.lastPathComponent.hasPrefix("Imagem copiada") { return "Imagem copiada" }
        return "Print"
    }

    static func load(_ url: URL) async -> Pin? {
        guard let thumbnail = await Thumbnails.make(for: url) else { return nil }
        let date = (try? url.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? Date()
        return Pin(url: url, thumbnail: thumbnail, date: date, detail: await Thumbnails.detail(for: url))
    }
}

/// What is in the drawer and what can be done with each capture. The files
/// stay where they are; the drawer only points at them.
@MainActor
final class Drawer: ObservableObject {
    /// Newest first.
    @Published private(set) var pins: [Pin] = []
    @Published var isOpen = false
    /// Out by a crack, showing a new capture slide in.
    @Published var peeking = false
    @Published var hovered: UUID?
    @Published private(set) var copied: Set<UUID> = []
    @Published var dragging: Set<UUID> = []
    @Published private(set) var selection: Set<UUID> = []
    /// Where ⇧-click extends the selection from.
    private var anchor: UUID?

    /// Counts captures landing in the drawer, for the knock it gives.
    @Published private(set) var arrivals = 0
    /// Captures still flying in: their card keeps its place, unseen, until
    /// the flight lands on it.
    @Published private(set) var landing: Set<UUID> = []
    /// Captures being thrown out: their card in the drawer goes unseen at
    /// once, so only the thrown one shows.
    @Published private(set) var departing: Set<UUID> = []

    /// Where a card stands on screen right now, so a discarded one can be
    /// thrown out of the drawer from there. Set by the cards' control; nil
    /// while the drawer is shut.
    var frameOnScreen: ((UUID) -> CGRect?)?
    /// Throws a card out of the drawer from its place on screen, after a
    /// delay in seconds.
    var onToss: ((Pin, CGRect, TimeInterval) -> Void)?

    /// How many captures the drawer keeps; past it, the oldest goes.
    var capacity = 50
    var onChange: (() -> Void)?

    // MARK: Adding

    /// Puts a capture at the front. With `flying`, its card waits unseen for
    /// `land(_:)`, which the flight calls when it gets there.
    @discardableResult
    func add(_ pin: Pin, flying: Bool = false) -> Bool {
        guard !pins.contains(where: { $0.url == pin.url }) else { return false }
        if flying { landing.insert(pin.id) }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.72)) { pins.insert(pin, at: 0) }
        if !flying { arrivals += 1 }
        while pins.count > capacity, let oldest = pins.last { discard(oldest.id) }
        changed()
        return true
    }

    /// The flight is over: the card shows, and the drawer takes the knock.
    func land(_ id: UUID) {
        guard landing.remove(id) != nil else { return }
        arrivals += 1
    }

    /// Brings back what was in the drawer at the last launch, in the same order.
    func restore() async {
        var restored: [Pin] = []
        for path in Prefs.pinPaths.prefix(capacity) where FileManager.default.fileExists(atPath: path) {
            if let pin = await Pin.load(URL(fileURLWithPath: path)) { restored.append(pin) }
        }
        // Anything captured while restoring is newer, so it stays on top.
        pins += restored.filter { pin in !pins.contains { $0.url == pin.url } }
        changed()
    }

    /// Captures whose file was deleted or moved away leave the drawer.
    func pruneMissing() {
        let gone = pins.filter { !FileManager.default.fileExists(atPath: $0.url.path) }
        for pin in gone { remove(pin.id) }
    }

    // MARK: Actions

    /// Copies one capture, or every selected one when it is part of the selection.
    func copy(_ id: UUID) {
        if selection.count > 1, selection.contains(id) {
            copySelection()
        } else {
            clearSelection()
            copy([id])
        }
    }

    /// One item per capture, oldest first, so a single ⌘V pastes them in the
    /// order they were taken.
    func copySelection() {
        copy(selectedPins.map(\.id))
    }

    private func copy(_ ids: [UUID]) {
        let pins = ids.compactMap(pin)
        guard !pins.isEmpty else { return }
        // One capture goes as an image too, for apps that only paste images.
        // Several go as files only: given images, most apps paste the first
        // and drop the rest, while every app that takes attachments takes
        // all the files.
        let asImage = pins.count == 1
        let items = pins.map { pin in
            let item = NSPasteboardItem()
            if asImage, !pin.isVideo, let png = pngData(pin.url) { item.setData(png, forType: .png) }
            item.setString(pin.url.absoluteString, forType: .fileURL)
            return item
        }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.writeObjects(items)

        let marked = Set(pins.map(\.id))
        withAnimation(.easeOut(duration: 0.15)) { copied = marked }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            guard self?.copied == marked else { return }
            withAnimation(.easeIn(duration: 0.2)) { self?.copied = [] }
        }
    }

    /// Back to front, as the cards stand in the drawer: oldest first.
    var stackOrder: [Pin] { pins.reversed() }

    /// The card the pointer is on, counted from the back.
    var hoveredIndex: Int? {
        guard let hovered, let index = pins.firstIndex(where: { $0.id == hovered }) else { return nil }
        return pins.count - 1 - index
    }

    // MARK: Selection

    /// The selected captures, oldest first.
    var selectedPins: [Pin] { pins.reversed().filter { selection.contains($0.id) } }

    /// ⌘-click: adds or removes one capture.
    func toggleSelection(_ id: UUID) {
        withAnimation(.easeOut(duration: 0.12)) {
            if selection.contains(id) { selection.remove(id) } else { selection.insert(id) }
        }
        anchor = id
    }

    /// ⇧-click: selects everything between the last one picked and this one.
    func extendSelection(to id: UUID) {
        guard let anchor, let from = pins.firstIndex(where: { $0.id == anchor }),
              let to = pins.firstIndex(where: { $0.id == id }) else {
            toggleSelection(id)
            return
        }
        withAnimation(.easeOut(duration: 0.12)) {
            selection.formUnion(pins[min(from, to)...max(from, to)].map(\.id))
        }
    }

    func selectAll() {
        withAnimation(.easeOut(duration: 0.12)) { selection = Set(pins.map(\.id)) }
        anchor = pins.first?.id
    }

    func clearSelection() {
        guard !selection.isEmpty else { return }
        withAnimation(.easeOut(duration: 0.12)) { selection = [] }
        anchor = nil
    }

    /// What a drag from this capture carries: the whole selection when it is
    /// part of it, otherwise only itself.
    func dragSet(from id: UUID) -> [Pin] {
        if selection.count > 1, selection.contains(id) { return selectedPins }
        return pin(id).map { [$0] } ?? []
    }

    /// With `thrown`, the front few cards are thrown out one after another;
    /// the rest simply leave.
    func discardSelection(thrown: Bool = false) {
        for (order, pin) in selectedPins.reversed().enumerated() {
            discard(pin.id, thrown: thrown && order < 6, delay: Double(order) * 0.05)
        }
        clearSelection()
    }

    /// Images open in Preview, recordings in their default app.
    func open(_ id: UUID) {
        guard let pin = pin(id) else { return }
        if !pin.isVideo, let preview = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Preview") {
            NSWorkspace.shared.open([pin.url], withApplicationAt: preview, configuration: NSWorkspace.OpenConfiguration())
        } else {
            NSWorkspace.shared.open(pin.url)
        }
    }

    /// Press and hold: Markup for images. It cannot edit video, so a
    /// recording opens in its own app.
    func markup(_ id: UUID) {
        guard let pin = pin(id) else { return }
        guard !pin.isVideo else { return open(id) }
        MarkupEditor.shared.edit(pin.url) { [weak self] url in
            Task { await self?.reload(url) }
        }
    }

    /// Force click: Quick Look, with the rest of the drawer a key press away.
    func quickLook(_ id: UUID) {
        guard let index = pins.firstIndex(where: { $0.id == id }) else { return }
        QuickLook.shared.show(pins.map(\.url), at: index)
    }

    /// After an edit, the row shows the new picture and size.
    private func reload(_ url: URL) async {
        guard let index = pins.firstIndex(where: { $0.url == url }), var fresh = await Pin.load(url) else { return }
        fresh.id = pins[index].id
        pins[index] = fresh
    }

    func showInFinder(_ id: UUID) {
        guard let pin = pin(id) else { return }
        NSWorkspace.shared.activateFileViewerSelecting([pin.url])
    }

    /// Keeps a capture from Gaveta's folder by moving it to the Desktop.
    func keepOnDesktop(_ id: UUID) {
        guard let pin = pin(id) else { return }
        let target = uniqueURL(in: CaptureTakeover.desktop, named: pin.url.lastPathComponent)
        do {
            try FileManager.default.moveItem(at: pin.url, to: target)
            remove(id)
        } catch {
            NSSound.beep()
        }
    }

    /// The X and the context menu: a file in Gaveta's folder goes to the
    /// Trash, or the folder would fill up with forgotten captures. Files
    /// anywhere else only leave the drawer.
    ///
    /// With `thrown`, the card is thrown out of the drawer from where it
    /// stands, as with the X; otherwise it simply leaves.
    func discard(_ id: UUID, thrown: Bool = false, delay: TimeInterval = 0) {
        guard let pin = pin(id) else { return }
        if isInGavetaFolder(pin) {
            try? FileManager.default.trashItem(at: pin.url, resultingItemURL: nil)
        }
        guard thrown, let frame = frameOnScreen?(id), let onToss else { return remove(id) }
        departing.insert(id)
        onToss(pin, frame, delay)
        // Unseen first, then taken out, so the card inside does not fall too.
        DispatchQueue.main.async { [weak self] in
            self?.remove(id)
            self?.departing.remove(id)
        }
    }

    func discardAll() {
        for pin in pins { discard(pin.id) }
    }

    /// The drag ended. Dropped on the Trash, the files go there; dropped on
    /// a folder, Finder moved them away and they leave the drawer. An app
    /// only got copies, so they stay.
    func dragEnded(_ ids: [UUID], operation: NSDragOperation) {
        dragging = []
        for pin in ids.compactMap(pin) {
            if operation.contains(.delete) {
                try? FileManager.default.trashItem(at: pin.url, resultingItemURL: nil)
                remove(pin.id)
            } else if !FileManager.default.fileExists(atPath: pin.url.path) {
                remove(pin.id)
            }
        }
        if !operation.isEmpty { clearSelection() }
    }

    func isInGavetaFolder(_ pin: Pin) -> Bool {
        pin.url.deletingLastPathComponent().standardizedFileURL == CaptureTakeover.folder.standardizedFileURL
    }

    // MARK: Helpers

    private func remove(_ id: UUID) {
        withAnimation(.easeIn(duration: 0.4)) {
            pins.removeAll { $0.id == id }
            selection.remove(id)
        }
        if hovered == id { hovered = nil }
        changed()
    }

    private func pin(_ id: UUID) -> Pin? { pins.first { $0.id == id } }

    private func changed() {
        Prefs.pinPaths = pins.map(\.url.path)
        onChange?()
    }

    private func pngData(_ url: URL) -> Data? {
        if url.pathExtension.lowercased() == "png" { return try? Data(contentsOf: url) }
        guard let data = try? Data(contentsOf: url), let rep = NSBitmapImageRep(data: data) else { return nil }
        return rep.representation(using: .png, properties: [:])
    }

    private func uniqueURL(in folder: URL, named name: String) -> URL {
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        var url = folder.appendingPathComponent(name)
        var n = 2
        while FileManager.default.fileExists(atPath: url.path) {
            url = folder.appendingPathComponent("\(base) \(n)").appendingPathExtension(ext)
            n += 1
        }
        return url
    }
}
