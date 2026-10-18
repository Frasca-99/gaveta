import AVFoundation
import AppKit
import ImageIO
import QuickLookThumbnailing

/// Thumbnails through Quick Look, which draws images and videos alike.
enum Thumbnails {
    /// Large enough for the drag image, which is bigger than the row's.
    static let side: CGFloat = 260

    static func make(for url: URL) async -> NSImage? {
        let request = QLThumbnailGenerator.Request(
            fileAt: url, size: CGSize(width: side, height: side),
            scale: NSScreen.main?.backingScaleFactor ?? 2, representationTypes: .thumbnail)
        return try? await QLThumbnailGenerator.shared.generateBestRepresentation(for: request).nsImage
    }

    /// Under the picture: pixel size for images, length for recordings.
    static func detail(for url: URL) async -> String {
        if FolderWatcher.videoExtensions.contains(url.pathExtension.lowercased()) {
            let seconds = (try? await AVURLAsset(url: url).load(.duration).seconds) ?? 0
            let total = Int(seconds.rounded())
            return String(format: "%d:%02d", total / 60, total % 60)
        }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = props[kCGImagePropertyPixelWidth] as? Int,
              let height = props[kCGImagePropertyPixelHeight] as? Int
        else { return tr("Imagem", "Image") }
        return "\(width) × \(height)"
    }
}
