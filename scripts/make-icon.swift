// Draws the Gaveta app icon: a wooden drawer pulled open, two index cards
// with captures standing in it, over a deep green body.
// Usage: swift scripts/make-icon.swift out.png
import AppKit

let size: CGFloat = 1024
let out = CommandLine.arguments.dropFirst().first ?? "icon.png"

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size),
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: r / 255, green: g / 255, blue: b / 255, alpha: a)
}

func shadow(_ alpha: CGFloat, blur: CGFloat, x: CGFloat = 0, y: CGFloat) {
    let s = NSShadow()
    s.shadowColor = color(0, 20, 12, alpha)
    s.shadowBlurRadius = blur
    s.shadowOffset = NSSize(width: x, height: y)
    s.set()
}

let wood = NSGradient(colors: [color(244, 204, 140), color(222, 166, 96), color(190, 132, 70)],
                      atLocations: [0, 0.55, 1], colorSpace: .sRGB)!

// Body, following the macOS icon grid: 824pt square, 100pt margin.
let body = NSRect(x: 100, y: 100, width: 824, height: 824)
let shape = NSBezierPath(roundedRect: body, xRadius: 185, yRadius: 185)

ctx.saveGState()
shadow(0.35, blur: 26, y: -12)
color(14, 58, 44).setFill()
shape.fill()
ctx.restoreGState()

ctx.saveGState()
shape.addClip()
NSGradient(colors: [color(30, 110, 80), color(14, 64, 48), color(8, 40, 30)],
           atLocations: [0, 0.6, 1], colorSpace: .sRGB)!
    .draw(in: body, angle: -70)
NSGradient(colors: [color(255, 255, 255, 0.14), color(255, 255, 255, 0)])!
    .draw(in: NSRect(x: body.minX, y: body.midY, width: body.width, height: body.height / 2), angle: -90)

// The drawer's back and sides, seen over the front: a darker wooden rim.
let back = NSBezierPath(roundedRect: NSRect(x: 236, y: 400, width: 552, height: 96), xRadius: 26, yRadius: 26)
color(150, 98, 50).setFill()
back.fill()
color(92, 58, 28).setFill()
NSBezierPath(roundedRect: NSRect(x: 262, y: 400, width: 500, height: 70), xRadius: 18, yRadius: 18).fill()

// An index card standing in the drawer: a tab on top, a capture on it and
// a typed line under it.
func card(center: NSPoint, width: CGFloat, height: CGFloat, angle: CGFloat, tabX: CGFloat,
          top: NSColor, bottom: NSColor) {
    ctx.saveGState()
    ctx.translateBy(x: center.x, y: center.y)
    ctx.rotate(by: angle * .pi / 180)
    let sheet = NSRect(x: -width / 2, y: -height / 2, width: width, height: height)
    let tab = NSRect(x: sheet.minX + tabX, y: sheet.maxY - 12, width: 112, height: 50)
    let outline = NSBezierPath(roundedRect: sheet, xRadius: 14, yRadius: 14)
    outline.append(NSBezierPath(roundedRect: tab, xRadius: 12, yRadius: 12))
    ctx.saveGState()
    shadow(0.4, blur: 22, y: -8)
    color(251, 248, 241).setFill()
    outline.fill()
    ctx.restoreGState()

    let photo = NSRect(x: sheet.minX + 18, y: sheet.maxY - 18 - height * 0.5, width: width - 36, height: height * 0.5)
    NSGradient(colors: [top, bottom])!.draw(in: NSBezierPath(roundedRect: photo, xRadius: 8, yRadius: 8), angle: -90)
    color(255, 255, 255, 0.85).setFill()
    let bar = NSRect(x: photo.minX, y: photo.maxY - 26, width: photo.width, height: 26)
    NSBezierPath(roundedRect: bar, xRadius: 8, yRadius: 8).fill()
    for (i, dot) in [color(255, 95, 87), color(254, 188, 46), color(40, 200, 64)].enumerated() {
        dot.setFill()
        NSBezierPath(ovalIn: NSRect(x: photo.minX + 12 + CGFloat(i) * 18, y: bar.midY - 5.5, width: 11, height: 11)).fill()
    }
    // What the tab and the line under the picture say, as typed strokes.
    color(106, 100, 88, 0.45).setFill()
    NSBezierPath(roundedRect: NSRect(x: tab.minX + 22, y: tab.midY - 2, width: 68, height: 9), xRadius: 4.5, yRadius: 4.5).fill()
    NSBezierPath(roundedRect: NSRect(x: photo.minX, y: photo.minY - 30, width: 90, height: 10), xRadius: 5, yRadius: 5).fill()
    ctx.restoreGState()
}

card(center: NSPoint(x: 430, y: 590), width: 290, height: 300, angle: -3, tabX: 26,
     top: color(132, 170, 255), bottom: color(84, 110, 220))
card(center: NSPoint(x: 590, y: 560), width: 290, height: 280, angle: 4, tabX: 150,
     top: color(255, 196, 140), bottom: color(232, 120, 96))

// The drawer front, over the captures.
let front = NSRect(x: 196, y: 196, width: 632, height: 250)
let frontPath = NSBezierPath(roundedRect: front, xRadius: 44, yRadius: 44)
ctx.saveGState()
shadow(0.45, blur: 30, y: -14)
color(214, 160, 92).setFill()
frontPath.fill()
ctx.restoreGState()

ctx.saveGState()
frontPath.addClip()
wood.draw(in: front, angle: -90)
// Grain along the front.
color(150, 98, 46, 0.22).setStroke()
for i in 0..<4 {
    let y = front.minY + 46 + CGFloat(i) * 52
    let grain = NSBezierPath()
    grain.move(to: NSPoint(x: front.minX + 30, y: y))
    grain.curve(to: NSPoint(x: front.maxX - 30, y: y + 6),
                controlPoint1: NSPoint(x: front.midX - 120, y: y + 18),
                controlPoint2: NSPoint(x: front.midX + 120, y: y - 14))
    grain.lineWidth = 4
    grain.stroke()
}
// Light along the top edge.
NSGradient(colors: [color(255, 240, 210, 0.7), color(255, 240, 210, 0)])!
    .draw(in: NSRect(x: front.minX, y: front.maxY - 28, width: front.width, height: 28), angle: -90)
ctx.restoreGState()

// The brass pull.
let handle = NSRect(x: front.midX - 110, y: front.midY - 26, width: 220, height: 52)
ctx.saveGState()
shadow(0.4, blur: 12, y: -6)
NSGradient(colors: [color(241, 216, 145), color(201, 162, 75), color(124, 98, 36)],
           atLocations: [0, 0.5, 1], colorSpace: .sRGB)!
    .draw(in: NSBezierPath(roundedRect: handle, xRadius: 26, yRadius: 26), angle: -90)
ctx.restoreGState()

ctx.restoreGState()
NSGraphicsContext.restoreGraphicsState()

let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: out))
