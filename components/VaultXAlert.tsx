import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ShieldAlert, ShieldCheck, Info } from "lucide-react-native";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface VaultAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  buttons?: AlertButton[];
  onClose: () => void;
}

export default function VaultAlert({
  visible,
  title,
  message,
  type = "info",
  buttons,
  onClose,
}: VaultAlertProps) {
  const getAlertStyle = () => {
    switch (type) {
      case "success":
        return {
          icon: <ShieldCheck size={36} color="#34d399" />,
          color: "text-emerald-400",
        };
      case "error":
        return {
          icon: <ShieldAlert size={36} color="#ef4444" />,
          color: "text-red-500",
        };
      case "warning":
        return {
          icon: <ShieldAlert size={36} color="#f59e0b" />,
          color: "text-amber-500",
        };
      default:
        return {
          icon: <Info size={36} color="#3b82f6" />,
          color: "text-blue-500",
        };
    }
  };

  const { icon, color } = getAlertStyle();

  const actionButtons =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", style: "default", onPress: () => {} }];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center items-center bg-black/80 px-6">
          <View className="bg-[#0a0a0a] w-full border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black">
            {/* Header with Icon */}
            <View className="items-center mb-4">
              <View className="bg-white/5 p-4 rounded-full mb-3">{icon}</View>
              <Text
                className={`text-xl font-bold tracking-wide ${color} text-center`}
              >
                {title}
              </Text>
            </View>

            {/* Message */}
            <Text className="text-zinc-300 font-mono text-sm text-center mb-8 leading-relaxed">
              {message}
            </Text>

            {/* Buttons */}
            <View
              className={`flex-row ${actionButtons.length > 1 ? "space-x-3" : ""}`}
            >
              {actionButtons.map((btn, index) => {
                const isDestructive = btn.style === "destructive";
                const isCancel = btn.style === "cancel";

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      onClose();
                    }}
                    className={`flex-1 py-3.5 rounded-xl items-center border
                      ${
                        isDestructive
                          ? "bg-red-500/10 border-red-500/30"
                          : isCancel
                            ? "bg-zinc-800/50 border-white/10"
                            : "bg-emerald-600 shadow-lg shadow-emerald-900/40 border-emerald-500"
                      }`}
                  >
                    <Text
                      className={`font-bold tracking-wide
                      ${
                        isDestructive
                          ? "text-red-400"
                          : isCancel
                            ? "text-zinc-300"
                            : "text-white"
                      }`}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
