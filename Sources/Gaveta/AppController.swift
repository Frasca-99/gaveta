import AppKit
import Carbon.HIToolbox
import Quartz
import ServiceManagement

/// Wires the pieces together and owns the menu bar item.
@MainActor
final class AppController: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let drawer = Drawer()
    private var panel: DrawerPanel!
    private var trigger: EdgeTrigger!
    private var watcher: FolderWatcher?
    private var statusItem: NSStatusItem!
    private var hotKey: HotKey?
    private var pasteboard: PasteboardWatcher?
    private let flights = Flights()
    private let recorder = ShortcutRecorder()
    private var signalSources: [DispatchSourceSignal] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        panel = DrawerPanel(rootView: DrawerView(drawer: drawer))
        trigger = EdgeTrigger(panel: panel, drawer: drawer)
        drawer.onChange = { [weak self] in self?.trigger.drawerChanged() }
        drawer.onToss = { [weak self] pin, frame, delay in
            guard let self, let screen = self.panel.screen else { return }
            self.flights.toss(pin, from: frame, on: screen, delay: delay)
        }

        setUpStatusItem()
        restoreSettingsOnSignals()

        if Prefs.takeOverCaptures { CaptureTakeover.engage() }
        startWatching()
        Task { await drawer.restore() }

        registerShortcut()
        // Lets Shortcuts, Raycast or a script open and close the drawer.
        DistributedNotificationCenter.default().addObserver(
            forName: Notification.Name("com.neto.Gaveta.toggle"), object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.trigger.toggle() }
        }
        pasteboard = PasteboardWatcher { [weak self] url in self?.captured(url) }
        if Prefs.copiedImages { pasteboard?.start() }

        if !Prefs.askedAboutTakeover {
            DispatchQueue.main.async { self.offerTakeover() }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        CaptureTakeover.release()
    }

    // MARK: Captures

    private func startWatching() {
        watcher?.stop()
        var rules: [WatchRule]
        if Prefs.takeOverCaptures {
            rules = [WatchRule(folder: CaptureTakeover.folder, acceptsRecordings: true)]
            // A macOS version that ignores the settings keeps saving to the
            // Desktop; those captures still go in the drawer.
            rules.append(WatchRule(folder: CaptureTakeover.desktop, onlyFreshScreenshots: true))
        } else {
            let folder = CaptureTakeover.screenshotFolder()
            let shared = folder.standardizedFileURL == CaptureTakeover.desktop.standardizedFileURL
            rules = [WatchRule(folder: folder, onlyFreshScreenshots: shared)]
        }
        watcher = FolderWatcher(rules: rules, onNew: { [weak self] url in
            self?.captured(url)
        }, onGone: { [weak self] in
            self?.drawer.pruneMissing()
        })
        watcher?.start()
    }

    /// A new capture: the drawer comes out by a crack and the capture goes
    /// in. A screenshot flies from where it was taken; anything else, like a
    /// copied image, simply drops in.
    private func captured(_ url: URL) {
        Task {
            guard let pin = await Pin.load(url) else { return }
            if let start = captureRect(of: url), flights.canFly,
               let screen = NSScreen.screens.first(where: { $0.frame.contains(CGPoint(x: start.midX, y: start.midY)) }),
               let image = await Flights.image(for: url, fitting: start, scale: screen.backingScaleFactor) {
                trigger.peek()
                // The drawer opened on the screen under the pointer; the flight
                // needs it on the screen the capture came from.
                guard panel.screen == screen else {
                    drawer.add(pin)
                    return
                }
                guard drawer.add(pin, flying: true) else { return }
                guard let card = panel.frontCardRect(for: drawer) else {
                    drawer.land(pin.id)
                    return
                }
                flights.fly(pin, image: image, from: start, to: card, on: screen) {
                    self.drawer.land(pin.id)
                }
                return
            }
            trigger.peek()
            drawer.add(pin)
        }
    }

    private func setCopiedImages(_ on: Bool) {
        Prefs.copiedImages = on
        on ? pasteboard?.start() : pasteboard?.stop()
    }

    // MARK: Shortcut

    private func registerShortcut() {
        hotKey?.unregister()
        hotKey = nil
        guard let shortcut = Prefs.shortcut else { return }
        hotKey = HotKey(keyCode: shortcut.keyCode, modifiers: shortcut.modifiers) { [weak self] in
            self?.trigger.toggle()
        }
    }

    private func changeShortcut() {
        // Off while recording, so pressing the current one does not open the drawer.
        hotKey?.unregister()
        hotKey = nil
        recorder.record(current: Prefs.shortcut) { [weak self] result in
            guard let self else { return }
            let previous = Prefs.shortcut
            switch result {
            case .set(let shortcut): Prefs.shortcut = shortcut
            case .removed: Prefs.shortcut = nil
            case .cancelled: break
            }
            self.registerShortcut()
            if Prefs.shortcut != nil, self.hotKey == nil {
                Prefs.shortcut = previous
                self.registerShortcut()
                let alert = NSAlert()
                alert.messageText = "Esse atalho já está em uso"
                alert.informativeText = "Outro app já usa essa combinação. Tente outra."
                NSApp.activate(ignoringOtherApps: true)
                alert.runModal()
            }
        }
    }

    private func offerTakeover() {
        Prefs.askedAboutTakeover = true
        let alert = NSAlert()
        alert.messageText = "Mostrar os prints na gaveta na hora?"
        alert.informativeText = """
            A Gaveta desliga a miniatura do canto e guarda os prints numa pasta própria. Assim, \
            cada print aparece na gaveta no mesmo instante, e a Mesa não fica cheia. Para guardar um, \
            arraste para uma pasta; o X manda para o Lixo.

            Se preferir não mexer nisso, o Mac continua salvando na Mesa com a miniatura, \
            e os prints aparecem na gaveta alguns segundos depois.

            Dá para mudar quando quiser no ícone da Gaveta, na barra de menus.
            """
        alert.addButton(withTitle: "Mostrar na hora (recomendado)")
        alert.addButton(withTitle: "Manter como está")
        if let icon = NSApp.applicationIconImage { alert.icon = icon }
        // A menu bar app has no window in front, so the alert is raised above
        // everything or it may open behind other apps.
        alert.layout()
        alert.window.level = .modalPanel
        // The polite activate() leaves a menu bar app in the background, and
        // then the recommended button is not drawn as the default one.
        NSApp.activate(ignoringOtherApps: true)
        if alert.runModal() == .alertFirstButtonReturn { setTakeover(true) }
    }

    private func setTakeover(_ on: Bool) {
        Prefs.takeOverCaptures = on
        on ? CaptureTakeover.engage() : CaptureTakeover.release()
        startWatching()
    }

    /// Quitting from the menu or logging out runs applicationWillTerminate;
    /// a plain kill does not, so the settings also come back on signals.
    private func restoreSettingsOnSignals() {
        for sig in [SIGTERM, SIGINT, SIGHUP] {
            signal(sig, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
            source.setEventHandler {
                CaptureTakeover.release()
                exit(0)
            }
            source.resume()
            signalSources.append(source)
        }
    }

    // MARK: Menu bar

    private func setUpStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = StatusIcon.image
        statusItem.button?.toolTip = "Gaveta"
        let menu = NSMenu()
        menu.delegate = self
        // Items set their own enabled state.
        menu.autoenablesItems = false
        statusItem.menu = menu
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        let shortcut = Prefs.shortcut
        let toggle = ActionMenuItem(drawer.isOpen ? "Fechar a gaveta" : "Abrir a gaveta",
                                    key: shortcut?.menuKey ?? "") { [weak self] in
            self?.trigger.toggle()
        }
        toggle.keyEquivalentModifierMask = shortcut?.menuModifiers ?? []
        menu.addItem(toggle)

        let clear = ActionMenuItem("Esvaziar a gaveta") { [weak self] in self?.drawer.discardAll() }
        clear.isEnabled = !drawer.pins.isEmpty
        menu.addItem(clear)

        menu.addItem(.separator())

        let takeover = ActionMenuItem("Prints direto na gaveta") { [weak self] in
            self?.setTakeover(!Prefs.takeOverCaptures)
        }
        takeover.state = Prefs.takeOverCaptures ? .on : .off
        menu.addItem(takeover)

        let copied = ActionMenuItem("Imagens copiadas também") { [weak self] in
            self?.setCopiedImages(!Prefs.copiedImages)
        }
        copied.state = Prefs.copiedImages ? .on : .off
        menu.addItem(copied)

        menu.addItem(ActionMenuItem("Abrir pasta de capturas") {
            let folder = Prefs.takeOverCaptures ? CaptureTakeover.folder : CaptureTakeover.screenshotFolder()
            NSWorkspace.shared.open(folder)
        })

        menu.addItem(.separator())

        menu.addItem(ActionMenuItem("Atalho: \(shortcut?.label ?? "nenhum")…") { [weak self] in
            self?.changeShortcut()
        })

        let login = ActionMenuItem("Abrir ao iniciar sessão") { [weak self] in self?.toggleOpenAtLogin() }
        login.state = SMAppService.mainApp.status == .enabled ? .on : .off
        menu.addItem(login)

        menu.addItem(.separator())
        menu.addItem(ActionMenuItem("Encerrar a Gaveta", key: "q") { NSApp.terminate(nil) })
    }

    // MARK: Quick Look

    /// With no window of ours in front, Quick Look finds its controller here,
    /// at the end of the responder chain.
    override func acceptsPreviewPanelControl(_ panel: QLPreviewPanel!) -> Bool { true }

    override func beginPreviewPanelControl(_ panel: QLPreviewPanel!) {
        panel.dataSource = QuickLook.shared
        panel.currentPreviewItemIndex = QuickLook.shared.index
    }

    override func endPreviewPanelControl(_ panel: QLPreviewPanel!) {
        panel.dataSource = nil
    }

    private func toggleOpenAtLogin() {
        do {
            if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            let alert = NSAlert()
            alert.messageText = "Não foi possível mudar a abertura ao iniciar sessão"
            alert.informativeText = "Mova a Gaveta para a pasta Aplicativos e tente de novo."
            NSApp.activate(ignoringOtherApps: true)
            alert.runModal()
        }
    }
}

/// The menu bar icon: a drawer pulled open, a capture standing in it.
enum StatusIcon {
    static let image: NSImage = {
        let image = NSImage(size: NSSize(width: 18, height: 16), flipped: true) { _ in
            NSColor.black.set()
            // The capture, standing up out of the drawer.
            let card = NSBezierPath(roundedRect: NSRect(x: 5, y: 1.5, width: 8, height: 7), xRadius: 1.2, yRadius: 1.2)
            card.lineWidth = 1.3
            card.stroke()
            // The drawer front, with its handle cut out.
            let front = NSBezierPath(roundedRect: NSRect(x: 1.5, y: 7.5, width: 15, height: 7.5), xRadius: 2, yRadius: 2)
            front.append(NSBezierPath(roundedRect: NSRect(x: 6.5, y: 10.2, width: 5, height: 1.8), xRadius: 0.9, yRadius: 0.9))
            front.windingRule = .evenOdd
            front.fill()
            return true
        }
        image.isTemplate = true
        return image
    }()
}
