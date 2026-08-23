import SwiftUI
import WidgetKit

/**
 * What the widgets read, and where they read it from.
 *
 * A widget extension is its own process with its own sandbox: it cannot
 * call into JavaScript, cannot reach the app's storage, and gets woken
 * by the system at moments the app knows nothing about. The only thing
 * the two share is the app group container, so everything here is
 * written by the app (see `lib/widgetBridge.ts`) as JSON and read back
 * cold.
 *
 * JSON rather than individual keys, deliberately. A widget that reads
 * six separate defaults can be woken halfway through the app writing
 * them and render a title from this week against an hour count from
 * last — one string decoded whole is either the new plan or the old
 * one, never half of each.
 *
 * Every read can fail and every failure is an empty state, never a
 * placeholder pretending to be data. A widget that invents a game is
 * worse than one that admits it is waiting for a plan.
 */

let appGroup = "group.com.glstudio.sidequest"

/** The app's URL scheme, for the tap targets below. */
enum Deep {
  static let plan = URL(string: "sidequest://plan")!
  static let memcard = URL(string: "sidequest://memcard")!
}

// MARK: - What the app writes

struct Tonight: Codable {
  let title: String
  let hours: Int
  /// Whether this evening rolls the credits — the app's own word for it.
  let finishes: Bool
}

struct WeekNight: Codable, Identifiable {
  /// Three letters, already localised and shortened by the app.
  let day: String
  /// Empty for a free evening. Free nights stay free, and the widget
  /// says so rather than hiding them.
  let title: String
  let hours: Int
  let finishes: Bool

  var id: String { day }
  var isFree: Bool { title.isEmpty }
}

struct Year: Codable {
  let year: Int
  let count: Int
  let hours: Int
  /// Twelve entries, January first: how many games finished that month.
  let months: [Int]
}

// MARK: - Reading it

enum Store {
  private static func decode<T: Decodable>(_ type: T.Type, _ key: String) -> T? {
    guard let defaults = UserDefaults(suiteName: appGroup),
      let raw = defaults.string(forKey: key),
      let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
  }

  static func tonight() -> Tonight? { decode(Tonight.self, "tonight") }
  static func week() -> [WeekNight]? {
    guard let nights = decode([WeekNight].self, "week"), !nights.isEmpty else {
      return nil
    }
    return nights
  }
  static func year() -> Year? { decode(Year.self, "year") }
}

// MARK: - The one shared piece of styling

/**
 * When the widget stops trusting its own contents.
 *
 * A timeline entry has no expiry of its own: left alone, "tonight" is
 * still on the Lock Screen at four the next afternoon. Every provider
 * below asks to be refreshed at the next midnight, which is the moment
 * the word stops being true — the app also reloads directly whenever it
 * writes a new plan, so this is the backstop rather than the mechanism.
 */
func nextMidnight(after date: Date = Date()) -> Date {
  let calendar = Calendar.current
  return calendar.nextDate(
    after: date,
    matching: DateComponents(hour: 0, minute: 0),
    matchingPolicy: .nextTime
  ) ?? date.addingTimeInterval(3600)
}

/** "about 2 hours", and never "about 0 hours". */
func spanLabel(_ hours: Int) -> String {
  if hours < 1 { return "a short one" }
  return hours == 1 ? "about 1 hour" : "about \(hours) hours"
}

/**
 * The section label every widget opens with.
 *
 * Heavy, tracked wide and small — the same nameplate treatment the page
 * uses, in the system face. The brand's own Noah is not bundled here:
 * an extension needs the font as a target resource and a `UIAppFonts`
 * entry in its own Info.plist, and neither is expressible in the target
 * config, so it would take a custom prebuild step to add. SF at these
 * weights is what Apple's own widgets use and renders cleanly at every
 * size the Lock Screen asks for.
 */
struct Nameplate: View {
  let text: String
  var tint: Color = Color("$accent")

  var body: some View {
    Text(text)
      .font(.system(size: 11, weight: .heavy))
      .kerning(1.4)
      .foregroundStyle(tint)
  }
}

/** The empty state, written the same way everywhere it appears. */
struct Waiting: View {
  var line: String = "No plan yet"
  var hint: String = "Open Sidequest to pick a week"

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(line)
        .font(.system(size: 18, weight: .bold))
        .foregroundStyle(.white)
      Text(hint)
        .font(.system(size: 12))
        .foregroundStyle(Color("$muted"))
        .lineLimit(2)
    }
  }
}
