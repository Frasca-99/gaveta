// Palco: the stage for Gaveta's films. A backdrop above every other app's
// windows (so nothing of the desk behind shows, and no setting changes), a
// shop to take screenshots of, and a chat that takes real pastes and drops of
// files. It writes where its pieces stand to $PALCO_MAPA, in screen points
// from the top left, for the cursor script.
//
// $PALCO_CENARIO picks the story:
//   bia  the reel's: the shop has already failed, and Bia wants proof (default)
//   uso  everyday use: Rafa from support asks for screenshots of a failed
//        payment; the shop fails once Pagar is clicked, and the chat starts
//        when the distributed notification local.gaveta.palco.comecar comes
//   traicao  the joke in English, with real proof: Emma asks why Jake liked
//        Chloe's photo; the photo is of Chloe and Emma, and his chat with Chloe
//        is empty. The photo comes from $PALCO_FOTO; the chat starts with
//        local.gaveta.palco.comecar
import AppKit
import SwiftUI

let env = ProcessInfo.processInfo.environment
let cenario = env["PALCO_CENARIO"] ?? "bia"
let uso = cenario == "uso"
let traicao = cenario == "traicao"
/// The stage's words: Portuguese, or English for the English joke.
func L(_ pt: String, _ en: String) -> String { traicao ? en : pt }
let mapPath = env["PALCO_MAPA"] ?? "/tmp/palco.json"
var mapa: [String: [String: Double]] = [:]
func report(_ name: String, _ rect: CGRect, in window: NSWindow?) {
    guard let window, let screen = window.screen ?? NSScreen.main else { return }
    // SwiftUI's global space starts at the top of the window, title bar included
    let windowTop = screen.frame.height - window.frame.maxY
    mapa[name] = ["x": window.frame.minX + rect.minX, "y": windowTop + rect.minY, "w": rect.width, "h": rect.height]
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

/// A hosting view that takes the first click even in a window that is not in front.
final class Host<Content: View>: NSHostingView<Content> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

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

final class Pagamento: ObservableObject {
    /// The reel's shop has already failed; in everyday use it fails once Pagar is clicked.
    @Published var falhou = !uso
    @Published var processando = false
    func pagar() {
        guard uso, !falhou, !processando else { return }
        withAnimation(.easeOut(duration: 0.15)) { processando = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
            withAnimation(.spring(response: 0.38, dampingFraction: 0.8)) {
                self.processando = false
                self.falhou = true
            }
        }
    }
}

struct Erro: View {
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Color(red: 0.85, green: 0.18, blue: 0.13))
            VStack(alignment: .leading, spacing: 2) {
                Text(L("Não foi possível concluir o pagamento.", "The payment could not go through."))
                Text(L("Erro 500", "Error 500")).fontWeight(.bold)
            }
            .foregroundStyle(Color(red: 0.70, green: 0.14, blue: 0.10))
        }
        .font(.system(size: 13))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(red: 0.99, green: 0.93, blue: 0.92), in: RoundedRectangle(cornerRadius: 10))
    }
}

struct Loja: View {
    @ObservedObject var pagamento: Pagamento
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text(L("LOJA EXEMPLO", "EXAMPLE SHOP")).font(.system(size: 11, weight: .semibold, design: .monospaced)).tracking(1).foregroundStyle(.secondary)
                Text(L("Finalizar compra", "Checkout")).font(.system(size: 22, weight: .semibold)).padding(.top, 4).padding(.bottom, 10)
                linha(L("Tênis de corrida", "Running shoes"), L("R$ 399,90", "$79.90"))
                Divider()
                linha(L("Meias, 3 pares", "Socks, 3 pairs"), L("R$ 59,90", "$12.00"))
                Divider()
                linha("Total", L("R$ 459,80", "$91.90")).fontWeight(.semibold)
            }
            .marca("loja.pedido")
            if !uso {
                Erro().padding(.top, 12).marca("loja.erro")
            }
            Button(action: pagamento.pagar) {
                HStack(spacing: 8) {
                    if pagamento.processando {
                        ProgressView().controlSize(.small).tint(.white)
                        Text(L("Processando…", "Processing…"))
                    } else {
                        Text(L("Pagar R$ 459,80", "Pay $91.90"))
                    }
                }
                .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 42)
                .background(Color(white: pagamento.processando ? 0.25 : 0.07), in: RoundedRectangle(cornerRadius: 10))
                .contentShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
            .padding(.top, 14)
            .marca("loja.pagar")
            if uso {
                // the room for the error is kept from the start, so the window never changes size
                Erro()
                    .opacity(pagamento.falhou ? 1 : 0)
                    .offset(y: pagamento.falhou ? 0 : -6)
                    .padding(.top, 12)
                    .marca("loja.erro")
            }
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

