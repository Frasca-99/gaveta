import AppKit
import ImageIO
import QuartzCore
import SwiftUI

/// Where on screen a screenshot was taken. macOS writes the captured area
/// on the file as [x, y, width, height] in points, counted from the top-left
/// of the main display; AppKit counts from its bottom-left.
func captureRect(of url: URL) -> CGRect? {
    let name = "com.apple.metadata:kMDItemScreenCaptureGlobalRect"
    let size = getxattr(url.path, name, nil, 0, 0, 0)
    guard size > 0 else { return nil }
    var data = Data(count: size)
    let read = data.withUnsafeMutableBytes { getxattr(url.path, name, $0.baseAddress, size, 0, 0) }
    guard read == size,
          let values = (try? PropertyListSerialization.propertyList(from: data, format: nil)) as? [NSNumber],
          values.count == 4, let main = NSScreen.screens.first else { return nil }
    let rect = CGRect(x: values[0].doubleValue, y: values[1].doubleValue,
                      width: values[2].doubleValue, height: values[3].doubleValue)
    guard rect.width > 1, rect.height > 1 else { return nil }
    return CGRect(x: rect.minX, y: main.frame.maxY - rect.maxY, width: rect.width, height: rect.height)
}

/// Cards moving between the screen and the drawer, drawn in a clear window
/// above everything so the drawer's edges never cut them off.
///
/// Coming in, a new capture lifts off the spot where it was taken and slides
/// into the drawer. On the way it shrinks to the size of a card and turns
/// into one: the paper, the tab and the words come in around the picture, so
/// on landing it is the card already standing in the drawer.
///
/// Going out, a discarded card is pulled out of the drawer by its tab and
/// let go, tumbling down off the bottom of the screen.
@MainActor
final class Flights {
    private var window: NSPanel?
    private var inFlight = 0

    /// Flights hold a large picture each, so in a burst of captures only a
    /// couple fly and the rest simply drop in. Nothing flies when the system
    /// asks for less motion.
    var canFly: Bool {
        inFlight < 2 && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
    }

    private static let duration: CFTimeInterval = 0.78
    private static let paper = NSColor(srgbRed: 0xFB / 255.0, green: 0xF8 / 255.0, blue: 0xF1 / 255.0, alpha: 1).cgColor
    private static let ink = NSColor(srgbRed: 0x3A / 255.0, green: 0x2A / 255.0, blue: 0x14 / 255.0, alpha: 1).cgColor
    private static let meta = NSColor(srgbRed: 0x6A / 255.0, green: 0x64 / 255.0, blue: 0x58 / 255.0, alpha: 1).cgColor

