import WidgetKit
import SwiftUI

/**
 * Tonight, on the home screen.
 *
 * The widget answers the app's one question without opening it: what
 * fits tonight, and how long it runs. That is the whole product stated
 * in the smallest surface it has — and the surface where it is most
 * useful, because the decision it settles happens at eight o'clock on
 * the sofa rather than in a browser tab.
 *
 * Reads from the shared app group, and shows a truthful empty state
 * when there is nothing in it. Nothing writes to that container yet —
 * this target exists in the build so the plan can start being written
 * there over an ordinary update, instead of costing a new binary. Until
 * then the empty state is what ships, and it says so rather than
 * inventing a game.
 */

private let appGroup = "group.com.glstudio.sidequest"

/** What the app will put in the shared container, and the widget reads out. */
struct Evening {
  let title: String
  let hours: Int

  /// The one written by the app, if it has written one yet.
  static func current() -> Evening? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let title = defaults.string(forKey: "tonight.title"),
          !title.isEmpty
    else { return nil }
    let hours = defaults.integer(forKey: "tonight.hours")
    return Evening(title: title, hours: hours)
  }
}

struct TonightEntry: TimelineEntry {
  let date: Date
  let evening: Evening?
}

struct Provider: TimelineProvider {
  /// The gallery preview, before the widget is placed. Never empty: an
  /// empty state in the picker reads as a broken widget.
  func placeholder(in context: Context) -> TonightEntry {
    TonightEntry(date: Date(), evening: Evening(title: "Hades", hours: 2))
  }

  func getSnapshot(in context: Context, completion: @escaping (TonightEntry) -> Void) {
    completion(TonightEntry(date: Date(), evening: Evening.current()))
  }

  /**
   * Refreshed at the top of each hour.
   *
   * The plan changes when the reader changes it, not on a clock, so
   * there is nothing to poll for — but an entry that never expires
   * leaves a stale evening on the screen after midnight. Hourly is the
   * cheapest cadence that keeps "tonight" meaning tonight; the app
   * reloads the timeline directly when it writes a new plan.
   */
  func getTimeline(in context: Context, completion: @escaping (Timeline<TonightEntry>) -> Void) {
    let entry = TonightEntry(date: Date(), evening: Evening.current())
    let nextHour = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(nextHour)))
  }
}

struct TonightView: View {
  var entry: TonightEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("TONIGHT")
        .font(.system(size: 11, weight: .heavy))
        .kerning(1.4)
        .foregroundStyle(Color("$accent"))

      if let evening = entry.evening {
        Text(evening.title)
          .font(.system(size: 19, weight: .bold))
          .foregroundStyle(.white)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
        Text(evening.hours == 1 ? "about 1 hour" : "about \(evening.hours) hours")
          .font(.system(size: 13))
          .foregroundStyle(.white.opacity(0.6))
      } else {
        // Truthful rather than decorative. A widget that invents a game
        // it has not been given is worse than one that admits it is
        // waiting for a plan.
        Text("No plan yet")
          .font(.system(size: 19, weight: .bold))
          .foregroundStyle(.white)
        Text("Open Sidequest to pick a week")
          .font(.system(size: 13))
          .foregroundStyle(.white.opacity(0.6))
          .lineLimit(2)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(Color("$ground"), for: .widget)
  }
}

@main
struct Tonight: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Tonight", provider: Provider()) { entry in
      TonightView(entry: entry)
    }
    .configurationDisplayName("Tonight")
    .description("What fits this evening, and how long it runs.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
