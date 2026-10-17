import SwiftUI

/// One capture as an index card: a tab with when it was taken, the whole
/// picture and what it is. How big the picture is depends on how much of
/// the card shows: whole, it fills the card's width with the words under
/// it; as a band behind other cards, it is a small picture with the words
/// beside it. Either way the capture is never cropped.
struct CardView: View {
    let pin: Pin
    /// How much of the card shows above the one in front of it.
    let reveal: CGFloat
    let hovered: Bool
    let selected: Bool
    /// Something is selected, so every card shows its circle.
    let selecting: Bool
    let copied: Bool
    let dragging: Bool
    /// Flying in or being thrown out: the card keeps its place unseen.
    var hidden = false
    /// The drawer's width this card was laid out for. Its layout reads the
    /// width from DrawerLayout, which SwiftUI does not watch: as an input, a
    /// new width redraws every card, even the bands nobody touched.
    var width = DrawerLayout.boxWidth

    var body: some View {
        let whole = CardStack.isWhole(reveal)
        let photo = CardStack.photoSize(for: pin.thumbnail.size, reveal: reveal)
        ZStack(alignment: .topLeading) {
            // The shadow comes from the paper alone: cheap to draw as cards move.
            RoundedRectangle(cornerRadius: 4, style: .continuous).fill(Palette.paper)
                .shadow(color: .black.opacity(0.28), radius: 6, y: -4)
            // Centred in its slot, so narrow and wide captures line up and the
            // words beside them start at the same place on every card.
            let slot = whole ? CardStack.photoWidth : CardStack.bandPhotoWidth
            picture(size: photo)
                .offset(x: CardStack.border + (slot - photo.width) / 2, y: CardStack.border)
            caption(whole: whole, under: CardStack.border + photo.height + 6)
        }
        .frame(width: CardStack.cardWidth, height: CardStack.cardHeight, alignment: .topLeading)
        .overlay {
            if selected {
                RoundedRectangle(cornerRadius: 4, style: .continuous).strokeBorder(Color.accentColor, lineWidth: 2)
            }
        }
        .overlay(alignment: .topLeading) {
            if hovered || selecting || selected {
                SelectCircle(selected: selected)
                    .padding(14)
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            }
        }
        .overlay(alignment: .topTrailing) {
            if hovered {
                CloseMark()
                    .padding(14)
                    .transition(.opacity)
            }
        }
        .overlay(alignment: .topLeading) {
            if copied {
                let slot = whole ? CardStack.photoWidth : CardStack.bandPhotoWidth
                Stamp().position(x: CardStack.border + slot / 2, y: CardStack.border + photo.height / 2)
            }
        }
        .overlay(alignment: .topLeading) {
            tab.offset(x: CardStack.tabX, y: -CardStack.tabSize.height)
        }
        .opacity(hidden ? 0 : dragging ? 0.45 : 1)
        .animation(.easeOut(duration: 0.15), value: hovered)
        .animation(.easeOut(duration: 0.2), value: copied)
    }

