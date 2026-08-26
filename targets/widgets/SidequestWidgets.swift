import SwiftUI
import WidgetKit

/**
 * The four widgets, as one extension.
 *
 * A `WidgetBundle` is what lets a single extension binary offer more
 * than one widget in the picker — three separate targets would each
 * need their own bundle id, entitlements and signing for no benefit,
 * since all three read the same container and share the same models.
 *
 * Order is the order they appear in the gallery, and it is the order of
 * how much they earn their place — which is also, not by accident, the
 * three scales the plan page itself is built on. Tonight answers the
 * question the app exists for; This week answers the one asked on a
 * Sunday; This month answers the one asked while the kettle boils. The
 * year answers none at all — it is the trophy, and it goes last.
 */
@main
struct SidequestWidgets: WidgetBundle {
  var body: some Widget {
    TonightWidget()
    WeekWidget()
    HorizonWidget()
    YearWidget()
  }
}
