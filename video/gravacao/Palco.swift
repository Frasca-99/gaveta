// Palco: the stage for Gaveta's film. A backdrop above every other app's
// windows (so nothing of the desk behind shows, and no setting changes), a
// shop with a failed payment to take screenshots of, and a chat (Bia, who
// wants proof) that takes real pastes and drops of files. It writes where its pieces stand to
// $PALCO_MAPA, in screen points from the top left, for the cursor script.
import AppKit
import SwiftUI

let mapPath = ProcessInfo.processInfo.environment["PALCO_MAPA"] ?? "/tmp/palco.json"
var mapa: [String: [String: Double]] = [:]
func report(_ name: String, _ rect: CGRect, in window: NSWindow?) {
    guard let window, let content = window.contentView, let screen = window.screen ?? NSScreen.main else { return }
    let screenH = screen.frame.height
    let contentTop = screenH - (window.frame.minY + content.frame.height)
    mapa[name] = ["x": window.frame.minX + rect.minX, "y": contentTop + rect.minY, "w": rect.width, "h": rect.height]
    if let data = try? JSONSerialization.data(withJSONObject: mapa, options: [.prettyPrinted, .sortedKeys]) {
        try? data.write(to: URL(fileURLWithPath: mapPath))
    }
}

/// Reports where a view stands, once laid out.
struct Marca: ViewModifier {
    let name: String
    @Environment(\.janela) var janela
    func body(content: Content) -> some View {
        content.background(GeometryReader { g in
            Color.clear
                .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { report(name, g.frame(in: .global), in: janela.window) } }
                .onChange(of: g.frame(in: .global)) { _, f in report(name, f, in: janela.window) }
        })
    }
}
final class Caixa { weak var window: NSWindow? }
private struct JanelaKey: EnvironmentKey { static let defaultValue = Caixa() }
extension EnvironmentValues { var janela: Caixa { get { self[JanelaKey.self] } set { self[JanelaKey.self] = newValue } } }
extension View { func marca(_ name: String) -> some View { modifier(Marca(name: name)) } }

// MARK: the backdrop

struct Fundo: View {
    var body: some View {
        MeshGradient(width: 3, height: 3, points: [
            [0, 0], [0.48, 0], [1, 0],
            [0, 0.52], [0.42, 0.5], [1, 0.46],
            [0, 1], [0.55, 1], [1, 1],
        ], colors: [
            Color(red: 0.80, green: 0.88, blue: 1.00), Color(red: 0.86, green: 0.82, blue: 1.00), Color(red: 1.00, green: 0.84, blue: 0.76),
            Color(red: 0.50, green: 0.66, blue: 1.00), Color(red: 0.93, green: 0.94, blue: 1.00), Color(red: 1.00, green: 0.60, blue: 0.50),
            Color(red: 0.22, green: 0.38, blue: 0.92), Color(red: 0.55, green: 0.42, blue: 0.95), Color(red: 1.00, green: 0.52, blue: 0.36),
        ])
        .ignoresSafeArea()
    }
}

// MARK: the shop

struct Loja: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("LOJA EXEMPLO").font(.system(size: 11, weight: .semibold, design: .monospaced)).tracking(1).foregroundStyle(.secondary)
            Text("Finalizar compra").font(.system(size: 22, weight: .semibold)).padding(.top, 4).padding(.bottom, 10)
            linha("Tênis de corrida", "R$ 399,90")
            Divider()
            linha("Meias, 3 pares", "R$ 59,90")
            Divider()
            linha("Total", "R$ 459,80").fontWeight(.semibold)
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color(red: 0.85, green: 0.18, blue: 0.13))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Não foi possível concluir o pagamento.")
                    Text("Erro 500").fontWeight(.bold)
                }
                .foregroundStyle(Color(red: 0.70, green: 0.14, blue: 0.10))
            }
            .font(.system(size: 13))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color(red: 0.99, green: 0.93, blue: 0.92), in: RoundedRectangle(cornerRadius: 10))
            .padding(.top, 12)
            .marca("loja.erro")
            Text("Pagar R$ 459,80")
                .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 42)
                .background(Color(white: 0.07), in: RoundedRectangle(cornerRadius: 10))
                .padding(.top, 14)
        }
        .padding(22)
        .frame(width: 380)
        .background(.white)
        .marca("loja")
    }
    func linha(_ a: String, _ b: String) -> some View {
        HStack { Text(a); Spacer(); Text(b).monospacedDigit() }.font(.system(size: 15)).padding(.vertical, 9)
    }
}

