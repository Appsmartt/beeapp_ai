import AsyncStorage from '@react-native-async-storage/async-storage';

const SNAPSHOT_KEY = 'beeapp.side-menu-profile.v1';

export interface SideMenuProfileSnapshot {
  name: string;
  email: string;
  initials: string;
  avatarFileId: string | null;
}

export async function readSideMenuProfileSnapshot(): Promise<
  SideMenuProfileSnapshot | null
> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SideMenuProfileSnapshot>;
    if (!parsed || typeof parsed.name !== 'string') {
      return null;
    }

    return {
      name: parsed.name,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      initials: typeof parsed.initials === 'string' && parsed.initials
        ? parsed.initials
        : '?',
      avatarFileId: typeof parsed.avatarFileId === 'string'
        ? parsed.avatarFileId
        : null,
    };
  } catch {
    return null;
  }
}

export async function writeSideMenuProfileSnapshot(
  snapshot: SideMenuProfileSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function clearSideMenuProfileSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(SNAPSHOT_KEY);
}
