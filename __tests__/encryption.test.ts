import EncryptionService from "../services/encryption.service";
import CryptoJS from "crypto-js"; // import CryptoJs to simulate Login

describe("VaultX Encryption Core", () => {
  // 1. Simulate AuthScreen behavior:s convert key to 256-bits (64 hex characters)
  const RAW_USER_PASSWORD = "my_super_secret_master_key_123";
  const MASTER_KEY = CryptoJS.SHA256(RAW_USER_PASSWORD).toString(
    CryptoJS.enc.Hex,
  );

  const RAW_PASSWORD = "MyBankPassword2026!";

  it("debe encriptar y desencriptar exitosamente con la llave correcta", async () => {
    // 1. Encrypt
    const encryptedData = await EncryptionService.encrypt(
      RAW_PASSWORD,
      MASTER_KEY,
    );

    // Verify it does not return plain text
    expect(encryptedData.ciphertext).not.toBe(RAW_PASSWORD);
    expect(encryptedData.iv).toBeDefined();

    // 2. Decrypt with the same key
    const decryptedText = await EncryptionService.decrypt(
      encryptedData,
      MASTER_KEY,
    );

    // 3. Assert the result matches the original
    expect(decryptedText).toBe(RAW_PASSWORD);
  });

  it("should fail to decrypt if an incorrect master key is used", async () => {
    const encryptedData = await EncryptionService.encrypt(
      RAW_PASSWORD,
      MASTER_KEY,
    );

    // Simulate a hacker trying another password
    const WRONG_USER_PASSWORD = "hacker_key_456";
    const WRONG_KEY = CryptoJS.SHA256(WRONG_USER_PASSWORD).toString(
      CryptoJS.enc.Hex,
    );

    // We expect this promise to reject ad throw an error
    await expect(
      EncryptionService.decrypt(encryptedData, WRONG_KEY),
    ).rejects.toThrow("[VaultX] Decryption error");
  });
});
