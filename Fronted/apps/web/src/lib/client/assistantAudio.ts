export interface RecordedAssistantClip {
  audioBase64: string;
  mime: string;
  durationMs: number;
}

export interface BrowserRecording {
  stop: () => Promise<RecordedAssistantClip>;
  cancel: () => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function startBrowserRecording(): Promise<BrowserRecording> {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    const startedAt = performance.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
    });
    recorder.start();
    return {
      cancel: () => {
        if (recorder.state !== 'inactive') recorder.stop();
      },
      stop: async () => {
        if (recorder.state !== 'inactive') recorder.stop();
        const blob = await stopped;
        return {
          audioBase64: await blobToBase64(blob),
          mime: blob.type || 'audio/webm',
          durationMs: Math.round(performance.now() - startedAt),
        };
      },
    };
  });
}
