package expo.modules.emergencylockwidget

import android.content.Context
import org.json.JSONObject

data class EmergencyLockSnapshot(
  val hasProfile: Boolean = false,
  val fullName: String = "",
  val bloodGroup: String = "",
  val genotype: String = "",
  val allergies: String = "",
  val contactName: String = "",
  val contactPhone: String = "",
  val contactRelationship: String = "",
) {
  companion object {
    private const val PREFS = "caremate_emergency_lock_widget"
    private const val KEY = "snapshot_json"

    fun empty() = EmergencyLockSnapshot()

    fun fromJson(raw: String?): EmergencyLockSnapshot {
      if (raw.isNullOrBlank()) return empty()
      return try {
        val json = JSONObject(raw)
        EmergencyLockSnapshot(
          hasProfile = json.optBoolean("hasProfile", false),
          fullName = json.optString("fullName", ""),
          bloodGroup = json.optString("bloodGroup", ""),
          genotype = json.optString("genotype", ""),
          allergies = json.optString("allergies", ""),
          contactName = json.optString("contactName", ""),
          contactPhone = json.optString("contactPhone", ""),
          contactRelationship = json.optString("contactRelationship", ""),
        )
      } catch (_: Exception) {
        empty()
      }
    }

    fun read(context: Context): EmergencyLockSnapshot {
      val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      return fromJson(prefs.getString(KEY, null))
    }

    fun write(context: Context, json: String) {
      context.applicationContext
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY, json)
        .apply()
    }
  }
}