// MARK: the chat

final class Conversa: ObservableObject {
    struct Msg: Identifiable { let id = UUID(); let dela: Bool; var texto: String? = nil; var imagem: NSImage? = nil }
    @Published var msgs: [Msg] = [
        Msg(dela: true, texto: "Por que você curtiu a foto da Camila às 3 da manhã?"),
        Msg(dela: true, texto: "E ainda mandou mensagem pra ela??"),
        Msg(dela: false, texto: "Amor, eu não mandei mensagem pra ela"),
        Msg(dela: false, texto: "Posso provar. Vou te mandar um print"),
        Msg(dela: true, texto: "Manda."),
    ]
    @Published var digitando = false
    private var envios = 0

    /// Prints sent by paste or drop, in the order they come.
    func receber(_ urls: [URL]) {
        let imagens = urls.compactMap { NSImage(contentsOf: $0) }
        guard !imagens.isEmpty else { return }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
            for img in imagens { msgs.append(Msg(dela: false, imagem: img)) }
        }
        envios += 1
        switch envios {
        case 1: responder([(true, "Isso é a tela de uma loja, Lucas.")])
        case 2: responder([(true, "Pera. Como você manda print tão rápido?"), (false, "É a Gaveta, amor.")])
        default: break
        }
    }
    private func responder(_ falas: [(Bool, String)], depois: Double = 0.7) {
        var t = depois
        for (dela, texto) in falas {
            if dela {
                DispatchQueue.main.asyncAfter(deadline: .now() + t) { withAnimation(.easeOut(duration: 0.2)) { self.digitando = true } }
                t += 1.3
            } else {
                t += 0.6
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + t) {
                withAnimation(.spring(response: 0.42, dampingFraction: 0.8)) {
                    self.digitando = false
                    self.msgs.append(Msg(dela: dela, texto: texto))
                }
            }
            t += 0.35
        }
    }
    func colar() {
        let urls = NSPasteboard.general.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL] ?? []
        receber(urls)
    }
}

struct Bolha: View {
    let msg: Conversa.Msg
    var body: some View {
        HStack {
            if !msg.dela { Spacer(minLength: 40) }
            if let img = msg.imagem {
                Image(nsImage: img).resizable().aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 190, maxHeight: 190)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(.black.opacity(0.08)))
            } else if let texto = msg.texto {
                Text(texto).font(.system(size: 14))
                    .foregroundStyle(msg.dela ? Color.primary : .white)
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(msg.dela ? Color(white: 0.91) : Color(red: 0.04, green: 0.52, blue: 1.0), in: RoundedRectangle(cornerRadius: 17))
            }
            if msg.dela { Spacer(minLength: 40) }
        }
        .transition(.asymmetric(insertion: .scale(scale: 0.6, anchor: msg.dela ? .bottomLeading : .bottomTrailing).combined(with: .opacity), removal: .opacity))
    }
}

struct Digitando: View {
    @State private var fase = false
    var body: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3) { i in
                    Circle().fill(Color(white: 0.55)).frame(width: 7, height: 7)
                        .opacity(fase ? 1 : 0.3)
                        .animation(.easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15), value: fase)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(Color(white: 0.91), in: RoundedRectangle(cornerRadius: 17))
            Spacer()
        }
        .onAppear { fase = true }
        .transition(.opacity)
    }
}

