import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Copy,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Minus,
  Plus,
} from "lucide-react-native";
import EncryptionService from "../services/encryption.service";
import { SafeAreaView } from "react-native-safe-area-context";
import { LanguageContext } from "../context/LanguageContext";

export default function GeneratorScreen() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [lengthStr, setLengthStr] = useState("16");

  const { t } = useContext(LanguageContext);

  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [strength, setStrength] = useState({
    score: 0,
    level: "Calculating...",
    color: "#52525b",
  });

  const generateNewPassword = useCallback(async () => {
    try {
      const newPass = await EncryptionService.generatePassword({
        length,
        includeUppercase: options.uppercase,
        includeLowercase: options.lowercase,
        includeNumbers: options.numbers,
        includeSymbols: options.symbols,
      });

      setPassword(newPass);
      setStrength(EncryptionService.evaluatePasswordStrength(newPass));
    } catch (error) {
      console.error("Generator error:", error);
    }
  }, [length, options]);

  useEffect(() => {
    generateNewPassword();
  }, [generateNewPassword]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(password);
    setTimeout(async () => {
      try {
        await Clipboard.setStringAsync("");
      } catch (e) {
        console.log("[Generator] OS blocked background clipboard clearing");
      }
    }, 30000);
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.uppercase && !next.lowercase && !next.numbers && !next.symbols)
        return prev;
      return next;
    });
  };

  const applyLengthConstraints = (val: number) => {
    let finalVal = val;
    if (isNaN(finalVal) || finalVal < 8) finalVal = 8;
    if (finalVal > 128) finalVal = 128;

    setLength(finalVal);
    setLengthStr(finalVal.toString());
  };

  const changeLengthBtn = (delta: number) => {
    applyLengthConstraints(length + delta);
  };

  const handleKeyboardSubmit = () => {
    const val = parseInt(lengthStr, 10);
    applyLengthConstraints(val);
    Keyboard.dismiss();
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
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-3xl font-bold tracking-widest">
              <Text className="text-white">VAULT</Text>
              <Text className="text-emerald-400">X</Text>
            </Text>
            <Text className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
              {t('generatorTab')}
            </Text>
          </View>

          <View className="bg-[#0a0a0a] border border-emerald-900/30 rounded-2xl p-6 mb-6 items-center shadow-lg shadow-emerald-900/20">
            <Text className="text-emerald-400 text-3xl font-mono text-center tracking-widest mb-6">
              {password || "..."}
            </Text>

            <View className="flex-row items-center w-full justify-between pt-4 border-t border-white/5">
              <View className="flex-row items-center">
                {strength.score > 60 ? (
                  <ShieldCheck size={18} color={strength.color} />
                ) : (
                  <ShieldAlert size={18} color={strength.color} />
                )}
                <Text className="text-zinc-400 font-mono ml-2">
                  <Text style={{ color: strength.color }}>
                    {strength.level}
                  </Text>{" "}
                  ({strength.score}%)
                </Text>
              </View>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={generateNewPassword}
                  className="p-2.5 bg-white/5 rounded-xl border border-white/10"
                >
                  <RefreshCw size={20} color="#a1a1aa" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={copyToClipboard}
                  className="p-2.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xl"
                >
                  <Copy size={20} color="#34d399" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <Text className="text-zinc-500 font-mono text-xs mb-4 uppercase tracking-widest ml-1">
              {t("parametersTitleTab")}
            </Text>

            <View className="flex-row justify-between items-center py-3 border-b border-white/5">
              <Text className="text-zinc-300 font-mono">{t("lengthTab")}</Text>

              <View className="flex-row items-center space-x-3 bg-black/40 border border-white/10 rounded-lg p-1">
                <TouchableOpacity
                  onPress={() => changeLengthBtn(-1)}
                  className="p-2 bg-white/5 rounded-md"
                >
                  <Minus size={16} color="#a1a1aa" />
                </TouchableOpacity>

                <TextInput
                  className="text-emerald-400 font-mono text-lg text-center p-0 m-0 w-10"
                  value={lengthStr}
                  onChangeText={(text) =>
                    setLengthStr(text.replace(/[^0-9]/g, ""))
                  }
                  onBlur={handleKeyboardSubmit}
                  onSubmitEditing={handleKeyboardSubmit}
                  keyboardType="numeric"
                  keyboardAppearance="dark"
                  maxLength={3}
                  selectTextOnFocus
                />

                <TouchableOpacity
                  onPress={() => changeLengthBtn(1)}
                  className="p-2 bg-white/5 rounded-md"
                >
                  <Plus size={16} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
            </View>

            <SettingRow
              label={t("uppercaseTab")}
              value={options.uppercase}
              onToggle={() => toggleOption("uppercase")}
            />
            <SettingRow
              label={t("lowercaseTab")}
              value={options.lowercase}
              onToggle={() => toggleOption("lowercase")}
            />
            <SettingRow
              label={t("numbersTab")}
              value={options.numbers}
              onToggle={() => toggleOption("numbers")}
            />
            <SettingRow
              label={t("symbolsTab")}
              value={options.symbols}
              onToggle={() => toggleOption("symbols")}
              isLast
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SettingRow({ label, value, onToggle, isLast = false }: any) {
  return (
    <View
      className={`flex-row justify-between items-center py-3 ${!isLast ? "border-b border-white/5" : ""}`}
    >
      <Text className="text-zinc-300 font-mono">{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#18181b", true: "#065f46" }}
        thumbColor={value ? "#34d399" : "#71717a"}
      />
    </View>
  );
}
