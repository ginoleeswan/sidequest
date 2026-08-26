import SwiftUI
import WidgetKit

/**
 * This month — the horizon, as a timeline.
 *
 * The third question, and the one the app had no widget for. Tonight is
 * the sofa at eight; This week is Sunday, checking the shape; this is
 * the one asked while waiting for a kettle — when do the credits
 * actually land, and is anything not going to make it.
 *
 * A timeline rather than a month grid, for the reason `HorizonStrip`
 * gives at length in the app: a month holds about two facts per game,
 * and a thirty-box grid answers that with twenty-six empty boxes. Empty
 * boxes in a calendar read as days you failed to fill, which is the one
 * register this app promised never to use (§2.1). On a widget the
 * argument is stronger still — thirty boxes across a medium family is
 * eleven points each.
 *
 * So: TODAY on a spine, the plan running ahead of it in the route's own
 * colours, a save-slot planted where each game's credits land, and what
 * already landed stamped behind. A deadline that cannot be met is coral
 * weather standing on its date, the same as in the app.
 *
 * Every decision here was made in JavaScript — which marks, what
 * colour, how far back, how far ahead. This file is given an axis and
 * some dates and turns them into geometry, which is the only part that
 * needs to know how wide a widget is.
 */

struct HorizonEntry: TimelineEntry {
  let date: Date
  let horizon: Horizon?
  var pressure: Pressure = .calm
}

struct HorizonProvider: TimelineProvider {
  private static var sample: Horizon {
    let now = Date().timeIntervalSince1970 * 1000
    let day = 86_400_000.0
    return Horizon(
      from: now - 12 * day,
      to: now + 46 * day,
      now: now,
      marks: [
        HorizonMark(name: "Celeste", at: now - 11 * day, label: "Aug 6",
                    colour: -1, done: true),
        HorizonMark(name: "Hades", at: now + 9 * day, label: "Aug 26",
                    colour: 0, done: false),
        HorizonMark(name: "Tunic", at: now + 25 * day, label: "Sep 11",
                    colour: 1, done: false),
        HorizonMark(name: "Outer Wilds", at: now + 42 * day, label: "Sep 28",
                    colour: 2, done: false),
      ],
      troubleAt: nil,
      troubleLabel: "",
      beyond: 0
    )
  }

  func placeholder(in context: Context) -> HorizonEntry {
    HorizonEntry(date: Date(), horizon: Self.sample)
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (HorizonEntry) -> Void
  ) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    let today = Store.plan().first
    completion(
      HorizonEntry(
        date: Date(),
        horizon: today?.horizon,
        pressure: today?.pressure ?? .calm
      )
    )
  }

  /**
   * One entry per morning, like every other widget here.
   *
   * The marks hold still across the week — a schedule is deterministic
   * — but TODAY slides along the spine beneath them, which is most of
   * what makes this picture worth looking at twice.
   */
  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<HorizonEntry>) -> Void
  ) {
    let entries = planEntries(Store.plan()) { date, day in
      HorizonEntry(
        date: date,
        horizon: day?.horizon,
        pressure: day?.pressure ?? .calm
      )
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

/**
 * Dates to points.
 *
 * A struct rather than a closure declared inside the view body: the
 * body is a result builder, and a plain value with one method is the
 * shape least likely to surprise anyone reading it — or the compiler.
 * Half a label is held back at each end so a name centred on the last
 * date is not cut off by the widget's edge.
 */
private struct Axis {
  let horizon: Horizon
  let width: CGFloat
  let labelWidth: CGFloat

  func x(_ at: Double) -> CGFloat {
    let inset = labelWidth / 2
    let usable = max(width - labelWidth, 1)
    return inset + CGFloat(horizon.fraction(of: at)) * usable
  }
}

/** The save slot: a memcard chip, stamped when the credits rolled. */
struct SaveSlot: View {
  let mark: HorizonMark

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 3)
        .fill(mark.done ? Color("$mint") : planColour(mark.colour))
        .frame(width: 13, height: 13)
      if mark.done {
        Image(systemName: "checkmark")
          .font(.system(size: 8, weight: .bold))
          .foregroundStyle(Color("$ground"))
      } else {
        // The empty slot's chamfered corner, the memcard's own shape.
        Path { path in
          path.move(to: CGPoint(x: 13, y: 0))
          path.addLine(to: CGPoint(x: 13, y: 5))
          path.addLine(to: CGPoint(x: 8, y: 0))
          path.closeSubpath()
        }
        .fill(Color("$ground"))
        .frame(width: 13, height: 13)
      }
    }
  }
}

