import SwiftUI
import WidgetKit

/**
 * Tonight — the app's whole sentence, on five surfaces.
 *
 * This is the flagship, and the reason is where the decision happens: a
 * person deciding what to play is on the sofa at eight o'clock, not in
 * a browser tab. The Lock Screen families matter more than the home
 * screen ones for exactly that reason — the answer arrives on the
 * screen people look at dozens of times a day, without opening
 * anything.
 *
 * One data shape feeds all five. The layouts differ because the space
 * does: a circular accessory has room for a number and nothing else, so
 * it shows the hours; the rectangle has room for the name, so the name
 * is what it shows.
 */

struct TonightEntry: TimelineEntry {
  let date: Date
  let tonight: Tonight?
  var pressure: Pressure = .calm
}

struct TonightProvider: TimelineProvider {
  /// The gallery preview, before the widget is placed. Never the empty
  /// state: a blank card in the picker reads as a broken widget.
  func placeholder(in context: Context) -> TonightEntry {
    TonightEntry(
      date: Date(),
      tonight: Tonight(id: nil, title: "Hades", hours: 2, finishes: false)
    )
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (TonightEntry) -> Void
  ) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    let today = Store.plan().first
    completion(
      TonightEntry(
        date: Date(),
        tonight: today?.tonight,
        pressure: today?.pressure ?? .calm
      )
    )
  }

  /**
   * A week of mornings, not one snapshot and a reload.
   *
   * The app has already decided what every day of the week looks like,
   * so each becomes its own entry dated at that morning and WidgetKit
   * shows the right one without waking anybody. `.atEnd` asks for a
   * fresh week once the last morning has passed, which is the only
   * moment this widget genuinely needs the app again.
   */
  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<TonightEntry>) -> Void
  ) {
    let entries = planEntries(Store.plan()) { date, day in
      TonightEntry(
        date: date,
        tonight: day?.tonight,
        pressure: day?.pressure ?? .calm
      )
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Home screen

struct TonightHome: View {
  let entry: TonightEntry
  var wide: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        Nameplate(text: "TONIGHT")
        if entry.tonight?.finishes == true {
          // The app's own word for an evening that ends a game. It is
          // the most interesting thing this widget can ever say.
          Nameplate(text: "· CREDITS", tint: Color("$violet"))
        }
      }

      if let tonight = entry.tonight {
        Text(tonight.title)
          .font(Brand.bold(wide ? 24 : 19))
          .foregroundStyle(.white)
          .lineLimit(wide ? 1 : 2)
          .minimumScaleFactor(0.75)
        Text(spanLabel(tonight.hours))
          .font(Brand.regular(wide ? 15 : 13))
          .foregroundStyle(Color("$muted"))
      } else {
        Waiting()
      }
      Spacer(minLength: 0)
      /*
       * The gradient, at the foot of the card.
       *
       * Below the evening rather than above it, because the evening is
       * what somebody opened the widget for — a deadline they cannot
       * meet is the second most important thing on this card, not the
       * first. When nothing is pressing it is the plan in two numbers,
       * which is the line §6.1 calls the marketing asset.
       */
      if !entry.pressure.note.isEmpty {
        Text(entry.pressure.note)
          .font(Brand.bold(wide ? 13 : 11))
          .foregroundStyle(entry.pressure.tint)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Lock Screen

struct TonightAccessory: View {
  let entry: TonightEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .accessoryCircular:
      /*
       * A ring when there is something to count down to, and hours
       * when there is not.
       *
       * §6.1 asks this family for a days-remaining ring, and a circle
       * is the one shape that says "draining" without a word. But most
       * people set no deadlines at all, and a ring with nothing behind
       * it would be decoration — so with no date it goes back to the
       * number that decides the evening: how long it runs.
       */
      ZStack {
        AccessoryWidgetBackground()
        if let remaining = entry.pressure.remaining {
          // The track, so a nearly-empty ring reads as a ring running
          // out rather than as a stray arc.
          Circle()
            .stroke(style: StrokeStyle(lineWidth: 4))
            .opacity(0.25)
            .padding(2)
          Circle()
            .trim(from: 0, to: remaining)
            .stroke(style: StrokeStyle(lineWidth: 4, lineCap: .round))
            // From the top, clockwise, because that is the direction
            // every clock face in the world already agrees on.
            .rotationEffect(.degrees(-90))
            .padding(2)
          VStack(spacing: -2) {
            Text("\(max(0, entry.pressure.days ?? 0))")
              .font(.system(size: 20, weight: .heavy))
            Text("DAYS")
              .font(.system(size: 8, weight: .semibold))
          }
        } else {
          VStack(spacing: -2) {
            Text("\(entry.tonight?.hours ?? 0)")
              .font(.system(size: 22, weight: .heavy))
            Text("HRS")
              .font(.system(size: 9, weight: .semibold))
          }
        }
      }
      .widgetAccentable()

    case .accessoryInline:
      // One line, no styling of its own — the system owns the type here
      // and fights anything that tries to. With no colour available,
      // a pressing plan has to earn its place in the words: it replaces
      // the hours, which are the least surprising thing on the line.
      Text(
        entry.tonight.map { tonight in
          // §6.1's own example is `Pentiment · 9d`: with a date in
          // view the days are the fact, and the hours are not. Only
          // the number, not the sentence — an inline accessory is
          // truncated by whatever else is on the Lock Screen.
          if let days = entry.pressure.days, days > 0 {
            return "\(tonight.title) · \(days)d"
          }
          if entry.pressure.isPressing {
            return "\(tonight.title) · \(entry.pressure.note)"
          }
          return "\(tonight.title) · \(tonight.hours)h"
        } ?? "No plan yet"
      )

    default:
      VStack(alignment: .leading, spacing: 1) {
        Text("TONIGHT")
          .font(.system(size: 11, weight: .heavy))
          .widgetAccentable()
        if let tonight = entry.tonight {
          Text(tonight.title)
            .font(.system(size: 15, weight: .semibold))
            .lineLimit(1)
          Text(spanLabel(tonight.hours))
            .font(.system(size: 12))
        } else {
          Text("No plan yet").font(.system(size: 15, weight: .semibold))
        }
        if entry.pressure.isPressing {
          // Only when it is pressing. The Lock Screen rectangle is
          // three lines tall and a boast is not worth one of them.
          Text(entry.pressure.note)
            .font(.system(size: 11, weight: .semibold))
            .lineLimit(1)
            .widgetAccentable()
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

// MARK: -

struct TonightWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Tonight", provider: TonightProvider()) { entry in
      TonightSurface(entry: entry)
    }
    .configurationDisplayName("Tonight")
    .description("What fits this evening, and how long it runs.")
    .supportedFamilies([
      .systemSmall,
      .systemMedium,
      .accessoryRectangular,
      .accessoryCircular,
      .accessoryInline,
    ])
  }
}

/**
 * The family switch, and the background that goes with each.
 *
 * Lock Screen accessories must NOT paint a ground: the system tints
 * them to match the wallpaper, and a filled container there renders as
 * a dark block sitting on somebody's photograph.
 *
 * Both branches open the game rather than the plan. This widget names
 * one title and nothing else, so the tap should land where the name
 * points; `Deep.game` falls back to the plan on its own when there is
 * no game to open, which is also the empty state.
 */
struct TonightSurface: View {
  let entry: TonightEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .accessoryCircular, .accessoryRectangular, .accessoryInline:
      TonightAccessory(entry: entry)
        .containerBackground(.clear, for: .widget)
        .widgetURL(Deep.game(entry.tonight?.id))
    default:
      TonightHome(entry: entry, wide: family == .systemMedium)
        .containerBackground(Color("$ground"), for: .widget)
        .widgetURL(Deep.game(entry.tonight?.id))
    }
  }
}
