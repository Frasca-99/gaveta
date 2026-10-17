// Roteiro <passos.json> [marcas.json]: plays a cursor script with real mouse and key events, the
// way a hand moves (eased, with a slight arc), and writes when each marked moment happened.
// It runs as ~/Applications/Roteiro.app, which needs Accessibility (System Settings → Privacy &
// Security → Accessibility) to move the pointer; it waits up to two minutes for it.
//
// Steps (points from the screen's top left):
//   {"op":"mover", "x":..,"y":..}                       or "alvo":"loja.erro","fx":0.5,"fy":0.5 (from $PALCO_MAPA)
//                                                       or "gaveta":true,"dx":..,"dy":.. (from Gaveta's drawer window)
//      + "ms": duration, "arco": bend factor (default 0.06)
//   {"op":"clicar", <target>, "mods":["cmd"]}  {"op":"apertar"}  {"op":"soltar"}
//   {"op":"arrastar", <target>, "ms":..}       moves with the button held
//   {"op":"tecla","tecla":"4","mods":["cmd","shift"]}
//   {"op":"esperar","ms":..}   {"op":"marca","nome":".."}   {"op":"janelas"} (prints Gaveta's windows)
import AppKit

let args = CommandLine.arguments
guard args.count >= 2, let data = FileManager.default.contents(atPath: args[1]),
      let steps = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
    print("uso: Roteiro passos.json [marcas.json]"); exit(1)
}
let marksPath = args.count > 2 ? args[2] : nil
let mapPath = ProcessInfo.processInfo.environment["PALCO_MAPA"] ?? "/tmp/palco.json"
let trusted = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary)
if let marksPath = args.count > 2 ? args[2] : nil {
    try? (trusted ? "sim" : "nao").write(toFile: marksPath + ".permissao", atomically: true, encoding: .utf8)
}
// Waits up to two minutes for the permission, so the prompt can be answered while it runs.
var allowed = trusted
for _ in 0..<240 where !allowed {
    usleep(500_000)
    allowed = AXIsProcessTrusted()
}
if let marksPath = args.count > 2 ? args[2] : nil {
    try? (allowed ? "sim" : "nao").write(toFile: marksPath + ".permissao", atomically: true, encoding: .utf8)
}
if !allowed { print("sem permissão de acessibilidade"); exit(2) }
let source = CGEventSource(stateID: .hidSystemState)
let start = Date()
var marks: [[String: Any]] = []
var pos = CGEvent(source: nil)?.location ?? .zero
var held = false
var heldFlags: CGEventFlags = []

func now() -> Double { Date().timeIntervalSince(start) }
func pausa(_ ms: Double) { usleep(useconds_t(max(0, ms) * 1000)) }

func flags(_ mods: [String]) -> CGEventFlags {
    var f: CGEventFlags = []
    for m in mods {
        switch m {
        case "cmd": f.insert(.maskCommand)
        case "shift": f.insert(.maskShift)
        case "opt": f.insert(.maskAlternate)
        case "ctrl": f.insert(.maskControl)
        default: break
        }
    }
    return f
}
let modifierKeys: [String: CGKeyCode] = ["cmd": 55, "shift": 56, "opt": 58, "ctrl": 59]
let keyCodes: [String: CGKeyCode] = ["4": 21, "5": 23, "v": 9, "c": 8, "g": 5, "space": 49, "esc": 53, "a": 0]

func post(_ type: CGEventType, at p: CGPoint, flags f: CGEventFlags = [], clicks: Int64 = 1) {
    guard let e = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: p, mouseButton: .left) else { return }
    e.flags = f
    if type == .leftMouseDown || type == .leftMouseUp { e.setIntegerValueField(.mouseEventClickState, value: clicks) }
    e.post(tap: .cghidEventTap)
}

func target(_ s: [String: Any]) -> CGPoint? {
    if let x = s["x"] as? Double, let y = s["y"] as? Double { return CGPoint(x: x, y: y) }
    if let name = s["alvo"] as? String,
       let d = FileManager.default.contents(atPath: mapPath),
       let map = try? JSONSerialization.jsonObject(with: d) as? [String: [String: Double]],
       let r = map[name] {
        let fx = s["fx"] as? Double ?? 0.5, fy = s["fy"] as? Double ?? 0.5
        return CGPoint(x: r["x"]! + r["w"]! * fx + (s["dx"] as? Double ?? 0), y: r["y"]! + r["h"]! * fy + (s["dy"] as? Double ?? 0))
    }
    if s["gaveta"] as? Bool == true, let g = drawerFrame() {
        let dx = s["dx"] as? Double ?? 0, dy = s["dy"] as? Double ?? 0
        let fromRight = s["direita"] as? Bool ?? false
        return CGPoint(x: (fromRight ? g.maxX : g.minX) + dx, y: g.minY + dy)
    }
    return nil
}

