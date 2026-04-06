import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import EncryptionService from "../services/encryption.service";

const SECURE_KEYS = {
  SALT: "argent_vault_salt",
  VERIFICATION_HASH: "argent_vault_verify_hash",
  MASTER_KEY: "argent_vault_master_key",
};

export const useAuth = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);

      const salt = await SecureStore.getItemAsync(SECURE_KEYS.SALT);
      setHasAccount(!!salt);
    };

    checkStatus();
  }, []);

  const setupAccount = async (masterPassword: string) => {
    try {
      const { key, salt, verificationHash } = await EncryptionService.deriveKey(masterPassword);

      await SecureStore.setItemAsync(SECURE_KEYS.SALT, salt);
      await SecureStore.setItemAsync(SECURE_KEYS.VERIFICATION_HASH, verificationHash);

      await SecureStore.setItemAsync(SECURE_KEYS.MASTER_KEY, key, {
        requireAuthentication: isBiometricSupported,
      });

      setMasterKey(key);
      setIsUnlocked(true);
      setHasAccount(true);

      return true;
    } catch (error) {
      console.error("[Auth] Account setup failed:", error);
      return false;
    }
  };

  const loginWithPassword = async (masterPassword: string) => {
    try {
      const salt = await SecureStore.getItemAsync(SECURE_KEYS.SALT);
      const savedHash = await SecureStore.getItemAsync(SECURE_KEYS.VERIFICATION_HASH);

      if (!salt || !savedHash) throw new Error("Account not configured.");

      const isValid = await EncryptionService.verifyMasterPassword(masterPassword, salt, savedHash);
      if (!isValid) return false;

      const { key } = await EncryptionService.deriveKey(masterPassword, salt);

      setMasterKey(key);
      setIsUnlocked(true);
      return true;
    } catch (error) {
      console.error("[Auth] Manual login failed:", error);
      return false;
    }
  };

  const loginWithBiometrics = async () => {
    if (!isBiometricSupported) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock VaultX",
        fallbackLabel: "Use Master Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        const key = await SecureStore.getItemAsync(SECURE_KEYS.MASTER_KEY, {
          requireAuthentication: true,
        });

        if (key) {
          setMasterKey(key);
          setIsUnlocked(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("[Auth] Biometric authentication failed:", error);
      return false;
    }
  };

  const lockVault = useCallback(() => {
    if (masterKey) {
      EncryptionService.secureClear(masterKey);
    }
    setMasterKey(null);
    setIsUnlocked(false);
  }, [masterKey]);

  return {
    isUnlocked,
    hasAccount,
    masterKey,
    isBiometricSupported,
    setupAccount,
    loginWithPassword,
    loginWithBiometrics,
    lockVault,
  };
};

export default useAuth;