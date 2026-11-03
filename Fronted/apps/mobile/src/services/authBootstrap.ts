import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureSupabaseAuthStorage } from '@beeapp/api-client';

configureSupabaseAuthStorage({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});
