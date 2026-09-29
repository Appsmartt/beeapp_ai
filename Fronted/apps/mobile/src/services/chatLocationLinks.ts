import { Linking, Platform } from 'react-native';

type ChatLocation = { latitude: number; longitude: number };

export async function openChatLocation(location: ChatLocation): Promise<void> {
  const { latitude, longitude } = location;
  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    throw new Error('Invalid chat location.');
  }

  const coordinates = `${latitude},${longitude}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;

  if (Platform.OS === 'ios') {
    for (const url of [
      `comgooglemaps://?q=${encodeURIComponent(coordinates)}`,
      `maps://?ll=${encodeURIComponent(coordinates)}&q=Ubicacion`,
    ]) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        // Try the next installed map application.
      }
    }
  } else if (Platform.OS === 'android') {
    const googleMapsIntent = `intent://maps.google.com/maps?q=${encodeURIComponent(coordinates)}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
    try {
      await Linking.openURL(googleMapsIntent);
      return;
    } catch {
      const geoUrl = `geo:0,0?q=${encodeURIComponent(coordinates)}`;
      try {
        if (await Linking.canOpenURL(geoUrl)) {
          await Linking.openURL(geoUrl);
          return;
        }
      } catch {
        // Fall through to the browser.
      }
    }
  }

  await Linking.openURL(webUrl);
}
