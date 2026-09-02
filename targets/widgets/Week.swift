import SwiftUI
import WidgetKit

/**
 * This week — the seven evenings, as an agenda.
 *
 * A different question from Tonight's, asked at a different moment.
 * Tonight is the sofa at eight; this is Sunday, working out whether the
 * week holds what you think it holds. It mirrors `WeekView` in the app,
 * including the part that matters most: free evenings are shown as
 * free. Filing "nothing" into somebody's week is not the same gesture
 * as showing them a Tuesday they still have.
 *
 * This was seven vertical bars with a day letter under each, and the
 * app's own week was too until it stopped being: a mark in Thursday's
 * column is a puzzle, and "THU 28 · Hades · 2h" is an answer. The app
 * moved to dated rows; a widget that kept the bars would have the Lock
 * Screen and the page telling one week two ways, which is exactly the
 * drift this whole pipeline exists to prevent (§6.1 — the widget is
 * the soul, and a soul that disagrees with the body is a bug).
 *
 * Medium and up, which is every size this widget has: seven rows in a
 * small widget would be four points of leading each. Extra large is
 * the iPad size, and rows get better with width — the blocks keep
 * their proportions and the names stop truncating.
 */

struct WeekEntry: TimelineEntry {
  let date: Date
  let nights: [WeekNight]?
  var pressure: Pressure = .calm
}

struct WeekProvider: TimelineProvider {
  private static let sample: [WeekNight] = [
    WeekNight(day: "MON", date: 17, title: "", hours: 0, finishes: false,
              colour: -1, named: false),
    WeekNight(day: "TUE", date: 18, title: "Hades", hours: 2, finishes: false,
              colour: 0, named: true),
    WeekNight(day: "WED", date: 19, title: "Hades", hours: 2, finishes: false,
              colour: 0, named: false),
    WeekNight(day: "THU", date: 20, title: "", hours: 0, finishes: false,
              colour: -1, named: false),
    WeekNight(day: "FRI", date: 21, title: "Hades", hours: 3, finishes: true,
              colour: 0, named: false),
    WeekNight(day: "SAT", date: 22, title: "Pragmata", hours: 4,
              finishes: false, colour: 1, named: true),
    WeekNight(day: "SUN", date: 23, title: "", hours: 0, finishes: false,
              colour: -1, named: false),
  ]

  func placeholder(in context: Context) -> WeekEntry {
    WeekEntry(date: Date(), nights: Self.sample)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (WeekEntry) -> Void
  ) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    let today = Store.plan().first
    completion(
      WeekEntry(
        date: Date(),
        nights: today?.nights,
        pressure: today?.pressure ?? .calm
      )
    )
  }

  /**
   * The strip re-cut for each morning of the week.
   *
   * Not one list shown for seven days: the app writes what the seven
   * evenings look like from each morning, so the days that have gone
   * fall off the front on their own.
   */
  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<WeekEntry>) -> Void
  ) {
    let entries = planEntries(Store.plan()) { date, day in
      WeekEntry(
        date: date,
        nights: day?.nights,
        pressure: day?.pressure ?? .calm
      )
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

/**
 * One evening, as a row: the date, then a block as wide as the evening
 * is long, carrying what it goes on.
 *
 * A free evening is DRAWN — dashed, and said out loud — because an
 * empty row reads as a gap you failed to fill and a row that says free
 * reads as a night you get back. That is the relief stance (§2.1) in
 * one style rule, and it is the most important line in this file.
 */
struct NightRow: View {
  let night: WeekNight
  /// The longest evening in the week, so the widths compare.
  let tallest: Int
  let compact: Bool

  private var fraction: CGFloat {
    guard tallest > 0, night.hours > 0 else { return 0 }
    return CGFloat(night.hours) / CGFloat(tallest)
  }

  var body: some View {
    HStack(spacing: 8) {
      HStack(spacing: 3) {
        Text(night.day)
          .font(Brand.bold(9))
          .foregroundStyle(Color("$muted"))
        Text("\(night.date)")
          .font(Brand.bold(11))
          .foregroundStyle(night.isFree ? Color("$muted") : .white)
      }
      .frame(width: 38, alignment: .leading)

      GeometryReader { geo in
        if night.isFree {
          RoundedRectangle(cornerRadius: 6)
            .strokeBorder(
              Color.white.opacity(0.16),
              style: StrokeStyle(lineWidth: 1, dash: [3, 3])
            )
            .frame(width: max(geo.size.width * 0.5, 24))
            .overlay(alignment: .leading) {
              Text("free evening")
                .font(Brand.regular(9))
                .foregroundStyle(Color("$muted"))
                .padding(.leading, 7)
            }
        } else {
          // A floor under the width, so a half-hour is still a mark
          // rather than a hairline nobody can see.
          let width = max(geo.size.width * fraction, 30)
          // Whether the words fit inside the block. About five and a
          // half points a character at this size: a short evening's
          // block used to swallow half of "Pragmata · 2h", and a name
          // cut to "Prag" is worse than no name. When the block is too
          // narrow the label steps out beside it, in the row's own ink.
          let fits = width >= CGFloat(label.count) * 5.6 + 14
          HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 6)
              .fill(planColour(night.colour))
              .frame(width: width)
              .overlay(alignment: .leading) {
                if fits {
                  Text(label)
                    .font(Brand.bold(compact ? 9 : 10))
                    // Dark on amber, violet and mint alike — the one
                    // ink all three of the plan's colours take.
                    .foregroundStyle(Color("$ground"))
                    .lineLimit(1)
                    .padding(.horizontal, 7)
                }
              }
            if !fits {
              Text(label)
                .font(Brand.bold(compact ? 9 : 10))
                .foregroundStyle(.white)
                .lineLimit(1)
            }
          }
        }
      }

      // Reserved whether or not the credits roll here, so the rows
      // keep a common right edge.
      Image(systemName: "flag.fill")
        .font(.system(size: 9))
        .foregroundStyle(night.finishes ? Color("$accent") : .clear)
        .frame(width: 10)
        .widgetAccentable()
    }
    .frame(height: compact ? 16 : 20)
  }

  /// A run's first evening carries the name; the rest carry the hours,
  /// which is all they have left to say.
  private var label: String {
    night.named ? "\(night.title) · \(night.hours)h" : "\(night.hours)h"
  }
}

