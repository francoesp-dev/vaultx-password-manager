import BackupService from "../services/backup.service";
import * as FileSystem from "expo-file-system/legacy";
import EncryptionService from "../services/encryption.service";
import CryptoJS from "crypto-js";

// 1. MOCK NATIVE MODULES
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://mock-dir/",
  writeAsStringAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock("expo-document-picker", () => ({}));

// 2. MOCK DATABASE (Prevent SQLite usage)
jest.mock("../services/database.service", () => ({
  getAllPasswords: jest
    .fn()
    .mockResolvedValue([
      {
        id: "1",
        siteName: "GitHub",
        username: "franco_dev",
        iv: "iv_mock",
        ciphertext: "cipher_mock",
        category: "General",
      },
    ]),
}));

describe("VaultX Backup System", () => {
  const RAW_USER_PASSWORD = "my_super_secret_master_key_123";
  const MASTER_KEY = CryptoJS.SHA256(RAW_USER_PASSWORD).toString(
    CryptoJS.enc.Hex,
  );

  it("should generate an encrypted file with the VAULTX_SECURE_CORE_V1 signature", async () => {
    jest.clearAllMocks();

    // 1. Execute export
    const success = await BackupService.exportVault(MASTER_KEY);

    // Verify the process succeeded
    expect(success).toBe(true);

    // 2. Intercept the mock file write
    const mockWrite = FileSystem.writeAsStringAsync as jest.Mock;
    const savedFileContent = mockWrite.mock.calls[0][1];

    // 3. Reverse engineering: Decrypt hte intercepted content
    const encryptedBackupObject = JSON.parse(savedFileContent);
    const decryptedRawData = await EncryptionService.decrypt(
      encryptedBackupObject,
      MASTER_KEY,
    );
    const envelope = JSON.parse(decryptedRawData);

    // 4. THE GRAND ASSSERTION: Verify signature and payload
    expect(envelope.signature).toBe("VAULTX_SECURE_CORE_V1");
    expect(envelope.appVersion).toBe("1.0.0");
    expect(envelope.payload.length).toBe(1);
    expect(envelope.payload[0].siteName).toBe("GitHub");
  });
});
