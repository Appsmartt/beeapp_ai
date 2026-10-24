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
};

async function loadAgoraRtc() {
  const mod = await import('agora-rtc-sdk-ng');
  return mod.default;
}

export async function joinAgoraCall(
  agora: AgoraCallCredentials,
  isVideo: boolean,
  elements: { localVideo?: HTMLElement | null; remoteVideo?: HTMLElement | null },
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

  return { client, localAudioTrack, localVideoTrack };
}

export async function leaveAgoraCall(session: AgoraCallSession | null): Promise<void> {
  if (!session) return;
  session.localAudioTrack.close();
  session.localVideoTrack?.close();
  await session.client.leave();
}
