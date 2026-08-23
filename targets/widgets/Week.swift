import SwiftUI
import WidgetKit

/**
 * This week — the seven evenings, as a strip.
 *
 * A different question from Tonight's, asked at a different moment.
 * Tonight is the sofa at eight; this is Sunday, working out whether the
 * week holds what you think it holds. It mirrors `WeekView` in the app,
 * including the part that matters most: free evenings are shown as
 * free. Filing "nothing" into somebody's week is not the same gesture
 * as showing them a Tuesday they still have.
 *
 * Medium and large only. Seven columns do not survive a small widget —
 * at that width each night gets about twenty points, which is a column
 * of truncated first letters and no information at all.
 */

struct WeekEntry: TimelineEntry {
  let date: Date
  let nights: [WeekNight]?
}

struct WeekProvider: TimelineProvider {
  private static let sample: [WeekNight] = [
    WeekNight(day: "MON", title: "", hours: 0, finishes: false),
    WeekNight(day: "TUE", title: "Hades", hours: 2, finishes: false),
    WeekNight(day: "WED", title: "Hades", hours: 2, finishes: false),
    WeekNight(day: "THU", title: "", hours: 0, finishes: false),
    WeekNight(day: "FRI", title: "Hades", hours: 3, finishes: true),
    WeekNight(day: "SAT", title: "Pragmata", hours: 4, finishes: false),
    WeekNight(day: "SUN", title: "", hours: 0, finishes: false),
  ]

  func placeholder(in context: Context) -> WeekEntry {
    WeekEntry(date: Date(), nights: Self.sample)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (WeekEntry) -> Void
  ) {
    completion(
      WeekEntry(
        date: Date(),
        nights: context.isPreview ? Self.sample : Store.week()
      )
    )
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<WeekEntry>) -> Void
  ) {
    completion(
      Timeline(
        entries: [WeekEntry(date: Date(), nights: Store.week())],
        policy: .after(nextMidnight())
      )
    )
  }
}

/** One evening: a bar whose height is its hours, or an empty slot. */
struct NightColumn: View {
  let night: WeekNight
  let tallest: Int
  let height: CGFloat

  private var filled: CGFloat {
    guard tallest > 0, night.hours > 0 else { return 0 }
    // A floor under the proportion, so a one-hour evening is still a
    // mark rather than a hairline nobody can see.
    return max(height * CGFloat(night.hours) / CGFloat(tallest), 6)
  }

  var body: some View {
    VStack(spacing: 4) {
      ZStack(alignment: .bottom) {
        RoundedRectangle(cornerRadius: 3)
          .fill(Color.white.opacity(0.07))
          .frame(height: height)
        if !night.isFree {
          RoundedRectangle(cornerRadius: 3)
            .fill(night.finishes ? Color("$violet") : Color("$accent"))
            .frame(height: filled)
        }
      }
      Text(night.day)
        .font(Brand.bold(9))
        .foregroundStyle(night.isFree ? Color("$muted") : .white)
    }
  }
}

struct WeekView: View {
  let entry: WeekEntry
  var tall: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Nameplate(text: "THIS WEEK")

      if let nights = entry.nights {
        let tallest = nights.map(\.hours).max() ?? 0
        let planned = nights.filter { !$0.isFree }

        HStack(alignment: .bottom, spacing: 6) {
          ForEach(nights) { night in
            NightColumn(
              night: night,
              tallest: tallest,
              height: tall ? 64 : 40
            )
          }
        }

        if tall {
          // The large family has room to name the games rather than
          // only chart them, which is the difference between a picture
          // of a week and a week you can read.
          VStack(alignment: .leading, spacing: 3) {
            ForEach(Array(runs(planned).prefix(3)), id: \.self) { line in
              Text(line)
                .font(Brand.regular(13))
                .foregroundStyle(Color("$muted"))
                .lineLimit(1)
            }
          }
        } else {
          Text(summary(planned, of: nights.count))
            .font(Brand.regular(12))
            .foregroundStyle(Color("$muted"))
            .lineLimit(1)
        }
      } else {
        Waiting(hint: "Open Sidequest to plan your week")
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  /// Consecutive evenings on the same game, collapsed — the same unit
  /// `WeekView` uses in the app, because one game across five nights is
  /// one fact, not five.
  private func runs(_ nights: [WeekNight]) -> [String] {
    var out: [String] = []
    var current: (title: String, hours: Int, nights: Int)?
    for night in nights {
      if var run = current, run.title == night.title {
        run.hours += night.hours
        run.nights += 1
        current = run
      } else {
        if let run = current {
          out.append(line(run))
        }
        current = (night.title, night.hours, 1)
      }
    }
    if let run = current { out.append(line(run)) }
    return out
  }

  private func line(_ run: (title: String, hours: Int, nights: Int)) -> String {
    run.nights == 1
      ? "\(run.title) · \(run.hours)h"
      : "\(run.title) · \(run.hours)h across \(run.nights)"
  }

  private func summary(_ planned: [WeekNight], of total: Int) -> String {
    if planned.isEmpty { return "Nothing planned yet" }
    let free = total - planned.count
    let hours = planned.reduce(0) { $0 + $1.hours }
    return free == 0
      ? "\(hours)h planned"
      : "\(hours)h planned · \(free) \(free == 1 ? "night" : "nights") free"
  }
}

struct WeekWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ThisWeek", provider: WeekProvider()) { entry in
      WeekSurface(entry: entry)
    }
    .configurationDisplayName("This week")
    .description("The seven evenings ahead, and the ones still free.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct WeekSurface: View {
  let entry: WeekEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    WeekView(entry: entry, tall: family == .systemLarge)
      .containerBackground(Color("$ground"), for: .widget)
      .widgetURL(Deep.plan)
  }
}
