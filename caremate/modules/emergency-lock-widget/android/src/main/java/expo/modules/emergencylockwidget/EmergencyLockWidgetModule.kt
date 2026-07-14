package expo.modules.emergencylockwidget

import android.content.Context
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class EmergencyLockWidgetModule : Module() {
  private val context: Context
    get() =
      appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("EmergencyLockWidgetNative")

    AsyncFunction("updateSnapshot") { json: String ->
      val appContext = context
      EmergencyLockSnapshot.write(appContext, json)
      runBlocking {
        EmergencyLockGlanceWidget().updateAll(appContext)
      }
    }

    AsyncFunction("reload") {
      val appContext = context
      runBlocking {
        EmergencyLockGlanceWidget().updateAll(appContext)
      }
    }
  }
}
