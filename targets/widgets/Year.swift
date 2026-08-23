import SwiftUI
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
}

struct YearProvider: TimelineProvider {
  private static let sample = Year(
    year: 2026,
    count: 8,
    hours: 208,
    months: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1]
  )

  func placeholder(in context: Context) -> YearEntry {
    YearEntry(date: Date(), year: Self.sample)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (YearEntry) -> Void
  ) {
    completion(
      YearEntry(
        date: Date(),
        year: context.isPreview ? Self.sample : Store.year()
      )
    )
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<YearEntry>) -> Void
  ) {
    completion(
      Timeline(
        entries: [YearEntry(date: Date(), year: Store.year())],
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

struct YearView: View {
  let entry: YearEntry
  var wide: Bool

  private let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 4)

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      if let year = entry.year {
        HStack(alignment: .firstTextBaseline) {
          Text(String(year.year))
            .font(Brand.black(wide ? 22 : 18))
            .foregroundStyle(.white)
          Spacer(minLength: 4)
          Text("\(year.count) · \(year.hours)h")
            .font(Brand.bold(11))
            .foregroundStyle(Color("$accent"))
        }

        LazyVGrid(columns: columns, spacing: 3) {
          ForEach(0..<12, id: \.self) { month in
            let lit = month < year.months.count && year.months[month] > 0
            RoundedRectangle(cornerRadius: 2)
              .fill(lit ? Color("$accent") : Color.white.opacity(0.07))
              .aspectRatio(1.35, contentMode: .fit)
          }
        }

        if wide {
          Text(year.count == 1 ? "one game finished" : "\(year.count) games finished")
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
    .padding(wide ? 12 : 10)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(Shell().fill(Color("$well")))
    .overlay(Shell().stroke(Color.white.opacity(0.12), lineWidth: 1))
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
