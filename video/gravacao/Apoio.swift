// apoio: small helpers for the film session.
//   apoio prancheta-salvar <arquivo>     keeps every item on the clipboard, every type
//   apoio prancheta-restaurar <arquivo>  puts it back as it was
//   apoio data <arquivo> <minutos-atras>  sets a file's creation date
//   apoio aviso <nome>                    posts a distributed notification (the stage listens)
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else { print("uso: apoio prancheta-salvar|prancheta-restaurar|data|aviso …"); exit(1) }

switch args[1] {
case "prancheta-salvar":
    let items = NSPasteboard.general.pasteboardItems ?? []
    let saved: [[String: Data]] = items.map { item in
        var types: [String: Data] = [:]
        for t in item.types { if let d = item.data(forType: t) { types[t.rawValue] = d } }
        return types
    }
    let data = try PropertyListSerialization.data(fromPropertyList: saved, format: .binary, options: 0)
    try data.write(to: URL(fileURLWithPath: args[2]))
    print("prancheta guardada:", items.count, "itens")
case "prancheta-restaurar":
    let data = try Data(contentsOf: URL(fileURLWithPath: args[2]))
    let saved = try PropertyListSerialization.propertyList(from: data, format: nil) as? [[String: Data]] ?? []
    NSPasteboard.general.clearContents()
    let items = saved.map { types -> NSPasteboardItem in
        let item = NSPasteboardItem()
        for (t, d) in types { item.setData(d, forType: NSPasteboard.PasteboardType(t)) }
        return item
    }
    if !items.isEmpty { NSPasteboard.general.writeObjects(items) }
    print("prancheta restaurada:", items.count, "itens")
case "data":
    let minutes = Double(args.count > 3 ? args[3] : "0") ?? 0
    let date = Date().addingTimeInterval(-minutes * 60)
    try FileManager.default.setAttributes([.creationDate: date, .modificationDate: date], ofItemAtPath: args[2])
    print("data:", args[2], date)
case "aviso":
    DistributedNotificationCenter.default().postNotificationName(Notification.Name(args[2]), object: nil, userInfo: nil, deliverImmediately: true)
    print("aviso:", args[2])
default:
    print("comando desconhecido")
}