struct HorizonView: View {
  let entry: HorizonEntry
  var tall: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 6) {
        Nameplate(text: "THIS MONTH")
        if entry.pressure.isPressing {
          Nameplate(
            text: "· \(entry.pressure.note.uppercased())",
            tint: entry.pressure.tint
          )
        }
      }

      if let horizon = entry.horizon, !horizon.marks.isEmpty {
        strip(horizon)
        if horizon.beyond > 0 {
          Text(
            "+ \(horizon.beyond) more after that"
          )
          .font(Brand.regular(11))
          .foregroundStyle(Color("$muted"))
          .lineLimit(1)
        }
      } else {
        Waiting(hint: "Open Sidequest to plan your month")
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  /**
   * The strip itself.
   *
   * Laid out against the container's width rather than in percentages,
   * because a label centred on a date needs to know how much room it
   * has — and clamping happens here, in points, where the answer is
   * actually knowable.
   */
  private func strip(_ horizon: Horizon) -> some View {
    GeometryReader { geo in
      let labelWidth: CGFloat = tall ? 86 : 74
      let axis = Axis(
        horizon: horizon,
        width: geo.size.width,
        labelWidth: labelWidth
      )
      let todayX = axis.x(horizon.now)

      ZStack(alignment: .topLeading) {
        // TODAY, standing on its tick. With stamps behind it the left
        // edge is weeks ago, so labelling that edge "today" would be
        // the one outright lie the picture could tell.
        VStack(alignment: .leading, spacing: 2) {
          Text("TODAY")
            .font(Brand.black(9))
            .foregroundStyle(Color("$accent"))
          // Long enough to actually reach the spine at y=30, so the
          // label is standing on a date rather than floating above one.
          Rectangle()
            .fill(Color("$accent"))
            .frame(width: 2, height: 17)
        }
        .frame(width: 70, alignment: .leading)
        .offset(x: todayX - 1, y: 0)

        // A date that cannot be met: coral weather on its own day.
        if let trouble = horizon.troubleAt, !horizon.troubleLabel.isEmpty {
          HStack(spacing: 4) {
            Rectangle()
              .fill(Color("$coral"))
              .frame(width: 7, height: 7)
              .rotationEffect(.degrees(45))
            Text(horizon.troubleLabel)
              .font(Brand.bold(9))
              .foregroundStyle(Color("$coral"))
          }
          // Below TODAY's own band rather than across it: the two can
          // stand within a few points of each other when a date is
          // days away, and a date printed through a word is worse than
          // a date one line lower.
          .frame(width: 90, alignment: .leading)
          .offset(x: axis.x(trouble) - 4, y: 14)
        }

        // The spine: what is behind, then the plan, then open time.
        ZStack(alignment: .leading) {
          Capsule()
            .fill(Color("$well"))
            .frame(height: 5)
          if horizon.marks.contains(where: { $0.done }) {
            Capsule()
              .fill(Color("$mint").opacity(0.35))
              .frame(width: todayX, height: 5)
          }
          let ahead = horizon.marks.filter { !$0.done }
          ForEach(Array(ahead.enumerated()), id: \.offset) { pair in
            let from = pair.offset == 0
              ? todayX
              : axis.x(ahead[pair.offset - 1].at)
            Capsule()
              .fill(planColour(pair.element.colour))
              .frame(width: max(axis.x(pair.element.at) - from, 1), height: 5)
              .offset(x: from)
          }
        }
        .offset(y: 30)

        // One slot per mark, with its date and its name beneath.
        ForEach(horizon.marks) { mark in
          VStack(spacing: 2) {
            SaveSlot(mark: mark)
            Rectangle()
              .fill(Color.white.opacity(0.16))
              .frame(width: 2, height: 5)
            Text(mark.label)
              .font(Brand.bold(tall ? 11 : 10))
              .foregroundStyle(.white)
              .lineLimit(1)
            Text(mark.name)
              .font(Brand.regular(tall ? 10 : 9))
              .foregroundStyle(Color("$muted"))
              .lineLimit(1)
          }
          .frame(width: labelWidth)
          .offset(x: axis.x(mark.at) - labelWidth / 2, y: 26)
        }
      }
    }
    .frame(height: tall ? 104 : 96)
  }
}

struct HorizonWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ThisMonth", provider: HorizonProvider()) {
      entry in
      HorizonSurface(entry: entry)
    }
    .configurationDisplayName("This month")
    .description("Where the credits land — and where they landed.")
    /**
     * Medium up. A timeline is a picture of distance, and a small
     * family is 155 points wide: four dates on it would be four
     * overlapping labels, which says less than nothing.
     */
    .supportedFamilies([.systemMedium, .systemLarge, .systemExtraLarge])
  }
}

struct HorizonSurface: View {
  let entry: HorizonEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    HorizonView(
      entry: entry,
      tall: family == .systemLarge || family == .systemExtraLarge
    )
    .containerBackground(Color("$ground"), for: .widget)
    .widgetURL(Deep.plan)
  }
}