struct Chat: View {
    @ObservedObject var conversa: Conversa
    @State private var alvo = false
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Circle().fill(LinearGradient(colors: [Color(red: 0.97, green: 0.66, blue: 0.77), Color(red: 0.87, green: 0.39, blue: 0.6)], startPoint: .top, endPoint: .bottom))
                    .frame(width: 26, height: 26).overlay(Text("B").font(.system(size: 12, weight: .semibold)).foregroundStyle(.white))
                Text("Bia").font(.system(size: 14, weight: .semibold))
            }
            .frame(maxWidth: .infinity).padding(.vertical, 9)
            Divider()
            ScrollViewReader { leitor in
                ScrollView {
                    VStack(spacing: 5) {
                        Text("Hoje 03:12").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary).padding(.bottom, 4)
                        ForEach(conversa.msgs) { Bolha(msg: $0).id($0.id) }
                        if conversa.digitando { Digitando().id("digitando") }
                        Color.clear.frame(height: 1).id("fim")
                    }
                    .padding(.horizontal, 14).padding(.vertical, 12)
                }
                .onChange(of: conversa.msgs.count) { withAnimation(.easeOut(duration: 0.3)) { leitor.scrollTo("fim", anchor: .bottom) } }
                .onChange(of: conversa.digitando) { withAnimation(.easeOut(duration: 0.3)) { leitor.scrollTo("fim", anchor: .bottom) } }
                .onAppear { leitor.scrollTo("fim", anchor: .bottom) }
            }
            .background(alvo ? Color.accentColor.opacity(0.07) : .clear)
            .marca("conversa.mensagens")
            HStack {
                Text("Mensagem").foregroundStyle(.tertiary)
                Spacer()
            }
            .font(.system(size: 13))
            .padding(.horizontal, 14).frame(height: 34)
            .background(RoundedRectangle(cornerRadius: 17).strokeBorder(Color(white: 0.85)))
            .padding(10)
            .marca("conversa.campo")
        }
        .frame(width: 360, height: 470)
        .background(.white)
        .onDrop(of: [.fileURL], isTargeted: $alvo) { providers in
            let grupo = DispatchGroup()
            var urls: [(Int, URL)] = []
            for (i, p) in providers.enumerated() {
                grupo.enter()
                _ = p.loadObject(ofClass: URL.self) { url, _ in
                    if let url { DispatchQueue.main.async { urls.append((i, url)) } }
                    grupo.leave()
                }
            }
            grupo.notify(queue: .main) { conversa.receber(urls.sorted { $0.0 < $1.0 }.map(\.1)) }
            return true
        }
        .marca("conversa")
    }
}

// MARK: windows

final class Delegate: NSObject, NSApplicationDelegate {
    var janelas: [NSWindow] = []
    let conversa = Conversa()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = NSAppearance(named: .aqua)
        guard let screen = NSScreen.main else { return }
        let H = screen.frame.height

        let fundo = NSWindow(contentRect: screen.frame, styleMask: [.borderless], backing: .buffered, defer: false, screen: screen)
        fundo.level = NSWindow.Level(rawValue: 1)
        fundo.contentView = NSHostingView(rootView: Fundo())
        fundo.isReleasedWhenClosed = false
        fundo.orderFrontRegardless()
        janelas.append(fundo)

        func janela<V: View>(_ titulo: String, x: Double, top: Double, _ view: V) -> NSWindow {
            let caixa = Caixa()
            let host = NSHostingView(rootView: view.environment(\.janela, caixa))
            let size = host.fittingSize
            let w = NSWindow(contentRect: NSRect(x: x, y: H - top - size.height, width: size.width, height: size.height),
                             styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false, screen: screen)
            caixa.window = w
            w.title = titulo
            w.contentView = host
            w.level = NSWindow.Level(rawValue: 2)
            w.isReleasedWhenClosed = false
            w.makeKeyAndOrderFront(nil)
            janelas.append(w)
            return w
        }
        let px = Double(ProcessInfo.processInfo.environment["PALCO_LOJA_X"] ?? "") ?? 150
        let py = Double(ProcessInfo.processInfo.environment["PALCO_LOJA_TOP"] ?? "") ?? 190
        let cx = Double(ProcessInfo.processInfo.environment["PALCO_CHAT_X"] ?? "") ?? 590
        let cy = Double(ProcessInfo.processInfo.environment["PALCO_CHAT_TOP"] ?? "") ?? 250
        _ = janela("Loja Exemplo", x: px, top: py, Loja())
        let chat = janela("Conversa", x: cx, top: cy, Chat(conversa: conversa))
        chat.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // ⌘V pastes into the chat, wherever the keys are in this app
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains(.command), event.charactersIgnoringModifiers == "v" {
                self?.conversa.colar()
                return nil
            }
            if event.modifierFlags.contains(.command), event.charactersIgnoringModifiers == "q" { NSApp.terminate(nil) }
            return event
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = Delegate()
app.delegate = delegate
app.run()
