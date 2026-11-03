import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureRequestCache } from '@beeapp/api-client';

import { getCachedAuthUserId } from './authSession';
import { hydrateImageDiskCache } from './imageDiskCache';

void hydrateImageDiskCache();

configureRequestCache({
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    getAllKeys: () => AsyncStorage.getAllKeys(),
    multiRemove: (keys) => AsyncStorage.multiRemove([...keys]),
    multiSet: (entries) => AsyncStorage.multiSet(
      entries.map(([key, value]) => [key, value]),
    ),
  },
  getUserId: getCachedAuthUserId,
});
