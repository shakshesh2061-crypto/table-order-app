import { env } from "../config/env.js";
import { localDiskStorageProvider } from "./localDiskStorageProvider.js";
import { s3StorageProvider } from "./s3StorageProvider.js";
import type { StorageProvider } from "./storageProvider.js";

export const activeStorageProvider: StorageProvider =
  env.storageProvider === "s3" ? s3StorageProvider : localDiskStorageProvider;
