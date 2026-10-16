package com.beeapp.mobile

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.beeapp.mobile.statusvideo.StatusVideoTranscoderPackage
import com.beeapp.mobile.chatdownloads.ChatDownloadsPackage

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            return PackageList(this).packages + StatusVideoTranscoderPackage() + ChatDownloadsPackage()
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    createBuddyNotificationChannels(this)
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

private fun createBuddyNotificationChannels(context: android.content.Context) {
  if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
    return
  }

  val manager = context.getSystemService(android.app.NotificationManager::class.java) ?: return
  val general = android.app.NotificationChannel(
    "default",
    "Notificaciones generales",
    android.app.NotificationManager.IMPORTANCE_HIGH,
  )
  general.description = "Avisos de correo, calendario, archivos y actividad de Buddy."
  general.enableVibration(true)
  general.vibrationPattern = longArrayOf(0, 250, 250, 250)
  general.enableLights(true)
  general.lightColor = 0xFF6025D2.toInt()
  manager.createNotificationChannel(general)

  val calls = android.app.NotificationChannel(
    "incoming-calls",
    "Llamadas entrantes",
    android.app.NotificationManager.IMPORTANCE_HIGH,
  )
  calls.description = "Avisos urgentes de llamadas entrantes de Buddy AI."
  calls.enableVibration(true)
  calls.vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 500)
  calls.enableLights(true)
  calls.lightColor = 0xFF6025D2.toInt()
  val sound = android.net.Uri.parse("android.resource://" + context.packageName + "/raw/incoming_call")
  val audio = android.media.AudioAttributes.Builder()
    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()
  calls.setSound(sound, audio)
  manager.createNotificationChannel(calls)
}