/// Gaveta's windows, biggest first: the drawer is the big one at the right edge.
func gavetaWindows() -> [(CGRect, Int, Double)] {
    guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] else { return [] }
    return list.compactMap { w in
        guard (w[kCGWindowOwnerName as String] as? String) == "Gaveta",
              let b = w[kCGWindowBounds as String] as? [String: Double] else { return nil }
        let r = CGRect(x: b["X"]!, y: b["Y"]!, width: b["Width"]!, height: b["Height"]!)
        return (r, w[kCGWindowLayer as String] as? Int ?? 0, w[kCGWindowAlpha as String] as? Double ?? 1)
    }.sorted { $0.0.width * $0.0.height > $1.0.width * $1.0.height }
}
func drawerFrame() -> CGRect? { gavetaWindows().first(where: { $0.1 == 3 })?.0 }

/// An eased path with a slight arc, as a wrist draws it; events every 8 ms.
func move(to p: CGPoint, ms: Double, arc: Double) {
    let from = pos
    let n = max(2, Int(ms / 8))
    let dist = hypot(p.x - from.x, p.y - from.y)
    let bend = min(70, dist * arc)
    // the arc bends away from the direction of travel, always the same side
    let nx = dist > 0 ? -(p.y - from.y) / dist : 0, ny = dist > 0 ? (p.x - from.x) / dist : 0
    for i in 1...n {
        let t = Double(i) / Double(n)
        let e = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2
        let lift = sin(Double.pi * e) * bend
        pos = CGPoint(x: from.x + (p.x - from.x) * e + nx * lift, y: from.y + (p.y - from.y) * e + ny * lift)
        post(held ? .leftMouseDragged : .mouseMoved, at: pos, flags: heldFlags)
        pausa(8)
    }
}

func key(_ k: String, mods: [String]) {
    guard let code = keyCodes[k] else { print("tecla desconhecida", k); return }
    let f = flags(mods)
    for m in mods { if let c = modifierKeys[m] { CGEvent(keyboardEventSource: source, virtualKey: c, keyDown: true)?.post(tap: .cghidEventTap); pausa(18) } }
    let down = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: true); down?.flags = f; down?.post(tap: .cghidEventTap)
    pausa(70)
    let up = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: false); up?.flags = f; up?.post(tap: .cghidEventTap)
    pausa(18)
    for m in mods.reversed() { if let c = modifierKeys[m] { CGEvent(keyboardEventSource: source, virtualKey: c, keyDown: false)?.post(tap: .cghidEventTap); pausa(12) } }
}

for s in steps {
    let op = s["op"] as? String ?? ""
    switch op {
    case "mover", "arrastar":
        guard let p = target(s) else { print("alvo não encontrado", s); continue }
        if op == "arrastar" && !held { post(.leftMouseDown, at: pos, flags: heldFlags); held = true; pausa(60) }
        move(to: p, ms: s["ms"] as? Double ?? 700, arc: s["arco"] as? Double ?? 0.06)
    case "clicar":
        if let p = target(s) { move(to: p, ms: s["ms"] as? Double ?? 650, arc: s["arco"] as? Double ?? 0.06); pausa(110) }
        let f = flags(s["mods"] as? [String] ?? [])
        post(.leftMouseDown, at: pos, flags: f); pausa(85); post(.leftMouseUp, at: pos, flags: f)
    case "apertar":
        heldFlags = flags(s["mods"] as? [String] ?? [])
        post(.leftMouseDown, at: pos, flags: heldFlags); held = true
    case "soltar":
        post(.leftMouseUp, at: pos, flags: heldFlags); held = false; heldFlags = []
    case "tecla":
        key(s["tecla"] as? String ?? "", mods: s["mods"] as? [String] ?? [])
    case "esperar":
        pausa(s["ms"] as? Double ?? 0)
    case "marca":
        let name = s["nome"] as? String ?? "?"
        marks.append(["nome": name, "t": now()])
        print(String(format: "%7.3f  %@", now(), name)); fflush(stdout)
    case "janelas":
        for (r, layer, alpha) in gavetaWindows() { print("Gaveta janela", r, "camada", layer, "alfa", alpha) }
    default:
        print("passo desconhecido", op)
    }
}
if held { post(.leftMouseUp, at: pos, flags: heldFlags) }
if let marksPath, let out = try? JSONSerialization.data(withJSONObject: ["inicio": start.timeIntervalSince1970, "marcas": marks], options: .prettyPrinted) {
    try? out.write(to: URL(fileURLWithPath: marksPath))
}
