import React, { useEffect, useState, useRef, useContext } from "react";
import { View, StatusBar, Platform, AppState } from "react-native";
import { NavigationContainer, Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShieldAlert, KeyRound, Settings } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenCapture from "expo-screen-capture";

import DatabaseService from "./services/database.service";
import VaultXScreen from "./screens/VaultXScreen";
import GeneratorScreen from "./screens/GeneratorScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AuthScreen from "./screens/AuthScreen";
import { AuthContext } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import { LanguageProvider, LanguageContext } from "./context/LanguageContext";

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

const VaultXTheme: Theme = {
  dark: true,
  colors: {
    primary: "#34d399",
    background: "#050505",
    card: "#0a0a0a",
    text: "#ffffff",
    border: "#1f2937",
    notification: "#ef4444",
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

function MainNavigator() {
  const { t } = useContext(LanguageContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          paddingTop: 12,
          paddingBottom: Platform.OS === "android" ? 36 : 28,
          minHeight: Platform.OS === "android" ? 120 : 85,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#34d399",
        tabBarInactiveTintColor: "#52525b",
        tabBarLabelStyle: {
          fontFamily: "monospace",
          fontSize: 10,
          paddingBottom: Platform.OS === "android" ? 5 : 0,
        },
      }}
    >
      <Tab.Screen
        name="Vault"
        component={VaultXScreen}
        options={{
          tabBarLabel: t("vaultTab"),
          tabBarIcon: ({ color, size }) => (
            <ShieldAlert size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Generator"
        component={GeneratorScreen}
        options={{
          tabBarLabel: t("generatorTab"),
          tabBarIcon: ({ color, size }) => (
            <KeyRound size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t("settingsTab"),
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterKey, setMasterKey] = useState("");

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        setIsAuthenticated(false);
        setMasterKey("");
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    async function setup() {
      try {
        await DatabaseService.initDatabase();
        await ScreenCapture.preventScreenCaptureAsync();

        const storedHash = await SecureStore.getItemAsync("VAULT_AUTH_HASH");
        if (storedHash) {
          setIsRegistered(true);
        }
      } catch (error) {
        console.error("[VaultX/App] Critical initialization error:", error);
      } finally {
        setIsAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AlertProvider>
          <View style={{ flex: 1, backgroundColor: "#050505" }}>
            <StatusBar barStyle="light-content" backgroundColor="#050505" />
            {!isAppReady ? null : !isAuthenticated ? (
              <AuthScreen
                isRegistered={isRegistered}
                onRegisterComplete={() => setIsRegistered(true)}
                onAccessGranted={(key) => {
                  setMasterKey(key);
                  setIsAuthenticated(true);
                }}
              />
            ) : (
              <AuthContext.Provider value={{ masterKey, setMasterKey }}>
                <NavigationContainer theme={VaultXTheme}>
                  <MainNavigator />
                </NavigationContainer>
              </AuthContext.Provider>
            )}
          </View>
        </AlertProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