    /// The capture's picture, sharp at the size it starts at.
    static func image(for url: URL, fitting rect: CGRect, scale: CGFloat) async -> CGImage? {
        let pixels = max(rect.width, rect.height) * scale
        return await Task.detached(priority: .userInitiated) {
            guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: pixels,
                kCGImageSourceCreateThumbnailWithTransform: true,
            ]
            return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
        }.value
    }

    /// Flies `pin`, whose picture is `image`, from `start` to the card's
    /// place in the drawer, both in screen coordinates.
    func fly(_ pin: Pin, image: CGImage, from start: CGRect, to card: CGRect, on screen: NSScreen,
             glass: Bool = false, landed: @escaping () -> Void) {
        let window = overlay(on: screen)
        guard let root = window.contentView?.layer else { return landed() }
        inFlight += 1

        // The card as it will stand, in a layer's own coordinates (y up):
        // the picture centred in its slot near the top, words under it, the
        // tab above the right of its top edge.
        let size = CGSize(width: CardStack.cardWidth, height: CardStack.cardHeight)
        let photo = CardStack.photoSize(for: pin.thumbnail.size, reveal: CardStack.cardHeight)
        let photoTop = glass ? GlassCardView.photoTop(photo, slot: CardStack.photoHeight) : CardStack.border
        let photoFrame = CGRect(x: CardStack.border + (CardStack.photoWidth - photo.width) / 2,
                                y: size.height - photoTop - photo.height,
                                width: photo.width, height: photo.height)
        let scale = screen.backingScaleFactor
        // The glass drawer's cards are plain, rounder and follow light or dark.
        var paper = Self.paper
        var meta = Self.meta
        if glass {
            NSApp.effectiveAppearance.performAsCurrentDrawingAppearance {
                paper = NSColor.controlBackgroundColor.cgColor
                meta = NSColor.secondaryLabelColor.cgColor
            }
        }

        let flyer = CALayer()
        flyer.bounds = CGRect(origin: .zero, size: size)
        flyer.anchorPoint = CGPoint(x: photoFrame.midX / size.width, y: photoFrame.midY / size.height)
        flyer.cornerRadius = glass ? GlassCardView.radius : 4
        flyer.shadowColor = NSColor.black.cgColor
        flyer.shadowOffset = CGSize(width: 0, height: -6)
        flyer.shadowRadius = 12

        let picture = CALayer()
        picture.frame = photoFrame
        picture.contents = image
        picture.contentsGravity = .resize
        picture.cornerRadius = glass ? 6 : 2
        picture.masksToBounds = true
        flyer.addSublayer(picture)

        let caption = Self.text("\(pin.kind) · \(pin.detail)", font: .systemFont(ofSize: 11), color: meta, scale: scale)
        let captionY = glass ? size.height - GlassCardView.captionTop(slot: CardStack.photoHeight) - 14 : photoFrame.minY - 6 - 14
        caption.frame = CGRect(x: CardStack.border + (glass ? 2 : 0), y: captionY, width: size.width - 16, height: 14)
        flyer.addSublayer(caption)

        // On a glass card the age stands at the right of the words, not on a tab.
        let age = Self.text("agora", font: .systemFont(ofSize: 11), color: meta, scale: scale)
        age.alignmentMode = .right
        age.frame = CGRect(x: CardStack.border, y: captionY, width: CardStack.photoWidth - 2, height: 14)
        age.isHidden = !glass
        flyer.addSublayer(age)

        let tab = CALayer()
        tab.frame = CGRect(x: CardStack.tabX, y: size.height, width: CardStack.tabSize.width, height: CardStack.tabSize.height)
        tab.backgroundColor = Self.paper
        tab.cornerRadius = 5
        tab.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        let label = Self.text("agora", font: NSFont(name: "American Typewriter", size: 11) ?? .systemFont(ofSize: 11),
                              color: Self.ink, scale: scale)
        label.alignmentMode = .center
        label.frame = tab.bounds.insetBy(dx: 0, dy: 2)
        tab.addSublayer(label)
        tab.isHidden = glass
        flyer.addSublayer(tab)

        let origin = window.frame.origin
        let from = CGPoint(x: start.midX - origin.x, y: start.midY - origin.y)
        let to = CGPoint(x: card.minX + photoFrame.midX - origin.x, y: card.minY + photoFrame.midY - origin.y)
        let startScale = start.width / max(photo.width, 1)

        // Final values on the model, so the layer rests there when done.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        flyer.position = to
        flyer.backgroundColor = paper
        flyer.shadowOpacity = 0.28
        caption.opacity = 1
        tab.opacity = 1
        root.addSublayer(flyer)
        CATransaction.commit()

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            MainActor.assumeIsolated {
                landed()
                // The card underneath has taken over: let go of the flyer.
                CATransaction.begin()
                CATransaction.setAnimationDuration(0.12)
                CATransaction.setCompletionBlock {
                    MainActor.assumeIsolated {
                        flyer.removeFromSuperlayer()
                        self?.finished()
                    }
                }
                flyer.opacity = 0
                CATransaction.commit()
            }
        }

        // An arc: up a little first, then down into the drawer's slot.
        let path = CGMutablePath()
        path.move(to: from)
        path.addQuadCurve(to: to, control: CGPoint(x: from.x + (to.x - from.x) * 0.55, y: max(from.y, to.y) + 140))
        let move = CAKeyframeAnimation(keyPath: "position")
        move.path = path
        move.timingFunction = CAMediaTimingFunction(controlPoints: 0.45, 0, 0.2, 1)

        // Lifts off the screen, shrinks to a card while tilting through the
        // turn, and stands up straight as it lands.
        let turn = CAKeyframeAnimation(keyPath: "transform")
        turn.values = [
            CATransform3DMakeScale(startScale, startScale, 1),
            CATransform3DMakeScale(startScale * 1.04, startScale * 1.04, 1),
            CATransform3DRotate(CATransform3DMakeScale(1.12, 1.12, 1), -0.07, 0, 0, 1),
            CATransform3DIdentity,
        ].map { NSValue(caTransform3D: $0) }
        turn.keyTimes = [0, 0.14, 0.72, 1]
        turn.timingFunctions = [CAMediaTimingFunction(name: .easeOut), CAMediaTimingFunction(name: .easeInEaseOut),
                                CAMediaTimingFunction(name: .easeOut)]

        let paperIn = CAKeyframeAnimation(keyPath: "backgroundColor")
        paperIn.values = [paper.copy(alpha: 0)!, paper.copy(alpha: 0)!, paper]
        paperIn.keyTimes = [0, 0.45, 0.8]

        let shadow = CAKeyframeAnimation(keyPath: "shadowOpacity")
        shadow.values = [0, 0.4, 0.28]
        shadow.keyTimes = [0, 0.14, 1]

        let wordsIn = CAKeyframeAnimation(keyPath: "opacity")
        wordsIn.values = [0, 0, 1]
        wordsIn.keyTimes = [0, 0.7, 1]

        for animation in [move, turn, paperIn, shadow] {
            animation.duration = Self.duration
            flyer.add(animation, forKey: animation.keyPath)
        }
        for layer in [caption, tab, age] {
            let fade = wordsIn.copy() as! CAKeyframeAnimation
            fade.duration = Self.duration
            layer.add(fade, forKey: "opacity")
        }
        CATransaction.commit()
    }

    private static let tossDuration: CFTimeInterval = 0.64

    /// Throws `pin`'s card out of the drawer from `card`, its place on
    /// screen, after `delay` seconds. The card is built from plain layers,
    /// ready at once: drawing it as an image first held the drawer up for a
    /// moment on every X, and the next card had to wait.
    func toss(_ pin: Pin, from card: CGRect, on screen: NSScreen, delay: CFTimeInterval, glass: Bool = false) {
        guard !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion else { return }
        let window = overlay(on: screen)
        guard let root = window.contentView?.layer else { return }
        inFlight += 1

        let origin = window.frame.origin
        let frame = CGRect(x: card.minX - origin.x, y: card.minY - origin.y, width: card.width, height: card.height)
        let flyer = cardFace(for: pin, glass: glass, scale: screen.backingScaleFactor)
        flyer.frame = frame

        let start = CGPoint(x: frame.midX, y: frame.midY)
        let pulled = CGPoint(x: start.x - 90, y: start.y + 30)
        let gone = CGPoint(x: start.x - 190, y: -frame.height)

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        flyer.position = gone
        flyer.opacity = 0
        root.addSublayer(flyer)
        CATransaction.commit()

        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            MainActor.assumeIsolated {
                flyer.removeFromSuperlayer()
                self?.finished()
            }
        }
        // Out by the tab, easing as it clears the drawer, then falling,
        // faster and faster, turning over as it goes.
        let move = CAKeyframeAnimation(keyPath: "position")
        move.values = [start, pulled, gone].map { NSValue(point: $0) }
        move.keyTimes = [0, 0.3, 1]
        move.timingFunctions = [CAMediaTimingFunction(name: .easeOut), CAMediaTimingFunction(controlPoints: 0.55, 0, 0.9, 0.6)]

        let turn = CAKeyframeAnimation(keyPath: "transform")
        turn.values = [
            CATransform3DIdentity,
            CATransform3DRotate(CATransform3DMakeScale(1.04, 1.04, 1), 0.1, 0, 0, 1),
            CATransform3DRotate(CATransform3DMakeScale(0.9, 0.9, 1), 0.65, 0, 0, 1),
        ].map { NSValue(caTransform3D: $0) }
        turn.keyTimes = [0, 0.3, 1]

        let fade = CAKeyframeAnimation(keyPath: "opacity")
        fade.values = [1, 1, 0]
        fade.keyTimes = [0, 0.72, 1]

        for animation in [move, turn, fade] {
            animation.duration = Self.tossDuration
            animation.beginTime = CACurrentMediaTime() + delay
            animation.fillMode = .backwards
            flyer.add(animation, forKey: animation.keyPath)
        }
        CATransaction.commit()
    }

    /// A card as it stands whole, without the marks the pointer brings, in
    /// layers (y up): the paper or the glass drawer's card, the picture, the
    /// words, and the tab on top for the card catalog.
    private func cardFace(for pin: Pin, glass: Bool, scale: CGFloat) -> CALayer {
        let size = CGSize(width: CardStack.cardWidth, height: CardStack.cardHeight)
        var paper = Self.paper
        var meta = Self.meta
        var edge = NSColor.black.withAlphaComponent(0.08).cgColor
        if glass {
            NSApp.effectiveAppearance.performAsCurrentDrawingAppearance {
                paper = NSColor.controlBackgroundColor.cgColor
                meta = NSColor.secondaryLabelColor.cgColor
                edge = NSColor.labelColor.withAlphaComponent(0.08).cgColor
            }
        }
        let radius = glass ? GlassCardView.radius : 4
        let face = CALayer()
        face.bounds = CGRect(origin: .zero, size: size)
        face.backgroundColor = paper
        face.cornerRadius = radius
        face.cornerCurve = .continuous
        if glass {
            face.borderWidth = 0.5
            face.borderColor = edge
        }
        face.shadowColor = NSColor.black.cgColor
        face.shadowOpacity = glass ? 0.16 : 0.28
        face.shadowRadius = glass ? 10 : 6
        face.shadowOffset = CGSize(width: 0, height: glass ? 2 : 4)
        face.shadowPath = CGPath(roundedRect: face.bounds, cornerWidth: radius, cornerHeight: radius, transform: nil)
        face.contentsScale = scale

        let photo = CardStack.photoSize(for: pin.thumbnail.size, reveal: CardStack.cardHeight)
        let top = glass ? GlassCardView.photoTop(photo, slot: CardStack.photoHeight) : CardStack.border
        let picture = CALayer()
        picture.frame = CGRect(x: CardStack.border + (CardStack.photoWidth - photo.width) / 2, y: size.height - top - photo.height,
                               width: photo.width, height: photo.height)
        picture.contents = pin.thumbnail.cgImage(forProposedRect: nil, context: nil, hints: nil)
        picture.contentsGravity = .resize
        picture.cornerRadius = glass ? 6 : 2
        picture.cornerCurve = .continuous
        picture.masksToBounds = true
        face.addSublayer(picture)

        let age = RelativeTime.string(for: pin.date, now: Date())
        let wordsTop = glass ? GlassCardView.captionTop(slot: CardStack.photoHeight) : top + photo.height + 6
        let caption = Self.text("\(pin.kind) · \(pin.detail)", font: .systemFont(ofSize: 11), color: meta, scale: scale)
        caption.frame = CGRect(x: CardStack.border + (glass ? 2 : 0), y: size.height - wordsTop - 14, width: size.width - 16, height: 14)
        face.addSublayer(caption)

        if glass {
            let when = Self.text(age, font: .systemFont(ofSize: 11), color: meta, scale: scale)
            when.alignmentMode = .right
            when.frame = CGRect(x: CardStack.border, y: caption.frame.minY, width: CardStack.photoWidth - 2, height: 14)
            face.addSublayer(when)
        } else {
            let tab = CALayer()
            tab.frame = CGRect(x: CardStack.tabX, y: size.height, width: CardStack.tabSize.width, height: CardStack.tabSize.height)
            tab.backgroundColor = paper
            tab.cornerRadius = 5
            tab.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
            let label = Self.text(age, font: NSFont(name: "American Typewriter", size: 11) ?? .systemFont(ofSize: 11),
                                  color: Self.ink, scale: scale)
            label.alignmentMode = .center
            label.frame = tab.bounds.insetBy(dx: 0, dy: 2)
            tab.addSublayer(label)
            face.addSublayer(tab)
        }
        return face
    }

    private func finished() {
        inFlight -= 1
        if inFlight == 0 { window?.orderOut(nil) }
    }

    /// A clear window over the whole screen, above the drawer, that never
    /// takes a click.
    private func overlay(on screen: NSScreen) -> NSPanel {
        let panel = window ?? {
            let panel = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel],
                                backing: .buffered, defer: false)
            panel.isOpaque = false
            panel.backgroundColor = .clear
            panel.hasShadow = false
            panel.ignoresMouseEvents = true
            panel.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 1)
            panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
            let view = NSView()
            view.wantsLayer = true
            panel.contentView = view
            window = panel
            return panel
        }()
        if panel.frame != screen.frame { panel.setFrame(screen.frame, display: false) }
        panel.orderFrontRegardless()
        return panel
    }

    private static func text(_ string: String, font: NSFont, color: CGColor, scale: CGFloat) -> CATextLayer {
        let layer = CATextLayer()
        layer.string = string
        layer.font = font
        layer.fontSize = font.pointSize
        layer.foregroundColor = color
        layer.contentsScale = scale
        layer.truncationMode = .end
        return layer
    }
}
