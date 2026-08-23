import SwiftUI
import UIKit
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
 * The app's own face, in the extension's own bundle.
 *
 * An extension is a separate bundle with a separate font registry: the
 * app registering Noah at launch does nothing here. The three files are
 * target resources and declared in this target's `UIAppFonts` (see
 * Info.plist), which is what makes them loadable at all.
 *
 * Every accessor falls back to the system face at a matching weight if
 * the font is missing. `Font.custom` already falls back silently, and
 * silently is the problem — a widget rendering in SF because a resource
 * did not copy looks deliberate, so the fallback is written down here
 * where it can be reasoned about rather than discovered on a home
 * screen.
 *
 * Home-screen families only. Lock Screen accessories stay on the system
 * font on purpose: the system tints and lays them out to sit against a
 * wallpaper, they are rendered at sizes where SF's hinting genuinely
 * beats a display face, and Apple's guidance for accessories is to
 * leave the type alone. Brand where there is room; the platform's own
 * face where the platform owns the surface.
 */
enum Brand {
  static func black(_ size: CGFloat) -> Font { face("Noah-Black", size, .heavy) }
  static func bold(_ size: CGFloat) -> Font { face("Noah-Bold", size, .bold) }
  static func regular(_ size: CGFloat) -> Font {
    face("Noah-Regular", size, .regular)
  }

  private static func face(
    _ name: String,
    _ size: CGFloat,
    _ fallback: Font.Weight
  ) -> Font {
    UIFont(name: name, size: size) == nil
      ? .system(size: size, weight: fallback)
      : .custom(name, size: size)
  }
}

/**
 * The section label every widget opens with.
 *
 * Black, tracked wide and set small — the same nameplate the page uses,
 * now in the same face the page uses it in.
 */
struct Nameplate: View {
  let text: String
  var tint: Color = Color("$accent")

  var body: some View {
    Text(text)
      .font(Brand.black(11))
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
        .font(Brand.bold(18))
        .foregroundStyle(.white)
      Text(hint)
        .font(Brand.regular(12))
        .foregroundStyle(Color("$muted"))
        .lineLimit(2)
    }
  }
}