// MARK: the proof (English joke)

/// A photo app with Chloe's post (a photo of Chloe and Emma, liked by Jake) and his chat
/// with Chloe, which has nothing in it: the two screenshots that clear him.
struct Momentos: View {
    let foto = env["PALCO_FOTO"].flatMap { NSImage(contentsOfFile: $0) }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    avatar("C", [Color(red: 1.0, green: 0.78, blue: 0.45), Color(red: 0.96, green: 0.48, blue: 0.36)])
                    Text("chloe.m").font(.system(size: 13, weight: .semibold))
                    Text("· 3:01 AM").font(.system(size: 12)).foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.bottom, 10)
                Group {
                    if let foto { Image(nsImage: foto).resizable().aspectRatio(contentMode: .fill) }
                    else { LinearGradient(colors: [.orange, .pink], startPoint: .top, endPoint: .bottom) }
                }
                .frame(width: 336, height: 210).clipped()
                .clipShape(RoundedRectangle(cornerRadius: 10))
                HStack(spacing: 6) {
                    Image(systemName: "heart.fill").foregroundStyle(Color(red: 0.98, green: 0.22, blue: 0.33))
                    Text("Liked by ").foregroundStyle(.secondary) + Text("jake").fontWeight(.semibold) + Text(" and 23 others").foregroundStyle(.secondary)
                }
                .font(.system(size: 13)).padding(.top, 10)
                (Text("chloe.m ").fontWeight(.semibold) + Text("girls' night with ") + Text("@emma").foregroundStyle(Color(red: 0.04, green: 0.42, blue: 0.85)) + Text(" 💕"))
                    .font(.system(size: 13)).padding(.top, 4).padding(.bottom, 2)
            }
            .marca("prova.post")
            HStack(spacing: 10) {
                avatar("C", [Color(red: 1.0, green: 0.78, blue: 0.45), Color(red: 0.96, green: 0.48, blue: 0.36)])
                VStack(alignment: .leading, spacing: 2) {
                    Text("Chloe").font(.system(size: 13, weight: .semibold))
                    Text("No messages yet").font(.system(size: 12)).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "bubble.left").foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(Color(white: 0.96), in: RoundedRectangle(cornerRadius: 10))
            .padding(.top, 14)
            .marca("prova.conversa")
        }
        .padding(22)
        .frame(width: 380)
        .background(.white)
        .marca("prova")
    }
    func avatar(_ letra: String, _ cores: [Color]) -> some View {
        Circle().fill(LinearGradient(colors: cores, startPoint: .top, endPoint: .bottom))
            .frame(width: 26, height: 26)
            .overlay(Text(letra).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white))
    }
}

// MARK: the chat

final class Conversa: ObservableObject {
    struct Msg: Identifiable { let id = UUID(); let dela: Bool; var texto: String? = nil; var imagens: [NSImage] = [] }
    @Published var msgs: [Msg] = (uso || traicao) ? [] : [
        Msg(dela: true, texto: "Por que você curtiu a foto da Camila às 3 da manhã?"),
        Msg(dela: true, texto: "E ainda mandou mensagem pra ela??"),
        Msg(dela: false, texto: "Amor, eu não mandei mensagem pra ela"),
        Msg(dela: false, texto: "Posso provar. Vou te mandar um print"),
        Msg(dela: true, texto: "Manda."),
    ]
    @Published var digitando = false
    private var envios = 0
    private var comecou = false

    /// Everyday use: support writes first, once the recording is rolling.
    func comecar() {
        guard uso || traicao, !comecou else { return }
        comecou = true
        if traicao {
            responder([(true, "Why did you like Chloe's photo at 3 am?"),
                       (true, "And you texted her??"),
                       (false, "Babe, I never texted her"),
                       (false, "I can prove it. Sending screenshots"),
                       (true, "Go on.")], depois: 0.3)
            return
        }
        responder([(true, "Oi! Um cliente disse que o pagamento não passou."),
                   (true, "Consegue me mandar print do erro e do pedido?")], depois: 0.3)
    }

