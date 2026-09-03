import { useFonts, NotoSerifKR_400Regular, NotoSerifKR_600SemiBold } from '@expo-google-fonts/noto-serif-kr';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ChartProvider } from '../src/state/ChartContext';
import { AuthProviderRoot } from '../src/state/AuthContext';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { WebPhoneFrame } from '../src/components/WebPhoneFrame';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <WebPhoneFrame>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        <OfflineBanner />
      </WebPhoneFrame>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoSerifKR_400Regular, NotoSerifKR_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProviderRoot>
        <ChartProvider>
          <RootStack />
        </ChartProvider>
      </AuthProviderRoot>
    </ThemeProvider>
  );
}
