import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  ShieldCheck,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  Fingerprint,
} from "lucide-react-native";
import CryptoJS from "crypto-js";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { LanguageContext } from "../context/LanguageContext";
import { AlertContext } from "../context/AlertContext";

interface AuthScreenProps {
  isRegistered: boolean;
  onAccessGranted: (derivedMasterKey: string) => void;
  onRegisterComplete: () => void;
}

export default function AuthScreen({
  isRegistered,
  onAccessGranted,
  onRegisterComplete,
}: AuthScreenProps) {
  const { t } = useContext(LanguageContext);
  const { showAlert } = useContext(AlertContext);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(compatible && enrolled);
    })();
  }, []);

  const handleAuth = async () => {
    if (!password) return showAlert("VaultX", t("authErrEmpty"), "warning");

    const masterKey = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    const validationHash = CryptoJS.SHA512(password).toString(CryptoJS.enc.Hex);

    if (!isRegistered) {
      if (password !== confirmPassword)
        return showAlert("Error", t("authErrMatch"), "error");
      if (password.length < 6)
        return showAlert("Security", t("authErrLength"), "warning");

      await SecureStore.setItemAsync("VAULT_AUTH_HASH", validationHash);
      await SecureStore.setItemAsync("VAULT_MASTER_KEY", masterKey);
      onRegisterComplete();
      onAccessGranted(masterKey);
    } else {
      const storedHash = await SecureStore.getItemAsync("VAULT_AUTH_HASH");
      if (storedHash === validationHash) {
        onAccessGranted(masterKey);
      } else {
        showAlert("Access Denied", t("authErrDenied"), "error");
      }
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const storedMasterKey =
        await SecureStore.getItemAsync("VAULT_MASTER_KEY");
      if (!storedMasterKey)
        return showAlert("Biometrics", t("authErrBioReq"), "info");

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock VaultX",
        fallbackLabel: "Use password",
      });

      if (result.success) onAccessGranted(storedMasterKey);
    } catch (e) {
      showAlert("Error", t("authErrBioRead"), "error");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: "#050505" }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-10">
            {isRegistered ? (
              <ShieldCheck size={80} color="#34d399" />
            ) : (
              <ShieldAlert size={80} color="#34d399" />
            )}
            <Text className="text-white text-6xl font-bold tracking-widest mt-6">
              VAULT<Text className="text-emerald-400">X</Text>
            </Text>
            <Text className="text-zinc-500 font-mono mt-2 uppercase text-xs tracking-widest">
              {t("authSubtitle")}
            </Text>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <View className="flex-row items-center bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4">
              <Lock size={20} color="#71717a" />
              <TextInput
                className="flex-1 text-white ml-3 font-mono text-base"
                placeholder={
                  isRegistered
                    ? t("authPassPlaceholder")
                    : t("authCreatePlaceholder")
                }
                placeholderTextColor="#71717a"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                {showPass ? (
                  <EyeOff size={20} color="#71717a" />
                ) : (
                  <Eye size={20} color="#a1a1aa" />
                )}
              </TouchableOpacity>
            </View>

            {!isRegistered && (
              <View className="flex-row items-center bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4">
                <Lock size={20} color="#71717a" />
                <TextInput
                  className="flex-1 text-white ml-3 font-mono text-base"
                  placeholder={t("authConfirmPlaceholder")}
                  placeholderTextColor="#71717a"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? (
                    <EyeOff size={20} color="#71717a" />
                  ) : (
                    <Eye size={20} color="#a1a1aa" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row space-x-3 mt-2">
              <TouchableOpacity
                onPress={handleAuth}
                className="bg-emerald-600 rounded-xl py-4 flex-1 items-center"
              >
                <Text className="text-white font-bold text-lg">
                  {isRegistered ? t("authBtnUnlock") : t("authBtnSetup")}
                </Text>
              </TouchableOpacity>
              {isRegistered && hasBiometrics && (
                <TouchableOpacity
                  onPress={handleBiometricAuth}
                  className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl w-16 items-center justify-center"
                >
                  <Fingerprint size={28} color="#34d399" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
