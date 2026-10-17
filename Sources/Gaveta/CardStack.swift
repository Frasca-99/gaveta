import CoreGraphics

/// Where each card stands in the drawer, from the back (oldest) to the
/// front (newest), and how much of each one shows. The view places the
/// cards with it and the pointer is tested against it, so a click always
/// lands on where a card is headed, never on where an animation happens to
/// have it at that moment.
///
/// The drawer's height is shared out from the front: the newest cards show
/// whole, and the older ones give up room down to a band that still holds
/// a small picture of the whole capture. Only when even those bands run out
/// of room does the drawer scroll.
struct CardStack {
    static let leftInset: CGFloat = 30
    static let rightInset: CGFloat = 14
    static var cardWidth: CGFloat { DrawerLayout.boxWidth - leftInset - rightInset }
    static let border: CGFloat = 8
    static var photoWidth: CGFloat { cardWidth - border * 2 }
    static var photoHeight: CGFloat { (photoWidth * 10 / 16).rounded() }
    static let metaHeight: CGFloat = 24
    static var cardHeight: CGFloat { border + photoHeight + metaHeight }

    /// Room above the backmost card for its tab.
    static let topInset: CGFloat = 26
    static let bottomInset: CGFloat = 12
    /// The least of a card that shows: a band with the whole capture in
    /// small, and what it is beside it.
    static let minReveal: CGFloat = 76
    /// Enough to show a card whole, with the next one's tab just below.
    static var fullReveal: CGFloat { cardHeight + 4 }
    /// Space opened under the card the pointer is on, so it shows whole.
    static let gap: CGFloat = 12
    static let tabSize = CGSize(width: 74, height: 18)
    /// Every tab stands at the card's right, clear of the picture and the
    /// words on the card behind it.
    static var tabX: CGFloat { cardWidth - tabSize.width - 8 }
    /// In a band, the picture is never wider than this, leaving room for
    /// the words beside it.
    static let bandPhotoWidth: CGFloat = 150

    /// The circle and the cross sit in the card's top corners.
    static let dotBox = CGRect(x: 4, y: 4, width: 38, height: 38)
    static var closeBox: CGRect { CGRect(x: cardWidth - 42, y: 4, width: 38, height: 38) }

    let count: Int
    /// The card the pointer is on, counted from the back.
    let hovered: Int?
    private let tops: [CGFloat]
    private let reveals: [CGFloat]

    /// - Parameter room: the height the cards may take at rest before the
    ///   drawer has to scroll.
    init(count: Int, hovered: Int?, room: CGFloat) {
        self.count = count
        self.hovered = hovered

        // At rest, from the front backwards: each card takes as much as it
        // can show, as long as every card behind it keeps its band.
        var reveals = Array(repeating: Self.fullReveal, count: count)
        if count > 1 {
            let behind = count - 1
            var budget = room - Self.topInset - Self.cardHeight - Self.bottomInset
            for distance in 1...behind {
                let index = count - 1 - distance
                let kept = CGFloat(behind - distance) * Self.minReveal
                let share = min(Self.fullReveal, max(Self.minReveal, budget - kept))
                reveals[index] = share
                budget -= share
            }
        }
        // The card the pointer is on opens up whole; the ones in front of
        // it move down to make room.
        if let hovered, hovered < count - 1 {
            reveals[hovered] = max(reveals[hovered], Self.cardHeight + Self.gap)
        }
        var tops: [CGFloat] = []
        var y = Self.topInset
        for reveal in reveals {
            tops.append(y)
            y += reveal
        }
        self.tops = tops
        self.reveals = reveals
    }

    func top(_ index: Int) -> CGFloat { tops[index] }

    /// How much of a card shows. The front card always shows whole.
    func reveal(_ index: Int) -> CGFloat {
        index == count - 1 ? Self.cardHeight : reveals[index]
    }

    var height: CGFloat {
        count == 0 ? 0 : tops[count - 1] + Self.cardHeight + Self.bottomInset
    }

    /// Shows the whole card, with the words under the picture.
    static func isWhole(_ reveal: CGFloat) -> Bool { reveal >= cardHeight }

    /// The whole capture, as large as the shown part of its card allows:
    /// the full width when the card shows whole, a small picture at the left
    /// of a band otherwise. Never cropped.
    static func photoSize(for image: CGSize, reveal: CGFloat) -> CGSize {
        let whole = isWhole(reveal)
        let maxWidth = whole ? photoWidth : bandPhotoWidth
        let maxHeight = whole ? photoHeight : max(28, reveal - border - 4)
        let aspect = image.width > 0 && image.height > 0 ? image.width / image.height : 16.0 / 10
        var size = CGSize(width: maxWidth, height: maxWidth / aspect)
        if size.height > maxHeight { size = CGSize(width: maxHeight * aspect, height: maxHeight) }
        return CGSize(width: size.width.rounded(), height: size.height.rounded())
    }

    func cardRect(_ index: Int, shift: CGFloat) -> CGRect {
        CGRect(x: Self.leftInset + shift, y: top(index), width: Self.cardWidth, height: Self.cardHeight)
    }

    func tabRect(_ index: Int, shift: CGFloat) -> CGRect {
        CGRect(x: Self.leftInset + shift + Self.tabX, y: top(index) - Self.tabSize.height,
               width: Self.tabSize.width, height: Self.tabSize.height)
    }

    /// Pulled out a little on hover, further when selected.
    static func shift(hovered: Bool, selected: Bool) -> CGFloat {
        selected ? (hovered ? -26 : -22) : (hovered ? -10 : 0)
    }

    enum Part { case card, dot, close }

    /// The frontmost card under a point, and which part of it. Each card's
    /// tab rises over the card behind it, so it is tested before that card;
    /// cards without tabs (the glass drawer's) leave that room empty.
    /// `wide` takes a card's whole row, from one side of the drawer to the
    /// other: for the pointer resting on it, not for clicks.
    func hit(_ point: CGPoint, tabs: Bool = true, wide: Bool = false, shift: (Int) -> CGFloat) -> (index: Int, part: Part)? {
        for index in stride(from: count - 1, through: 0, by: -1) {
            let card = cardRect(index, shift: shift(index))
            let row = wide ? CGRect(x: 0, y: card.minY, width: DrawerLayout.boxWidth, height: card.height) : card
            if row.contains(point) {
                let local = CGPoint(x: point.x - card.minX, y: point.y - card.minY)
                if Self.dotBox.contains(local) { return (index, .dot) }
                if Self.closeBox.contains(local) { return (index, .close) }
                return (index, .card)
            }
            if tabs, tabRect(index, shift: shift(index)).contains(point) { return (index, .card) }
        }
        // In the gap opened under the card, the pointer is still on it.
        if let hovered, hovered < count - 1 {
            let card = cardRect(hovered, shift: shift(hovered))
            let gap = reveal(hovered) - Self.cardHeight
            let left = wide ? 0 : card.minX
            let width = wide ? DrawerLayout.boxWidth : card.width
            if CGRect(x: left, y: card.maxY, width: width, height: gap).contains(point) {
                return (hovered, .card)
            }
        }
        return nil
    }
}
