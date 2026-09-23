package com.beeapp.mobile.statusvideo

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Effect
import androidx.media3.effect.Presentation
import androidx.media3.common.MimeTypes
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.TransformationRequest
import androidx.media3.transformer.Transformer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.UUID

class StatusVideoTranscoderModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StatusVideoTranscoder"

  @ReactMethod
  fun transcodeToMp4(
    sourceUriValue: String,
    promise: Promise,
  ) {
    val sourceUri = Uri.parse(sourceUriValue)

    if (sourceUri.scheme != "file" && sourceUri.scheme != "content") {
      promise.reject(
        "STATUS_VIDEO_INVALID_URI",
        "El video seleccionado no tiene una URI compatible.",
      )
      return
    }

    val outputDirectory = File(
      reactContext.cacheDir,
      "beeapp-status-videos",
    )

    if (!outputDirectory.exists() && !outputDirectory.mkdirs()) {
      promise.reject(
        "STATUS_VIDEO_OUTPUT_DIRECTORY",
        "No fue posible preparar el directorio temporal del video.",
      )
      return
    }

    val outputFile = File(
      outputDirectory,
      "status-video-${UUID.randomUUID()}.mp4",
    )

    val transformationRequest = TransformationRequest.Builder()
      .setVideoMimeType(MimeTypes.VIDEO_H264)
      .setAudioMimeType(MimeTypes.AUDIO_AAC)
      .build()

    val transformer = Transformer.Builder(reactContext)
      .setTransformationRequest(transformationRequest)
      .addListener(
        object : Transformer.Listener {
          override fun onCompleted(
            composition: Composition,
            exportResult: ExportResult,
          ) {
            if (!outputFile.exists() || outputFile.length() <= 0L) {
              promise.reject(
                "STATUS_VIDEO_EMPTY_OUTPUT",
                "La conversión produjo un video vacío.",
              )
              return
            }

            val result = Arguments.createMap().apply {
              putString("uri", Uri.fromFile(outputFile).toString())
              putDouble("sizeBytes", outputFile.length().toDouble())
            }

            promise.resolve(result)
          }

          override fun onError(
            composition: Composition,
            exportResult: ExportResult,
            exportException: ExportException,
          ) {
            if (outputFile.exists()) {
              outputFile.delete()
            }

            promise.reject(
              "STATUS_VIDEO_TRANSCODE_FAILED",
              exportException.message
                ?: "No fue posible convertir el video a MP4 compatible.",
              exportException as Throwable,
            )
          }
        },
      )
      .build()

    try {
      val mediaItem = MediaItem.fromUri(sourceUri)
      val videoEffects = listOf<Effect>(
        Presentation.createForHeight(720),
      )
      val editedMediaItem = EditedMediaItem.Builder(mediaItem)
        .setEffects(
          androidx.media3.transformer.Effects(
            emptyList(),
            videoEffects,
          ),
        )
        .build()
      val composition = Composition.Builder(
        EditedMediaItemSequence(editedMediaItem),
      ).build()

      transformer.start(composition, outputFile.absolutePath)
    } catch (error: Exception) {
      if (outputFile.exists()) {
        outputFile.delete()
      }

      promise.reject(
        "STATUS_VIDEO_TRANSCODE_START_FAILED",
        error.message
          ?: "No fue posible iniciar la conversión del video.",
        error,
      )
    }
  }

  @ReactMethod
  fun removeTemporaryVideo(
    uriValue: String,
    promise: Promise,
  ) {
    try {
      val uri = Uri.parse(uriValue)

      if (uri.scheme != "file") {
        promise.resolve(false)
        return
      }

      val file = File(uri.path ?: "")
      val cacheDirectory = File(
        reactContext.cacheDir,
        "beeapp-status-videos",
      ).canonicalFile

      val isInsideCacheDirectory = file.canonicalFile
        .path
        .startsWith(cacheDirectory.path + File.separator)

      promise.resolve(
        isInsideCacheDirectory && file.exists() && file.delete(),
      )
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }
}
