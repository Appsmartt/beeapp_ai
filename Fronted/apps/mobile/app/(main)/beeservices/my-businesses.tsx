import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Plus,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useRouter,
} from 'expo-router';

import type {
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

import OwnedCommercialProfileCard from '../../../src/components/buddyservices/OwnedCommercialProfileCard';
import OwnedCommercialProfilesState from '../../../src/components/buddyservices/OwnedCommercialProfilesState';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesCreateBusinessRoute,
buddyServicesManageBusinessRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  loadOwnedCommercialProfiles,
} from '../../../src/services/commercialService';

export default function BuddyServicesMyBusinessesScreen() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<
    CommercialOwnedProfile[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialProfiles();

      setProfiles(response.profiles);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: '#FFFCF9',
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Volver a BuddyServices"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            width: 42,
          }}
        >
          <ArrowLeft
            color="#3D245E"
            size={21}
          />
        </TouchableOpacity>

        <Text
          style={{
            color: '#261743',
            fontSize: 19,
            fontWeight: '800',
          }}
        >
          Mis negocios
        </Text>

        <View
          style={{
            width: 42,
          }}
        />
      </View>

      {isLoading ? (
        <OwnedCommercialProfilesState kind="loading" />
      ) : errorMessage ? (
        <OwnedCommercialProfilesState
          kind="error"
          message={errorMessage}
          onRetry={() => {
            void loadProfiles();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 34,
            paddingHorizontal: 18,
            paddingTop: 22,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 23,
              fontWeight: '900',
            }}
          >
            Administra tus negocios
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 7,
            }}
          >
            Cada negocio conserva sus propios catálogos,
            ofertas, pagos y operaciones.
          </Text>

          {profiles.length === 0 ? (
            <OwnedCommercialProfilesState kind="empty" />
          ) : (
            <View
              style={{
                marginTop: 20,
              }}
            >
              {profiles.map((profile) => (
                <OwnedCommercialProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={() => {
router.push(
buddyServicesManageBusinessRoute(profile.id),
);
}}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            accessibilityHint={
              'La creación requiere un contrato real del backend.'
            }
            accessibilityLabel="Crear un negocio"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              router.push(
                buddyServicesCreateBusinessRoute(),
              );
            }}
            style={{
              alignItems: 'center',
              backgroundColor: '#7427D5',
              borderRadius: 15,
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 22,
              minHeight: 50,
              paddingHorizontal: 18,
            }}
          >
            <Plus
              color="#FFFFFF"
              size={20}
            />

            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '800',
                marginLeft: 8,
              }}
            >
              Crear negocio
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}
