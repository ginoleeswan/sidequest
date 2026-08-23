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
}

struct TonightProvider: TimelineProvider {
  /// The gallery preview, before the widget is placed. Never the empty
  /// state: a blank card in the picker reads as a broken widget.
  func placeholder(in context: Context) -> TonightEntry {
    TonightEntry(
      date: Date(),
      tonight: Tonight(title: "Hades", hours: 2, finishes: false)
    )
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (TonightEntry) -> Void
  ) {
    completion(
      TonightEntry(
        date: Date(),
        tonight: context.isPreview ? placeholder(in: context).tonight : Store.tonight()
      )
    )
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<TonightEntry>) -> Void
  ) {
    let entry = TonightEntry(date: Date(), tonight: Store.tonight())
    completion(Timeline(entries: [entry], policy: .after(nextMidnight())))
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
          .font(.system(size: wide ? 24 : 19, weight: .bold))
          .foregroundStyle(.white)
          .lineLimit(wide ? 1 : 2)
          .minimumScaleFactor(0.75)
        Text(spanLabel(tonight.hours))
          .font(.system(size: wide ? 15 : 13))
          .foregroundStyle(Color("$muted"))
      } else {
        Waiting()
      }
      Spacer(minLength: 0)
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
      // Room for a number and nothing else, so it shows the number that
      // decides the evening: how long it runs.
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: -2) {
          Text("\(entry.tonight?.hours ?? 0)")
            .font(.system(size: 22, weight: .heavy))
          Text("HRS")
            .font(.system(size: 9, weight: .semibold))
        }
      }
      .widgetAccentable()

    case .accessoryInline:
      // One line, no styling of its own — the system owns the type here
      // and fights anything that tries to.
      Text(
        entry.tonight.map { "\($0.title) · \($0.hours)h" } ?? "No plan yet"
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
 */
struct TonightSurface: View {
  let entry: TonightEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .accessoryCircular, .accessoryRectangular, .accessoryInline:
      TonightAccessory(entry: entry)
        .containerBackground(.clear, for: .widget)
        .widgetURL(Deep.plan)
    default:
      TonightHome(entry: entry, wide: family == .systemMedium)
        .containerBackground(Color("$ground"), for: .widget)
        .widgetURL(Deep.plan)
    }
  }
}
