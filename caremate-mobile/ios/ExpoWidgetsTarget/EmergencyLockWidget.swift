import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct EmergencyLockWidget: Widget {
  let name: String = "EmergencyLockWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Emergency Info")
    .description("Shows blood type and ICE contact on the Lock Screen and Home Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}