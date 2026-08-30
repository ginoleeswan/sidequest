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

  /**
   * One game's own page.
   *
   * For the widget that names a single game: a card that says Hades
   * and opens a list of seven evenings has answered a question nobody
   * asked. Falls back to the plan when the id is missing, which is
   * what an older payload written before the app knew to send it
   * looks like.
   */
  static func game(_ id: Int?) -> URL {
    guard let id, let url = URL(string: "sidequest://game/\(id)") else {
      return plan
    }
    return url
  }
}

// MARK: - What the app writes

struct Tonight: Codable {
  /**
   * The lead game's id, for the tap target.
   *
   * Optional, and that is load-bearing rather than timid. The plan is
   * decoded whole — one missing required field fails the entire array
   * and blanks the widget — so a build that lands before the app has
   * republished must still read the payload it finds. It resolves to
   * the plan page, exactly as it did before this field existed.
   */
  let id: Int?
  let title: String
  let hours: Int
  /// Whether this evening rolls the credits — the app's own word for it.
  let finishes: Bool
}

struct WeekNight: Codable, Identifiable {
  /// Three letters, already localised and shortened by the app.
  let day: String
  /// Day of the month. "THU" is a repeating label; "THU 28" is a date,
  /// and a calendar is a thing that names dates.
  let date: Int
  /// Empty for a free evening. Free nights stay free, and the widget
  /// says so rather than hiding them.
  let title: String
  let hours: Int
  let finishes: Bool
  /// The game's place in the route, which is what decides its colour.
  /// -1 when the evening is free. Sent by the app rather than worked
  /// out here: two copies of a palette is how a Lock Screen ends up
  /// amber where the app is mint.
  let colour: Int
  /// Whether this evening carries the game's name. A run of one game
  /// is named once; the rest carry the colour and their own hours.
  let named: Bool

  var id: String { "\(day)-\(date)" }
  var isFree: Bool { title.isEmpty }
}

/**
 * The plan's three colours, indexed the way `lib/planColours` indexes
 * them. Anything out of range wraps, exactly as the app's modulo does,
 * so a fourth game is amber again rather than invisible.
 */
func planColour(_ index: Int) -> Color {
  let palette = [Color("$accent"), Color("$violet"), Color("$mint")]
  guard index >= 0 else { return Color("$muted") }
  return palette[index % palette.count]
}

/** One mark on the month strip: a landing ahead, or a stamp behind. */
struct HorizonMark: Codable, Identifiable {
  let name: String
  /// Epoch milliseconds the mark stands on — for WHERE it goes, which
  /// is the one thing only this side can work out.
  let at: Double
  /// The date as it should be read, already formatted by the app.
  /// Nothing here formats a date; see `WeekNight.day`.
  let label: String
  let colour: Int
  /// The credits already rolled — the slot is stamped, not empty.
  let done: Bool

  var id: String { "\(name)-\(at)" }
}

/**
 * The month, as the app decided it.
 *
 * The axis arrives rather than the positions: where a mark sits depends
 * on how wide the widget happens to be, which is the one thing only
 * this side can know. Which marks, in what order, what colour, how far
 * back — all already settled.
 */
struct Horizon: Codable {
  let from: Double
  let to: Double
  let now: Double
  let marks: [HorizonMark]
  /// A date the plan cannot meet, epoch ms, or absent for none.
  let troubleAt: Double?
  /// That date, already formatted. Empty when there is no trouble.
  let troubleLabel: String
  /// Landings there was no room to draw.
  let beyond: Int

  /// Where a moment falls along the strip, 0 to 1.
  func fraction(of at: Double) -> Double {
    let span = to - from
    guard span > 0 else { return 0 }
    return min(1, max(0, (at - from) / span))
  }
}

/**
 * How pressed the plan is, decided by the app.
 *
 * The gradient PRODUCT.md §6.1 asks for. Decoded as a string and
 * matched here rather than as a Swift enum with a raw value, because a
 * value this side does not recognise must degrade to calm rather than
 * failing the whole decode and blanking the widget.
 */
