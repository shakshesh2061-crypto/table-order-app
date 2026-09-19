import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../config/env.js";
import type { StorageProvider } from "./storageProvider.js";

export const localDiskStorageProvider: StorageProvider = {
  async save(fileName: string, buffer: Buffer) {
    await fs.mkdir(env.uploadsDir, { recursive: true });
    const ext = path.extname(fileName);
    const safeName = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(env.uploadsDir, safeName), buffer);
    return { url: `/uploads/${safeName}` };
  },

  async delete(url: string) {
    const safeName = path.basename(url);
    await fs.rm(path.join(env.uploadsDir, safeName), { force: true });
  },
};
