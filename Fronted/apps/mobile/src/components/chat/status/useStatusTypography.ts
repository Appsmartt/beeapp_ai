import { useFonts } from 'expo-font';
import {
  Anton_400Regular,
} from '@expo-google-fonts/anton';
import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  Caveat_600SemiBold,
} from '@expo-google-fonts/caveat';
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';
import {
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope';
import {
  NunitoSans_600SemiBold,
} from '@expo-google-fonts/nunito-sans';
import {
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Quicksand_600SemiBold,
} from '@expo-google-fonts/quicksand';
import {
  Righteous_400Regular,
} from '@expo-google-fonts/righteous';

export function useStatusTypography() {
  const [fontsLoaded, fontLoadError] = useFonts({
    Anton_400Regular,
    BebasNeue_400Regular,
    Caveat_600SemiBold,
    DMSerifDisplay_400Regular,
    Manrope_600SemiBold,
    NunitoSans_600SemiBold,
    PlayfairDisplay_700Bold,
    Quicksand_600SemiBold,
    Righteous_400Regular,
  });

  return {
    fontsLoaded,
    fontLoadError,
  };
}
