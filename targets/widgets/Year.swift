import SwiftUI
import UIKit
import WidgetKit

/**
 * The year — the memory card, at home-screen size.
 *
 * The least useful of the three and the one most worth having anyway.
 * Tonight and This week answer questions; this one answers nothing. It
 * is the app's own object on the home screen, filling up a month at a
 * time, and the argument for it is the same as the argument for the
 * memory card itself: finishing things is the point, and a year of it
 * deserves somewhere to be seen.
 *
 * Twelve slots, January first, lit for the months something was
 * finished in — the same grid `LandingMemcard` draws, at a twentieth of
 * the size. The chamfered corner comes with it, because that silhouette
 * is what makes the shape read as saved progress rather than as a
 * calendar.
 */

struct YearEntry: TimelineEntry {
  let date: Date
  let year: Year?
  /// The boxes of the latest games finished, newest first.
  var shelf: [UIImage] = []
}

/// The boxes for a year's shelf, in the order the app listed them.
func shelfFor(_ year: Year?) -> [UIImage] {
  guard let recent = year?.recent, !recent.isEmpty else { return [] }
  let art = Store.art()
  return recent.compactMap { artImage($0, .grid, in: art) }
}

struct YearProvider: TimelineProvider {
  private static let sample = Year(
    year: 2026,
    count: 8,
    hours: 208,
    months: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    recent: nil
  )

  func placeholder(in context: Context) -> YearEntry {
    YearEntry(date: Date(), year: Self.sample)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (YearEntry) -> Void
  ) {
    let year = context.isPreview ? Self.sample : Store.year()
    completion(YearEntry(date: Date(), year: year, shelf: shelfFor(year)))
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<YearEntry>) -> Void
  ) {
    // The year's card is the one thing here that genuinely does not
    // change with the date — only with finishing something, which the
    // app tells this widget about directly. One entry, refreshed at
    // midnight so the "this year" it claims stays true on 1 January.
    let year = Store.year()
    completion(
      Timeline(
        entries: [YearEntry(date: Date(), year: year, shelf: shelfFor(year))],
        policy: .after(nextMidnight())
      )
    )
  }
}

/** The memory card's silhouette: rounded, with the top right cut off. */
struct Shell: Shape {
  var notch: CGFloat = 14
  var radius: CGFloat = 8

  func path(in rect: CGRect) -> Path {
    var path = Path()
    path.move(to: CGPoint(x: rect.minX + radius, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX - notch, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + notch))
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
    path.addQuadCurve(
      to: CGPoint(x: rect.maxX - radius, y: rect.maxY),
      control: CGPoint(x: rect.maxX, y: rect.maxY)
    )
    path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
    path.addQuadCurve(
      to: CGPoint(x: rect.minX, y: rect.maxY - radius),
      control: CGPoint(x: rect.minX, y: rect.maxY)
    )
    path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
    path.addQuadCurve(
      to: CGPoint(x: rect.minX + radius, y: rect.minY),
      control: CGPoint(x: rect.minX, y: rect.minY)
    )
    path.closeSubpath()
    return path
  }
}

/**
 * How lit a month is, by how much happened in it.
 *
 * The card used to be binary — a month either glowed or it did not —
 * which threw away the difference between a March that finished one
 * game and a March that finished four. The app has always sent the
 * count (see `yearShape` in `lib/widgetData`, which says so in as many
 * words); only this side was rounding it to a yes.
 *
 * Three steps and then a ceiling, because a card read at a glance can
 * carry "some", "more" and "a lot" and cannot carry eleven gradations.
 * An empty month is not a faint one: it stays the hairline well, so the
 * grid still reads as twelve slots rather than as a fading ramp.
 */
func monthFill(_ finished: Int) -> Color {
  switch finished {
  case 0: return Color.white.opacity(0.07)
  case 1: return Color("$accent").opacity(0.5)
  case 2: return Color("$accent").opacity(0.75)
  default: return Color("$accent")
  }
}

struct YearView: View {
  let entry: YearEntry
  var wide: Bool

  private let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 4)

  var body: some View {
    /*
     * The medium card gets a shelf.
     *
     * Twelve lit slots say how much of a year happened; they cannot
     * say what. Beside the card, the boxes of the latest games to roll
     * their credits — three of them, at the size a thumbnail is
     * recognised — say exactly what, the way the app's own shelves do.
     * Only where the app had boxes to give: a shelf with nothing on it
     * is not drawn, and the card is the card it always was.
     */
    HStack(alignment: .top, spacing: 12) {
      VStack(alignment: .leading, spacing: 6) {
        if let year = entry.year {
          HStack(alignment: .firstTextBaseline) {
            Text(String(year.year))
              .font(Brand.black(wide ? 22 : 18))
              .foregroundStyle(.white)
            Spacer(minLength: 4)
            // A zero is not an achievement, and the accent is what
            // this app uses to mark one. An empty year says so in the
            // quiet ink and lets the twelve unlit slots do the rest.
            Text("\(year.count) · \(year.hours)h")
              .font(Brand.bold(11))
              .foregroundStyle(
                year.count > 0 ? Color("$accent") : Color("$muted")
              )
          }

          LazyVGrid(columns: columns, spacing: 3) {
            ForEach(0..<12, id: \.self) { month in
              let finished = month < year.months.count ? year.months[month] : 0
              RoundedRectangle(cornerRadius: 2)
                .fill(monthFill(finished))
                .aspectRatio(1.35, contentMode: .fit)
            }
          }

          if wide {
            Text(
              year.count == 0
                ? "nothing finished yet this year"
                : year.count == 1
                  ? "one game finished"
                  : "\(year.count) games finished"
            )
              .font(Brand.regular(12))
              .foregroundStyle(Color("$muted"))
          }
        } else {
          Waiting(
            line: "Nothing yet",
            hint: "Finish something and it lands here"
          )
        }
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      if wide, !entry.shelf.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
          Nameplate(text: "CREDITS", tint: Color("$muted"))
          HStack(spacing: 5) {
            ForEach(Array(entry.shelf.prefix(3).enumerated()), id: \.offset) { pair in
              Image(uiImage: pair.element)
                .resizable()
                .scaledToFill()
                .frame(width: 36, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .accessibilityHidden(true)
            }
          }
          Spacer(minLength: 0)
        }
        .frame(width: 118, alignment: .leading)
      }
    }
    .padding(wide ? 12 : 10)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(Shell().fill(Color("$well")))
    .overlay(Shell().stroke(Color.white.opacity(0.12), lineWidth: 1))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(Text(spoken))
  }

  /// The card as a sentence, so a grid of twelve squares has words.
  private var spoken: String {
    guard let year = entry.year else {
      return "Your year: nothing finished yet. Finish something and it lands here."
    }
    let games = year.count == 1 ? "one game" : "\(year.count) games"
    return "\(year.year): \(games) finished, \(year.hours) hours."
  }
}

struct YearWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TheYear", provider: YearProvider()) { entry in
      YearSurface(entry: entry)
    }
    .configurationDisplayName("The year")
    .description("The games you finished, a month at a time.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct YearSurface: View {
  let entry: YearEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    YearView(entry: entry, wide: family == .systemMedium)
      .containerBackground(Color("$ground"), for: .widget)
      .widgetURL(Deep.memcard)
  }
}
