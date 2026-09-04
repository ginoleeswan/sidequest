import SwiftUI
import UIKit
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
  var date: Date
  let tonight: Tonight?
  var pressure: Pressure = .calm
  /// Decoded once when the timeline is built, not once per draw.
  var cover: UIImage? = nil
  /// The publisher's own title treatment, drawn where the name is typed.
  var logo: UIImage? = nil
  /// The booked evenings after this one, for the medium card's column.
  var next: [WeekNight] = []
  /**
   * How much this entry deserves the top of a Smart Stack.
   *
   * The stack rotates to whichever widget claims the moment, and this
   * card's moment is the evening: the sofa at eight, not the commute
   * at eight. Each day gets a quiet morning entry and a loud one from
   * five o'clock, so the stack surfaces Tonight when tonight is near.
   */
  var relevance: TimelineEntryRelevance? = nil
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
    let art = Store.art()
    completion(
      TonightEntry(
        date: Date(),
        tonight: today?.tonight,
        pressure: today?.pressure ?? .calm,
        cover: artImage(today?.tonight?.id, .hero, in: art),
        logo: artImage(today?.tonight?.id, .logo, in: art)
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
    // Read once, outside the loop. Seven mornings usually name two or
    // three games between them, and re-reading the container per entry
    // is work done inside a window the system is timing.
    let art = Store.art()
    let days = Store.plan()
    if days.isEmpty {
      completion(
        Timeline(entries: [TonightEntry(date: Date(), tonight: nil)], policy: .atEnd)
      )
      return
    }

    var entries: [TonightEntry] = []
    for day in days {
      let morning = TonightEntry(
        date: day.date,
        tonight: day.tonight,
        pressure: day.pressure,
        cover: artImage(day.tonight?.id, .hero, in: art),
        logo: artImage(day.tonight?.id, .logo, in: art),
        next: upNext(day.nights),
        relevance: TimelineEntryRelevance(score: 0.4)
      )
      entries.append(morning)
      // The same day, from five o'clock: the entry a Smart Stack should
      // bring forward. Same content, louder claim.
      if day.tonight != nil,
        let evening = Calendar.current.date(
          bySettingHour: 17, minute: 0, second: 0, of: day.date)
      {
        var prime = morning
        prime.date = evening
        prime.relevance = TimelineEntryRelevance(score: 1, duration: 6 * 3600)
        entries.append(prime)
      }
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Home screen

struct TonightHome: View {
  let entry: TonightEntry
  var wide: Bool

  var body: some View {
    HStack(alignment: .top, spacing: 14) {
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
          /*
           * The publisher's mark where the name would be typed.
           *
           * Every streaming shelf sets the title's own logo over the
           * artwork instead of the name in the app's face, and the
           * difference is the difference between a catalogue and a
           * spreadsheet. Fitted, never filled: a logo is a shape, and
           * a shape stretched to a box is a smear. The typed name
           * stands whenever there is no mark, so the card is never
           * blank where its title should be.
           */
          if let logo = entry.logo {
            Image(uiImage: logo)
              .resizable()
              .scaledToFit()
              .frame(
                maxWidth: wide ? 190 : 128,
                maxHeight: wide ? 54 : 42,
                alignment: .leading
              )
              .accessibilityHidden(true)
          } else {
            Text(tonight.title)
              .font(Brand.bold(wide ? 24 : 19))
              .foregroundStyle(.white)
              .lineLimit(2)
              .minimumScaleFactor(0.75)
          }
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
      .frame(maxWidth: .infinity, alignment: .leading)

      /*
       * The medium card's second column: what follows tonight.
       *
       * Medium used to be the small card with a longer line — the same
       * three facts across twice the width, and a right half that held
       * nothing but the picture. A card twice as wide should say
       * something more, and the thing worth saying beside tonight is
       * the next two evenings with a game in them: enough to see the
       * week's shape without opening it.
       */
      if wide, !entry.next.isEmpty {
        VStack(alignment: .leading, spacing: 7) {
          Nameplate(text: "THEN", tint: Color("$muted"))
          /*
           * The name only where the name changes.
           *
           * A run of evenings on one game printed its title on every
           * row, and a title has about a hundred points to be printed
           * in — so two nights of The Legend of Zelda: Breath of the
           * Wild read "The Legend of..." twice, which says nothing at
           * all and says it in the widest type in the column. What
           * the reader does not know at that point is how LONG those
           * evenings are, so the nights that carry on tonight's game
           * carry their hours instead.
           */
          ForEach(entry.next) { night in
            let sameGame = night.title == entry.tonight?.title
            VStack(alignment: .leading, spacing: 1) {
              Text("\(night.day) \(night.date)")
                .font(Brand.bold(10))
                .foregroundStyle(Color("$muted"))
              Text(sameGame ? "\(night.hours)h more" : night.title)
                .font(Brand.bold(13))
                .foregroundStyle(sameGame ? Color("$muted") : .white)
                .lineLimit(1)
            }
          }
          Spacer(minLength: 0)
        }
        .frame(width: 104, alignment: .leading)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(Text(spoken))
  }

  /**
   * The card, said aloud.
   *
   * VoiceOver would otherwise read the nameplate, the title and the
   * hours as three unrelated fragments in whatever order the tree
   * puts them. One sentence in the order a person would say it.
   */
  private var spoken: String {
    guard let tonight = entry.tonight else {
      return "Tonight: no plan yet. Open Sidequest to pick a week."
    }
    var line = "Tonight: \(tonight.title), \(spanLabel(tonight.hours))"
    if tonight.finishes { line += ", the credits roll" }
    if !entry.pressure.note.isEmpty { line += ". \(entry.pressure.note)" }
    if wide, !entry.next.isEmpty {
      let then = entry.next.map { "\($0.day) \($0.date) \($0.title)" }
      line += ". Then \(then.joined(separator: ", "))"
    }
    return line
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

/**
 * The ground under Tonight: the game's own art, or the app's navy.
 *
 * The art is the hero banner where SteamGridDB has one — the shape a
 * medium card is, composed by the publisher to be looked at whole —
 * and RAWG's screenshot where it does not.
 *
 * Artwork earns its place as a ground on this widget and on no other. Tonight names
 * exactly one game, and a cover is recognised across a room in a way a
 * word set at 19pt is not — which is the whole use of a widget somebody
 * glances at from the sofa. The week is seven names and the month is a
 * timeline; art there would be a mosaic and a decoration respectively,
 * so both keep the flat navy.
 *
 * The scrim is not a mood. Key art is somebody else's composition,
 * arriving at whatever exposure it happens to have, and the type on top
 * of it has to be readable over a night sky and a white snowfield
 * alike. A gradient in the app's own ground colour — heavier at the
 * foot, where the pressure line sits, than at the head — buys that
 * without tinting the picture some colour the game is not.
 *
 * The navy is painted first and unconditionally, so a card whose art
 * never arrived is the card as it was designed rather than a hole.
 */
struct CoverGround: View {
  let cover: UIImage?

  var body: some View {
    ZStack {
      Color("$ground")
      if let cover {
        // Sized from the geometry rather than left to fill: an
        // unconstrained `scaledToFill` reports the image's own size as
        // its ideal, which is how a 420px picture ends up deciding how
        // big the card wants to be.
        GeometryReader { geo in
          /*
           * Which side the crop comes off.
           *
           * A hero is composed with the subject hard right and the
           * left kept clear, because that is where Steam composites
           * the logo. The medium card is nearly the banner's own shape
           * and loses almost nothing. The SMALL card is a square: a
           * centre crop of a 3:1 banner keeps its middle third, which
           * on that convention is the half with nothing in it — the
           * card came out a picture of a sky with the character
           * cropped away off the right edge.
           *
           * So where the picture is much wider than the slot it has to
           * fill, the crop comes off the left, which is the same
           * convention the game page's masthead already follows. A
           * screenshot standing in for a missing banner is not
           * composed that way and is not much wider than the slot
           * either, so it stays centred by the same test.
           */
          let slot = geo.size.width / max(geo.size.height, 1)
          let picture = cover.size.width / max(cover.size.height, 1)
          let banner = picture > slot * 1.5
          Image(uiImage: cover)
            .resizable()
            .scaledToFill()
            .frame(
              width: geo.size.width,
              height: geo.size.height,
              alignment: banner ? .trailing : .center
            )
            .clipped()
        }
        LinearGradient(
          colors: [
            Color("$ground").opacity(0.58),
            Color("$ground").opacity(0.86),
            Color("$ground").opacity(0.96),
          ],
          startPoint: .top,
          endPoint: .bottom
        )
      }
    }
  }
}

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
        .containerBackground(for: .widget) { CoverGround(cover: entry.cover) }
        .widgetURL(Deep.game(entry.tonight?.id))
    }
  }
}