struct Pressure: Codable {
  let urgency: String
  /// One short line, already written for a Lock Screen by the app.
  let note: String
  /// Days to the date the note is about; absent when there is none.
  /// Negative when the date has already gone, which is a real state.
  let days: Int?

  /**
   * The colour the app paints this state, not a colour of the widget's
   * own. A deadline that cannot be met is coral everywhere in
   * Sidequest — the diamond on the month strip, the way out on the
   * misfit row — and this used to be violet here, which made the
   * loudest state on somebody's Lock Screen the one colour the app
   * never uses for it. Violet is the evening; coral is trouble.
   */
  var tint: Color {
    switch urgency {
    case "red": return Color("$coral")
    case "amber": return Color("$accent")
    default: return Color("$muted")
    }
  }

  /// Whether this is worth spending the widget's loudest colour on.
  var isPressing: Bool { urgency == "red" || urgency == "amber" }

  /**
   * How much of the ring is left, 0 to 1.
   *
   * Drawn against the same horizon the app uses to decide a deadline is
   * worth mentioning at all, so a date at the edge of that window is a
   * full circle and the day itself is an empty one. A date already gone
   * is empty rather than negative — the ring has said all it can, and
   * the words beside it carry the rest.
   */
  var remaining: Double? {
    guard let days else { return nil }
    return min(1, max(0, Double(days) / Double(alertHorizonDays)))
  }

  static let calm = Pressure(urgency: "calm", note: "", days: nil)
}

/// Matches HORIZON_DAYS in lib/alerts. See `Pressure.remaining`.
let alertHorizonDays = 21

/**
 * One morning of the plan, already decided.
 *
 * The app works out every day of the week at once — a schedule is
 * deterministic over time, so it can — and writes them as a list. Each
 * becomes a WidgetKit timeline entry dated at that morning, which is
 * what makes the widget right all week without the app being opened.
 * The previous shape wrote today only and asked to be reloaded at
 * midnight, which re-rendered the same stale plan.
 */
struct PlanDay: Codable {
  /// Local midnight this entry becomes the truth, epoch milliseconds.
  let at: Double
  /// Nothing left to play. An empty state, not a missing one.
  let tonight: Tonight?
  let nights: [WeekNight]
  /// The month from this morning. Absent when there is no plan.
  let horizon: Horizon?
  let pressure: Pressure

  var date: Date { Date(timeIntervalSince1970: at / 1000) }
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

  /**
   * The week the app last worked out, oldest morning first.
   *
   * Entries already in the past are dropped rather than trusted: a
   * widget woken from a plan written last week should show what it can
   * still stand behind, which may be nothing at all.
   */
  static func plan(now: Date = Date()) -> [PlanDay] {
    guard let days = decode([PlanDay].self, "plan") else { return [] }
    let today = Calendar.current.startOfDay(for: now)
    return days.filter { $0.date >= today }.sorted { $0.at < $1.at }
  }

  static func year() -> Year? { decode(Year.self, "year") }
}

/**
 * Timeline entries from the plan, and what to do when there are none.
 *
 * WidgetKit needs at least one entry and will happily keep showing the
 * last one forever, so a plan that has run out is given a single
 * present-dated empty entry rather than an empty list. Saying "no plan
 * yet" is honest; leaving last Tuesday's game up is not.
 */
func planEntries<T>(_ days: [PlanDay], _ make: (Date, PlanDay?) -> T) -> [T] {
  if days.isEmpty { return [make(Date(), nil)] }
  return days.map { make($0.date, $0) }
}

// MARK: - The one shared piece of styling

/**
 * Midnight, for the one widget that still needs it.
 *
 * The plan widgets are a week of dated entries now, so WidgetKit
 * carries their day-to-day changes and they ask for a fresh week only
 * once the last morning has passed. The year card is different: it does
 * not change with the date at all, only with finishing something, which
 * the app announces directly. It still turns over at midnight on one
 * night of the year, so that the year it claims stays true.
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
