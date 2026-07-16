package expo.modules.emergencylockwidget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class EmergencyLockGlanceWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = EmergencyLockSnapshot.read(context)
    val openIntent =
      Intent(Intent.ACTION_VIEW, Uri.parse("caremate://emergency-lock")).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        setPackage(context.packageName)
      }

    provideContent {
      WidgetContent(snapshot = snapshot, openIntent = openIntent)
    }
  }
}

@Composable
private fun WidgetContent(snapshot: EmergencyLockSnapshot, openIntent: Intent) {
  val titleColor = ColorProvider(day = Color(0xFF111827), night = Color(0xFFF8FAFC))
  val mutedColor = ColorProvider(day = Color(0xFF6B7280), night = Color(0xFF94A3B8))
  val accentColor = ColorProvider(day = Color(0xFF0D9488), night = Color(0xFF2DD4BF))
  val background = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF111827))

  Column(
    modifier =
      GlanceModifier
        .fillMaxSize()
        .background(background)
        .padding(12.dp)
        .clickable(actionStartActivity(openIntent)),
    verticalAlignment = Alignment.Top,
    horizontalAlignment = Alignment.Start,
  ) {
    if (!snapshot.hasProfile) {
      Text(
        text = "CareMate Emergency",
        style = TextStyle(color = titleColor, fontSize = 14.sp, fontWeight = FontWeight.Bold),
      )
      Spacer(GlanceModifier.height(4.dp))
      Text(
        text = "Add your emergency profile in the app",
        style = TextStyle(color = mutedColor, fontSize = 12.sp),
      )
      return@Column
    }

    Text(
      text = snapshot.fullName.ifBlank { "CareMate user" },
      style = TextStyle(color = titleColor, fontSize = 14.sp, fontWeight = FontWeight.Bold),
      maxLines = 1,
    )
    Spacer(GlanceModifier.height(4.dp))

    val bloodLine =
      buildString {
        append(if (snapshot.bloodGroup.isNotBlank()) snapshot.bloodGroup else "Blood n/a")
        if (snapshot.genotype.isNotBlank()) {
          append(" · ")
          append(snapshot.genotype)
        }
      }
    Text(
      text = bloodLine,
      style = TextStyle(color = accentColor, fontSize = 13.sp, fontWeight = FontWeight.Bold),
      maxLines = 1,
    )

    if (snapshot.allergies.isNotBlank()) {
      Spacer(GlanceModifier.height(2.dp))
      Text(
        text = "Allergies: ${snapshot.allergies}",
        style = TextStyle(color = mutedColor, fontSize = 11.sp),
        maxLines = 1,
      )
    }

    Spacer(GlanceModifier.height(4.dp))
    if (snapshot.contactName.isNotBlank()) {
      val ice =
        buildString {
          append("ICE: ")
          append(snapshot.contactName)
          if (snapshot.contactPhone.isNotBlank()) {
            append(" ")
            append(snapshot.contactPhone)
          }
        }
      Text(
        text = ice,
        style = TextStyle(color = mutedColor, fontSize = 11.sp),
        maxLines = 2,
      )
    } else {
      Text(
        text = "No ICE contact",
        style = TextStyle(color = mutedColor, fontSize = 11.sp),
      )
    }
  }
}
