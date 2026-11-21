'use client';

import type { AgoraCallCredentials } from '@beeapp/api-client';
import type {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';

export type AgoraCallSession = {
  client: IAgoraRTCClient;
  localAudioTrack: ILocalAudioTrack;
  localVideoTrack?: ILocalVideoTrack;
  currentCameraId?: string;
};

async function loadAgoraRtc() {
  const mod = await import('agora-rtc-sdk-ng');
  return mod.default;
}

export async function joinAgoraCall(
  agora: AgoraCallCredentials,
  isVideo: boolean,
  elements: {
    localVideo?: HTMLElement | null;
    remoteVideo?: HTMLElement | null;
    onRemoteLeft?: () => void;
  },
): Promise<AgoraCallSession> {
  const AgoraRTC = await loadAgoraRtc();
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const uid = Number(agora.uid);
  await client.join(agora.app_id, agora.channel_name, agora.token, uid);

  const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  const tracks: Array<ILocalAudioTrack | ILocalVideoTrack> = [localAudioTrack];
  let localVideoTrack: ILocalVideoTrack | undefined;

  if (isVideo) {
    localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    tracks.push(localVideoTrack);
    if (elements.localVideo) {
      localVideoTrack.play(elements.localVideo);
    }
  }

  await client.publish(tracks);

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'video' && user.videoTrack && elements.remoteVideo) {
      user.videoTrack.play(elements.remoteVideo);
    }
    if (mediaType === 'audio' && user.audioTrack) {
      user.audioTrack.play();
    }
  });

  client.on('user-left', () => {
    if (client.remoteUsers.length === 0) {
      elements.onRemoteLeft?.();
    }
  });

  return { client, localAudioTrack, localVideoTrack };
}

export async function switchAgoraCamera(session: AgoraCallSession | null): Promise<boolean> {
  if (!session?.localVideoTrack) return false;
  try {
    const AgoraRTC = await loadAgoraRtc();
    const cameras = await AgoraRTC.getCameras();
    if (!cameras || cameras.length < 2) return false;
    const currentId = session.currentCameraId || cameras[0]?.deviceId;
    const currentIndex = cameras.findIndex((cam) => cam.deviceId === currentId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    if (!nextCamera) return false;
    const trackWithDevice = session.localVideoTrack as unknown as {
      setDevice?: (deviceId: string) => Promise<void>;
    };
    if (trackWithDevice.setDevice) {
      await trackWithDevice.setDevice(nextCamera.deviceId);
    }
    session.currentCameraId = nextCamera.deviceId;
    return true;
  } catch {
    return false;
  }
}

export async function leaveAgoraCall(session: AgoraCallSession | null): Promise<void> {
  if (!session) return;
  session.localAudioTrack.close();
  session.localVideoTrack?.close();
  await session.client.leave();
}