    private func picture(size: CGSize) -> some View {
        Image(nsImage: pin.thumbnail)
            .resizable()
            .interpolation(.high)
            .frame(width: size.width, height: size.height)
            .clipShape(RoundedRectangle(cornerRadius: 2, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 2, style: .continuous).strokeBorder(.black.opacity(0.1), lineWidth: 0.5))
            .overlay {
                if pin.isVideo {
                    let side = min(36, size.height * 0.6)
                    Image(systemName: "play.fill")
                        .font(.system(size: side * 0.4, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: side, height: side)
                        .background(Circle().fill(Color.black.opacity(0.55)))
                }
            }
    }

    /// Under the picture on a whole card; beside it, on two lines, in a band.
    /// Always within the card, at any width of the drawer: what does not fit
    /// is cut, never runs past the edge. Each stands at its own place, so the
    /// one fading out as a card turns from whole to band, or back, does not
    /// slide past the edge. `under` is where the words go below the picture.
    private func caption(whole: Bool, under: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            if whole {
                Text("\(pin.kind) · \(pin.detail)")
                    .frame(width: CardStack.photoWidth, alignment: .leading)
                    .offset(x: CardStack.border, y: under)
                    .transition(.opacity)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text(pin.kind).fontWeight(.medium).foregroundStyle(Palette.ink)
                    Text(pin.detail)
                }
                .frame(width: CardStack.bandWordsWidth, alignment: .leading)
                .offset(x: CardStack.bandWordsX, y: CardStack.border + 3)
                .transition(.opacity)
            }
        }
        .font(.system(size: 11))
        .monospacedDigit()
        .foregroundStyle(Palette.meta)
        .lineLimit(1)
        .truncationMode(.tail)
    }

    private var tab: some View {
        TimelineView(.periodic(from: .now, by: 30)) { context in
            Text(RelativeTime.string(for: pin.date, now: context.date))
        }
        .font(Typewriter.font(11))
        .foregroundStyle(selected ? Color.white : Palette.ink)
        .frame(width: CardStack.tabSize.width, height: CardStack.tabSize.height)
        .background(UnevenRoundedRectangle(topLeadingRadius: 5, topTrailingRadius: 5, style: .continuous)
            .fill(selected ? Color.accentColor : Palette.paper))
        .shadow(color: .black.opacity(0.15), radius: 3, y: -2)
    }
}

/// The circle in a card's corner: empty to pick, filled when picked.
struct SelectCircle: View {
    let selected: Bool

    var body: some View {
        ZStack {
            if selected {
                Circle().fill(.white).padding(1.5)
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 19))
                    .foregroundStyle(Color.accentColor)
            } else {
                Circle().fill(Color.black.opacity(0.3))
                Circle().strokeBorder(.white, lineWidth: 1.5)
            }
        }
        .frame(width: 20, height: 20)
        .shadow(color: .black.opacity(0.35), radius: 1.5, y: 0.5)
    }
}

/// The cross in a card's corner that takes it out of the drawer.
struct CloseMark: View {
    var body: some View {
        Image(systemName: "xmark")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 20, height: 20)
            .background(Circle().fill(Color.black.opacity(0.7)))
            .shadow(color: .black.opacity(0.35), radius: 1.5, y: 0.5)
    }
}

/// A rubber stamp pressed on a card that was just copied.
struct Stamp: View {
    var body: some View {
        Text("COPIADO")
            .font(Typewriter.font(20))
            .tracking(2.4)
            .foregroundStyle(Palette.stamp)
            .padding(.horizontal, 10)
            .padding(.vertical, 2)
            .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Palette.stamp, lineWidth: 2.5))
            .rotationEffect(.degrees(-12))
            .opacity(0.9)
            .blendMode(.multiply)
            .fixedSize()
            .transition(.asymmetric(insertion: .scale(scale: 1.6).combined(with: .opacity), removal: .opacity))
    }
}

/// A new card drops into the drawer; a discarded one falls out of it.
struct CardMotion: ViewModifier {
    var drop: CGFloat = 0
    var fall: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .rotationEffect(.degrees(-3 * drop - 12 * fall), anchor: .bottom)
            .offset(x: -30 * fall, y: -50 * drop + 120 * fall)
            .opacity(1 - max(drop, fall))
    }
}

extension AnyTransition {
    static var card: AnyTransition {
        .asymmetric(insertion: .modifier(active: CardMotion(drop: 1), identity: CardMotion()),
                    removal: .modifier(active: CardMotion(fall: 1), identity: CardMotion()))
    }
}

/// "agora", "há 5 min", "há 2 h", "ontem", "14 de out".
enum RelativeTime {
    private static let dayFormat: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "d 'de' MMM"
        return formatter
    }()

    static func string(for date: Date, now: Date) -> String {
        let seconds = now.timeIntervalSince(date)
        if seconds < 60 { return "agora" }
        if seconds < 3600 { return "há \(Int(seconds / 60)) min" }
        if Calendar.current.isDate(date, inSameDayAs: now) { return "há \(Int(seconds / 3600)) h" }
        if Calendar.current.isDateInYesterday(date) { return "ontem" }
        return dayFormat.string(from: date).replacingOccurrences(of: ".", with: "")
    }
}
