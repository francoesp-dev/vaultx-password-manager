import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Settings,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Globe,
  CloudUpload,
  CloudDownload,
} from "lucide-react-native";
import CryptoJS from "crypto-js";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";

import DatabaseService from "../services/database.service";
import EncryptionService from "../services/encryption.service";
import BackupService from "../services/backup.service";
import { AuthContext } from "../context/AuthContext";
import { AlertContext } from "../context/AlertContext";
import { LanguageContext } from "../context/LanguageContext";

export default function SettingsScreen() {
  const { showAlert } = useContext(AlertContext);
  const { masterKey, setMasterKey } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPass || !newPass || !confirmPass)
      return showAlert("Error", "Please fill all fields.", "error");
    if (newPass !== confirmPass)
      return showAlert("Error", "Passwords do not match.", "error");
    if (newPass.length < 6)
      return showAlert("Error", "Minimum 6 characters.", "error");

    setIsProcessing(true);
    try {
      const validationHash = CryptoJS.SHA512(currentPass).toString(
        CryptoJS.enc.Hex,
      );
      const storedHash = await SecureStore.getItemAsync("VAULT_AUTH_HASH");

      if (validationHash !== storedHash) {
        setIsProcessing(false);
        return showAlert(
          "Access Denied",
          "Incorrect current password.",
          "error",
        );
      }

      const newValidationHash = CryptoJS.SHA512(newPass).toString(
        CryptoJS.enc.Hex,
      );
      const newMasterKey = CryptoJS.SHA256(newPass).toString(CryptoJS.enc.Hex);

      await SecureStore.setItemAsync("VAULT_MASTER_KEY", newMasterKey);
      const allCredentials = await DatabaseService.getAllPasswords();

      for (const item of allCredentials) {
        const plaintext = await EncryptionService.decrypt(
          { iv: item.iv, ciphertext: item.ciphertext },
          masterKey,
        );
        const newEncryptedData = await EncryptionService.encrypt(
          plaintext,
          newMasterKey,
        );
        await DatabaseService.deletePassword(item.id);
        await DatabaseService.insertPassword(
          item.siteName,
          item.username,
          newEncryptedData.iv,
          newEncryptedData.ciphertext,
          item.category || "General",
        );
      }

      await SecureStore.setItemAsync("VAULT_AUTH_HASH", newValidationHash);
      setMasterKey(newMasterKey);

      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      showAlert("Success", "Security core re-encrypted.", "success");
    } catch (error) {
      showAlert("Critical Error", "Failed to change master key.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    const success = await BackupService.exportVault(masterKey);
    setIsProcessing(false);
    if (success)
      showAlert("Success", "Security backup exported successfully.", "success");
  };

  const handleImport = async () => {
    showAlert(
      "Restore Vault",
      "This will add the credentials from the backup to your current vault. You need the original master key. Continue?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            const success = await BackupService.importVault(masterKey);
            setIsProcessing(false);
            if (success) {
              showAlert(
                "Vault Restored",
                "Data recovered successfully.",
                "success",
              );
            } else {
              showAlert(
                "Error",
                "Could not decrypt. Corrupt file or incorrect master key.",
                "error",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#050505" }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="items-center mb-5">
            <View className="bg-white/5 p-4 rounded-full mt-5">
              <Settings size={40} color="#34D399" />
            </View>
            <Text className="text-3xl font-bold tracking-widest mt-4">
              <Text className="text-white">VAULT</Text>
              <Text className="text-emerald-400">X</Text>
            </Text>
            <Text className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">
              {t("settingsTitle")}
            </Text>
          </View>

          <View className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-xl shadow-black mt-4">
            <View className="flex-row items-center mb-4">
              <Globe size={18} color="#71717a" />
              <Text className="text-zinc-500 text-xs font-mono uppercase tracking-widest ml-2">
                {t("languageParams")}
              </Text>
            </View>

            <View className="flex-row bg-black/60 border border-white/10 rounded-xl p-1">
              <TouchableOpacity
                onPress={() => setLanguage("en")}
                className={`flex-1 py-3 rounded-lg items-center transition-all ${language === "en" ? "bg-emerald-600 shadow-lg shadow-emerald-900/50" : ""}`}
              >
                <Text
                  className={`font-mono font-bold tracking-widest ${language === "en" ? "text-white" : "text-zinc-500"}`}
                >
                  ENGLISH
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLanguage("es")}
                className={`flex-1 py-3 rounded-lg items-center transition-all ${language === "es" ? "bg-emerald-600 shadow-lg shadow-emerald-900/50" : ""}`}
              >
                <Text
                  className={`font-mono font-bold tracking-widest ${language === "es" ? "text-white" : "text-zinc-500"}`}
                >
                  ESPAÑOL
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-xl shadow-black mt-4">
            <Text className="text-emerald-500/50 text-xs font-mono mb-5 uppercase tracking-widest ml-1">
              {t("securityCore")}
            </Text>

            <View className="space-y-5">
              <View>
                <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                  {t("currentCredential")}
                </Text>
                <View className="bg-black/60 border border-white/10 rounded-xl px-4 flex-row items-center">
                  <KeyRound size={18} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white py-3.5 ml-3 mr-2 font-mono"
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                    secureTextEntry={!showCurrent}
                    value={currentPass}
                    onChangeText={setCurrentPass}
                    keyboardAppearance="dark"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrent(!showCurrent)}
                    className="p-2"
                  >
                    {showCurrent ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#a1a1aa" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View className="border-t border-white/5 pt-5">
                <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                  {t("newMasterKey")}
                </Text>
                <View className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl px-4 flex-row items-center">
                  <Lock size={18} color="#34d399" />
                  <TextInput
                    className="flex-1 text-emerald-400 py-3.5 ml-3 mr-2 font-mono"
                    placeholder="••••••••"
                    placeholderTextColor="#065f46"
                    secureTextEntry={!showNew}
                    value={newPass}
                    onChangeText={setNewPass}
                    keyboardAppearance="dark"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    className="p-2"
                  >
                    {showNew ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#34d399" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                  {t("confirmMasterKey")}
                </Text>
                <View className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl px-4 flex-row items-center">
                  <Lock size={18} color="#34d399" />
                  <TextInput
                    className="flex-1 text-emerald-400 py-3.5 ml-3 mr-2 font-mono"
                    placeholder="••••••••"
                    placeholderTextColor="#065f46"
                    secureTextEntry={!showConfirm}
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                    keyboardAppearance="dark"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    className="p-2"
                  >
                    {showConfirm ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#34d399" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePasswordChange}
              disabled={isProcessing}
              className={`rounded-xl py-4 items-center mt-8 ${isProcessing ? "bg-zinc-800" : "bg-emerald-600 shadow-lg shadow-emerald-900/40"}`}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg tracking-wide">
                  {t("updateBtn")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-xl shadow-black mt-4">
            <Text className="text-emerald-500/50 text-xs font-mono mb-5 uppercase tracking-widest ml-1">
              {t("backupTitle")}
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={handleImport}
                disabled={isProcessing}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl py-4 items-center flex-row justify-center space-x-2"
              >
                <CloudUpload size={18} color="#34d399" />
                <Text className="text-white font-mono text-sm tracking-wide ml-2">
                  {t("backupUplLabel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExport}
                disabled={isProcessing}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl py-4 items-center flex-row justify-center space-x-2"
              >
                <CloudDownload size={18} color="#a1a1aa" />
                <Text className="text-zinc-400 font-mono text-sm tracking-wide ml-2">
                  {t("backupExpLabel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}