    /// Prints sent by paste or drop, in the order they come. In everyday use the ones sent
    /// together go as one message, as chat apps send several photos at once.
    func receber(_ urls: [URL]) {
        let imagens = urls.compactMap { NSImage(contentsOf: $0) }
        guard !imagens.isEmpty else { return }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
            if uso || traicao {
                msgs.append(Msg(dela: false, imagens: imagens))
            } else {
                for img in imagens { msgs.append(Msg(dela: false, imagens: [img])) }
            }
        }
        envios += 1
        if traicao {
            if envios == 1 {
                responder([(true, "Ok… you're right."),
                           (true, "But how did you send them so fast?"),
                           (false, "Simple, babe. I'm using Gaveta."),
                           (true, "Nice. I'm trying it too.")], depois: 0.9)
            }
            return
        }
        if uso {
            if envios == 1 {
                responder([(true, imagens.count > 1 ? "Valeu! Com esses dois já achei o problema." : "Valeu!")], depois: 0.8)
            }
            return
        }
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
            if msg.imagens.count == 1, let img = msg.imagens.first {
                foto(img).frame(maxWidth: 190, maxHeight: 190)
            } else if !msg.imagens.isEmpty {
                VStack(alignment: .trailing, spacing: 4) {
                    ForEach(Array(msg.imagens.enumerated()), id: \.offset) { _, img in foto(img).frame(maxWidth: 230, maxHeight: traicao ? 200 : 150) }
                }
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
    func foto(_ img: NSImage) -> some View {
        Image(nsImage: img).resizable().aspectRatio(contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.black.opacity(0.08)))
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
                Circle().fill(LinearGradient(colors: uso
                        ? [Color(red: 0.36, green: 0.82, blue: 0.75), Color(red: 0.10, green: 0.55, blue: 0.58)]
                        : [Color(red: 0.97, green: 0.66, blue: 0.77), Color(red: 0.87, green: 0.39, blue: 0.6)],
                        startPoint: .top, endPoint: .bottom))
                    .frame(width: 26, height: 26).overlay(Text(uso ? "R" : traicao ? "E" : "B").font(.system(size: 12, weight: .semibold)).foregroundStyle(.white))
                VStack(alignment: .leading, spacing: 0) {
                    Text(uso ? "Rafa" : traicao ? "Emma" : "Bia").font(.system(size: 14, weight: .semibold))
                    if uso { Text("Suporte").font(.system(size: 11)).foregroundStyle(.secondary) }
                }
            }
            .frame(maxWidth: .infinity).padding(.vertical, 9)
            Divider()
            ScrollViewReader { leitor in
                ScrollView {
                    VStack(spacing: 5) {
                        Text(uso ? "Hoje 14:32" : traicao ? "Today 3:12 AM" : "Hoje 03:12").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary).padding(.bottom, 4)
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
                Text(L("Mensagem", "Message")).foregroundStyle(.tertiary)
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
    let pagamento = Pagamento()

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
            let host = Host(rootView: view.environment(\.janela, caixa))
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
        let px = Double(env["PALCO_LOJA_X"] ?? "") ?? 150
        let py = Double(env["PALCO_LOJA_TOP"] ?? "") ?? 190
        let cx = Double(env["PALCO_CHAT_X"] ?? "") ?? 590
        let cy = Double(env["PALCO_CHAT_TOP"] ?? "") ?? 250
        if traicao {
            _ = janela("Moments", x: px, top: Double(env["PALCO_LOJA_TOP"] ?? "") ?? 150, Momentos())
        } else {
            _ = janela(L("Loja Exemplo", "Example Shop"), x: px, top: py, Loja(pagamento: pagamento))
        }
        let chat = janela(uso ? "Suporte" : traicao ? "Chat" : "Conversa", x: cx, top: cy, Chat(conversa: conversa))
        chat.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        DistributedNotificationCenter.default().addObserver(forName: Notification.Name("local.gaveta.palco.comecar"), object: nil, queue: .main) { [weak self] _ in
            self?.conversa.comecar()
        }

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
