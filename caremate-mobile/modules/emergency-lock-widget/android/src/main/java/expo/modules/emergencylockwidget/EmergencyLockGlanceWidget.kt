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
import androidx.glance.appwidget.cornerRadius
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

/**
 * Home-screen emergency glance styled like the in-app Patient ID / emergency card
 * (teal panel, CareMate brand, clear medical hierarchy).
 */
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
  // Teal card palette (aligned with Patient ID card).
  val brandOnTeal = ColorProvider(day = Color(0xFFCCFBF1), night = Color(0xFFCCFBF1))
  val titleOnTeal = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFFFFFFFF))
  val mutedOnTeal = ColorProvider(day = Color(0xFF99F6E4), night = Color(0xFF99F6E4))
  val accentOnTeal = ColorProvider(day = Color(0xFF5EEAD4), night = Color(0xFF5EEAD4))
  val cardBackground = ColorProvider(day = Color(0xFF0F766E), night = Color(0xFF115E59))

  Column(
    modifier =
      GlanceModifier
        .fillMaxSize()
        .cornerRadius(16.dp)
        .background(cardBackground)
        .padding(14.dp)
        .clickable(actionStartActivity(openIntent)),
    verticalAlignment = Alignment.Top,
    horizontalAlignment = Alignment.Start,
  ) {
    Text(
      text = "CAREMATE  ·  EMERGENCY",
      style = TextStyle(color = brandOnTeal, fontSize = 10.sp, fontWeight = FontWeight.Bold),
    )

    Spacer(GlanceModifier.height(8.dp))

    if (!snapshot.hasProfile) {
      Text(
        text = "Emergency",
        style = TextStyle(color = titleOnTeal, fontSize = 16.sp, fontWeight = FontWeight.Bold),
      )
      Spacer(GlanceModifier.height(4.dp))
      Text(
        text = "Add your emergency profile in the app",
        style = TextStyle(color = mutedOnTeal, fontSize = 12.sp),
      )
      return@Column
    }

    Text(
      text = snapshot.fullName.ifBlank { "CareMate user" },
      style = TextStyle(color = titleOnTeal, fontSize = 17.sp, fontWeight = FontWeight.Bold),
      maxLines = 1,
    )
    Spacer(GlanceModifier.height(6.dp))

    val bloodLine =
      buildString {
        append("Blood ")
        append(if (snapshot.bloodGroup.isNotBlank()) snapshot.bloodGroup else "n/a")
        if (snapshot.genotype.isNotBlank()) {
          append("  ·  Genotype ")
          append(snapshot.genotype)
        }
      }
    Text(
      text = bloodLine,
      style = TextStyle(color = accentOnTeal, fontSize = 13.sp, fontWeight = FontWeight.Bold),
      maxLines = 1,
    )

    Spacer(GlanceModifier.height(4.dp))
    Text(
      text =
        if (snapshot.allergies.isNotBlank()) {
          "Allergies · ${snapshot.allergies}"
        } else {
          "Allergies · none listed"
        },
      style = TextStyle(color = mutedOnTeal, fontSize = 11.sp),
      maxLines = 1,
    )

    Spacer(GlanceModifier.height(8.dp))
    if (snapshot.contactName.isNotBlank()) {
      Text(
        text =
          buildString {
            append("ICE · ")
            append(snapshot.contactName)
            if (snapshot.contactRelationship.isNotBlank()) {
              append(" (")
              append(snapshot.contactRelationship)
              append(")")
            }
          },
        style = TextStyle(color = titleOnTeal, fontSize = 12.sp, fontWeight = FontWeight.Bold),
        maxLines = 1,
      )
      if (snapshot.contactPhone.isNotBlank()) {
        Spacer(GlanceModifier.height(2.dp))
        Text(
          text = snapshot.contactPhone,
          style = TextStyle(color = accentOnTeal, fontSize = 14.sp, fontWeight = FontWeight.Bold),
          maxLines = 1,
        )
      }
    } else {
      Text(
        text = "No ICE contact",
        style = TextStyle(color = mutedOnTeal, fontSize = 11.sp),
      )
    }
  }
}
