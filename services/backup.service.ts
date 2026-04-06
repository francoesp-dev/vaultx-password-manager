import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import EncryptionService from './encryption.service';
import DatabaseService from './database.service';

const VAULTX_SIGNATURE = "VAULTX_SECURE_CORE_V1";

export const exportVault = async (masterKey: string): Promise<boolean> => {
  try {
    const passwords = await DatabaseService.getAllPasswords();
    if (passwords.length === 0) return false;

    const cryptoEnvelope = {
      signature: VAULTX_SIGNATURE,
      appVersion: "1.0.0",
      timestamp: Date.now(),
      payload: passwords
    };

    const rawData = JSON.stringify(cryptoEnvelope);
    const encryptedObject = await EncryptionService.encrypt(rawData, masterKey);
    const finalBackupData = JSON.stringify(encryptedObject);

    const fileUri = `${FileSystem.documentDirectory}backup_${Date.now()}.vaultx`;
    await FileSystem.writeAsStringAsync(fileUri, finalBackupData, { encoding: 'utf8' });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'VaultX Backup Export',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("[BackupService] Export error:", error);
    return false;
  }
};

export const importVault = async (masterKey: string): Promise<boolean> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return false;

    const file = result.assets[0];
    const encryptedContent = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
    const backupObject = JSON.parse(encryptedContent);
    
    const decryptedData = await EncryptionService.decrypt(
      { iv: backupObject.iv, ciphertext: backupObject.ciphertext },
      masterKey
    );

    if (!decryptedData) throw new Error("Invalid Key");

    const parsedEnvelope = JSON.parse(decryptedData);
    if (parsedEnvelope.signature !== VAULTX_SIGNATURE) return false;

    for (const item of parsedEnvelope.payload) {
      try {
        await DatabaseService.insertPassword(
          item.siteName, item.username, item.iv, item.ciphertext, item.category
        );
      } catch (e) {
        continue;
      }
    }
    return true;
  } catch (error) {
    console.error("[BackupService] Import error:", error);
    return false;
  }
};

export default { exportVault, importVault };