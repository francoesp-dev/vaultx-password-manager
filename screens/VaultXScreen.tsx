import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Search,
  Plus,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  Trash2,
  X,
  Save,
  Edit,
} from "lucide-react-native";
import CryptoJS from "crypto-js";
import { SafeAreaView } from "react-native-safe-area-context";

import DatabaseService, { PasswordEntry } from "../services/database.service";
import EncryptionService from "../services/encryption.service";
import { AuthContext } from "../context/AuthContext";
import { LanguageContext } from "../context/LanguageContext";
import { AlertContext } from "../context/AlertContext";

export default function VaultXScreen() {
  const { masterKey } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { showAlert } = useContext(AlertContext);

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSite, setNewSite] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showModalPass, setShowModalPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await DatabaseService.getAllPasswords();
      setPasswords(data);
    } catch (error) {
      console.error("[VaultX] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditModal = async (item: PasswordEntry) => {
    try {
      const plaintext = await EncryptionService.decrypt(
        { iv: item.iv, ciphertext: item.ciphertext },
        masterKey,
      );
      setEditingId(item.id);
      setNewSite(item.siteName);
      setNewUser(item.username);
      setNewPass(plaintext);
      setShowModalPass(false);
      setIsModalVisible(true);
    } catch (error) {
      showAlert("Error", "Could not decrypt credential.", "error");
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingId(null);
    setNewSite("");
    setNewUser("");
    setNewPass("");
    setShowModalPass(false);
  };

  const handleSaveCredential = async () => {
    if (!newSite || !newUser || !newPass)
      return showAlert("Error", "Fill all fields.", "error");
    if (newPass.length < 6)
      return showAlert("Warning", "Minimum 6 characters.", "warning");

    const hashedInput = CryptoJS.SHA256(newPass).toString(CryptoJS.enc.Hex);
    if (hashedInput === masterKey)
      return showAlert(
        "Security Violation",
        "Do not use your master key here.",
        "error",
      );

    setIsSaving(true);
    try {
      const encryptedData = await EncryptionService.encrypt(newPass, masterKey);
      if (editingId) {
        await DatabaseService.updatePassword(
          editingId,
          newSite,
          newUser,
          encryptedData.iv,
          encryptedData.ciphertext,
          "General",
        );
      } else {
        await DatabaseService.insertPassword(
          newSite,
          newUser,
          encryptedData.iv,
          encryptedData.ciphertext,
          "General",
        );
      }
      closeModal();
      loadData();
    } catch (error) {
      showAlert("Critical Error", "Problem saving credential.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    showAlert(
      "Delete Credential",
      "Do you want to permanently delete this credential?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await DatabaseService.deletePassword(id);
            loadData();
          },
        },
      ],
    );
  };

  const copyToClipboard = async (item: PasswordEntry) => {
    try {
      const plaintext = await EncryptionService.decrypt(
        { iv: item.iv, ciphertext: item.ciphertext },
        masterKey,
      );
      await Clipboard.setStringAsync(plaintext);
      showAlert("Copied", "Password copied. It will be cleared in 30s.", "success");

      setTimeout(async () => {
        try {
          await Clipboard.setStringAsync("");
        } catch (e) {
          console.log("[VaultX] OS blocked background clipboard clearing");
        }
      }, 30000);
    } catch (error) {
      showAlert("Error", "It could not be copied.", "error");
    }
  };

  const filteredPasswords = passwords.filter(
    (p) =>
      p.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading)
    return (
      <View className="flex-1 bg-[#050505] justify-center items-center">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#050505] px-6 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold tracking-widest">
          <Text className="text-white">VAULT</Text>
          <Text className="text-emerald-400">X</Text>
        </Text>
        <ShieldCheck size={28} color="#34d399" />
      </View>

      <View className="flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3 mb-6">
        <Search size={20} color="#71717a" />
        <TextInput
          className="flex-1 text-white ml-3 font-mono"
          placeholder={t("searchCredentialsTab")}
          placeholderTextColor="#71717a"
          keyboardAppearance="dark"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredPasswords}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center mt-8 p-6 bg-white/5 border border-white/10 rounded-3xl border-dashed">
            <ShieldCheck size={48} color="#27272a" className="mb-4" />
            <Text className="text-zinc-500 font-mono text-center">
              {t("emptyVaultTitleTab")}
            </Text>
            <Text className="text-zinc-600 font-mono text-center text-xs mt-2">
              {t("emptyVaultSubtitleTab")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-4 shadow-lg shadow-black">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {item.siteName}
                </Text>
                <Text className="text-emerald-400 font-mono mt-1 text-sm">
                  {item.username}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-5 pt-4 border-t border-white/5">
              <TouchableOpacity
                onPress={() => copyToClipboard(item)}
                className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Copy size={16} color="#34d399" />
                <Text className="text-emerald-400 font-bold ml-2 text-sm">
                  Copy
                </Text>
              </TouchableOpacity>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  className="bg-zinc-800/50 border border-white/10 p-2.5 rounded-xl"
                >
                  <Edit size={18} color="#a1a1aa" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl"
                >
                  <Trash2 size={18} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        className="absolute bottom-6 right-6 bg-emerald-600 w-16 h-16 rounded-full items-center justify-center shadow-xl shadow-emerald-900/50"
      >
        <Plus size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <View className="flex-1 bg-black/90 justify-end">
            <View className="bg-[#0a0a0a] border-t border-white/10 p-6 rounded-t-3xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-xl font-bold tracking-wide">
                  {editingId
                    ? t("updateCredentialTitle")
                    : t("newCredentialTitle")}
                </Text>
                <TouchableOpacity
                  onPress={closeModal}
                  className="bg-white/5 p-2 rounded-full"
                >
                  <X size={20} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              <View className="space-y-5">
                <View>
                  <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                    {t("modalPlatformTab")}
                  </Text>
                  <TextInput
                    className="bg-black/60 border border-white/10 text-white rounded-xl px-4 py-3.5 font-mono"
                    placeholder="Ex: GitHub, AWS..."
                    placeholderTextColor="#52525b"
                    keyboardAppearance="dark"
                    value={newSite}
                    onChangeText={setNewSite}
                  />
                </View>

                <View>
                  <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                    {t("modalUsernameTab")}
                  </Text>
                  <TextInput
                    className="bg-black/60 border border-white/10 text-white rounded-xl px-4 py-3.5 font-mono"
                    placeholder="user@vaultx.com"
                    placeholderTextColor="#52525b"
                    keyboardAppearance="dark"
                    autoCapitalize="none"
                    value={newUser}
                    onChangeText={setNewUser}
                  />
                </View>

                <View>
                  <Text className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest ml-1">
                    {t("modalPasswordTab")}
                  </Text>
                  <View className="flex-row items-center bg-black/60 border border-white/10 rounded-xl px-4">
                    <TextInput
                      className="flex-1 text-emerald-400 py-3.5 font-mono"
                      placeholder="••••••••"
                      placeholderTextColor="#52525b"
                      secureTextEntry={!showModalPass}
                      keyboardAppearance="dark"
                      value={newPass}
                      onChangeText={setNewPass}
                    />
                    <TouchableOpacity
                      onPress={() => setShowModalPass(!showModalPass)}
                      className="p-2"
                    >
                      {showModalPass ? (
                        <EyeOff size={20} color="#71717a" />
                      ) : (
                        <Eye size={20} color="#34d399" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSaveCredential}
                  disabled={isSaving}
                  className={`rounded-xl py-4 flex-row justify-center items-center my-8 ${isSaving ? "bg-emerald-900" : "bg-emerald-600 shadow-lg shadow-emerald-900/30"}`}
                >
                  {isSaving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Save size={20} color="white" />
                      <Text className="text-white font-bold text-lg ml-2">
                        {editingId
                          ? t("modalUpdateCredentialTab")
                          : t("modalNewCredentialTab")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