struct WeekView: View {
  let entry: WeekEntry
  var tall: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        Nameplate(text: "THIS WEEK")
        // Beside the label rather than under the chart, because on this
        // widget the chart is the subject and a deadline is a caveat
        // about it. Only when pressing: the calm line belongs on
        // Tonight, where there is one thing to say and room to say it.
        if entry.pressure.isPressing {
          Nameplate(text: "· \(entry.pressure.note.uppercased())",
                    tint: entry.pressure.tint)
        }
      }

      if let nights = entry.nights, !nights.isEmpty {
        let tallest = nights.map(\.hours).max() ?? 0
        let planned = nights.filter { !$0.isFree }
        // Medium has room for five rows at a readable size; the taller
        // families take all seven. Cropping beats cramming — a row a
        // person cannot read is worse than a row that is not there,
        // and the line underneath says how many were left off.
        let room = tall ? 7 : 5
        let shown = Array(nights.prefix(room))

        VStack(spacing: tall ? 5 : 3) {
          ForEach(shown) { night in
            NightRow(night: night, tallest: tallest, compact: !tall)
          }
        }

        Text(summary(planned, of: nights.count, hidden: nights.count - shown.count))
          .font(Brand.regular(tall ? 12 : 11))
          .foregroundStyle(Color("$muted"))
          .lineLimit(1)
      } else {
        Waiting(hint: "Open Sidequest to plan your week")
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(Text(spoken))
  }

  /// The week as a sentence, for VoiceOver: each booked evening in
  /// order, then the nights that are free.
  private var spoken: String {
    guard let nights = entry.nights, !nights.isEmpty else {
      return "This week: no plan yet. Open Sidequest to plan your week."
    }
    let booked = nights.filter { !$0.isFree }
    if booked.isEmpty { return "This week: nothing planned yet." }
    let evenings = booked.map { night in
      "\(night.day) \(night.date), \(night.title), \(spanLabel(night.hours))"
        + (night.finishes ? ", the credits roll" : "")
    }
    let free = nights.count - booked.count
    var line = "This week: " + evenings.joined(separator: "; ")
    if free > 0 { line += ". \(free) \(free == 1 ? "night" : "nights") free" }
    if entry.pressure.isPressing { line += ". \(entry.pressure.note)" }
    return line
  }

  /**
   * The week in one line, and what the rows could not show.
   *
   * Free nights are counted out loud for the same reason they are
   * drawn: a week with three evenings back is good news, and news the
   * app should say rather than leave to be inferred from blank space.
   */
  private func summary(
    _ planned: [WeekNight],
    of total: Int,
    hidden: Int
  ) -> String {
    if planned.isEmpty { return "Nothing planned yet" }
    let free = total - planned.count
    let hours = planned.reduce(0) { $0 + $1.hours }
    var line = free == 0
      ? "\(hours)h planned"
      : "\(hours)h planned · \(free) \(free == 1 ? "night" : "nights") free"
    if hidden > 0 {
      line += " · \(hidden) more \(hidden == 1 ? "night" : "nights")"
    }
    return line
  }
}

struct WeekWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ThisWeek", provider: WeekProvider()) { entry in
      WeekSurface(entry: entry)
    }
    .configurationDisplayName("This week")
    .description("The evenings ahead, dated — and the ones still free.")
    /**
     * `systemExtraLarge` is iPad only, and this is the one widget that
     * earns it: seven columns and a list of runs is a shape that gets
     * better with width, where Tonight's single sentence would just be
     * a very large sentence.
     *
     * It has to be declared here rather than added later — supported
     * families live in the binary, so an iPad size missing from this
     * list costs a build to add.
     */
    .supportedFamilies([.systemMedium, .systemLarge, .systemExtraLarge])
  }
}

struct WeekSurface: View {
  let entry: WeekEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    // Extra large is an iPad size and has more room than large, not
    // less — it takes the same tall treatment rather than falling
    // through to the medium one-liner.
    WeekView(
      entry: entry,
      tall: family == .systemLarge || family == .systemExtraLarge
    )
      .containerBackground(Color("$ground"), for: .widget)
      .widgetURL(Deep.plan)
  }
}
