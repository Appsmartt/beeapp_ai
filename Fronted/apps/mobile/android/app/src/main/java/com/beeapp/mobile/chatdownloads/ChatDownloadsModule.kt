package com.beeapp.mobile.chatdownloads

import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ChatDownloadsModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ChatDownloads"

  private val recentDownloads = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()

  @ReactMethod
  fun saveToDownloads(sourceUriValue: String, fileName: String, mimeType: String, promise: Promise) {
    saveToMediaCollection(
      sourceUriValue = sourceUriValue,
      fileName = fileName,
      mimeType = mimeType,
      collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI,
      relativePath = Environment.DIRECTORY_DOWNLOADS + "/",
      trackAsDownload = true,
      promise = promise,
    )
  }

  @ReactMethod
  fun saveToGallery(sourceUriValue: String, fileName: String, mimeType: String, promise: Promise) {
    saveToMediaCollection(
      sourceUriValue = sourceUriValue,
      fileName = fileName,
      mimeType = mimeType,
      collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      relativePath = Environment.DIRECTORY_PICTURES + "/Buddy/",
      trackAsDownload = false,
      promise = promise,
    )
  }

  private fun saveToMediaCollection(
    sourceUriValue: String,
    fileName: String,
    mimeType: String,
    collection: Uri,
    relativePath: String,
    trackAsDownload: Boolean,
    promise: Promise,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.reject("UNSUPPORTED_ANDROID", "La descarga automática requiere Android 10 o superior.")
      return
    }

    Thread {
      var destination: Uri? = null
      try {
        val sourceUri = Uri.parse(sourceUriValue)
        if (sourceUri.scheme != "file") {
          throw IllegalArgumentException("El archivo temporal no es local.")
        }
        val source = File(sourceUri.path ?: "")
        val cache = reactContext.cacheDir.canonicalFile
        val canonicalSource = source.canonicalFile
        if (
          !canonicalSource.path.startsWith(cache.path + File.separator)
          || !canonicalSource.isFile
          || canonicalSource.length() == 0L
        ) {
          throw IllegalArgumentException("El archivo temporal no está disponible en la caché de Beeapp.")
        }

        val safeName = fileName
          .map { if (it == '/' || it.code == 92 || it.isISOControl()) '_' else it }.joinToString("")
          .trim()
          .take(255)
          .ifEmpty { "archivo" }
        val resolvedMime = mimeType.ifBlank { "application/octet-stream" }
        val values = ContentValues().apply {
          put(MediaStore.MediaColumns.DISPLAY_NAME, safeName)
          put(MediaStore.MediaColumns.MIME_TYPE, resolvedMime)
          put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
          put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val resolver = reactContext.contentResolver
        destination = resolver.insert(collection, values)
          ?: throw IllegalStateException("Android no permitió crear el archivo en el almacenamiento.")
        val output = resolver.openOutputStream(destination, "w")
          ?: throw IllegalStateException("Android no permitió escribir el archivo.")
        output.use { stream ->
          canonicalSource.inputStream().use { input -> input.copyTo(stream, 64 * 1024) }
          stream.flush()
        }
        val completed = ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }
        if (resolver.update(destination, completed, null, null) != 1) {
          throw IllegalStateException("No se pudo confirmar el archivo guardado.")
        }
        if (trackAsDownload) {
          recentDownloads.add(destination.toString())
        }
        promise.resolve(destination.toString())
      } catch (error: Exception) {
        destination?.let { runCatching { reactContext.contentResolver.delete(it, null, null) } }
        promise.reject("SAVE_DOWNLOAD_FAILED", error.message ?: "No se pudo guardar el archivo.", error)
      }
    }.start()
  }

  @ReactMethod
  fun openDownloadedFile(uriValue: String, mimeType: String, promise: Promise) {
    if (!recentDownloads.contains(uriValue)) {
      promise.reject("UNKNOWN_DOWNLOAD", "Este archivo no fue descargado en la sesión actual.")
      return
    }
    try {
      val uri = Uri.parse(uriValue)
      if (uri.scheme != "content" || uri.authority != MediaStore.AUTHORITY) {
        throw IllegalArgumentException("La dirección del archivo no es válida.")
      }
      val view = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mimeType.ifBlank { "application/octet-stream" })
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        reactContext.startActivity(view)
      } catch (missingViewer: ActivityNotFoundException) {
        val downloads = Intent(android.app.DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(downloads)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject(
        "OPEN_DOWNLOAD_FAILED",
        error.message ?: "No hay una aplicación compatible para abrir el archivo.",
        error,
      )
    }
  }
}
