export interface StorageProvider {
  save(fileName: string, buffer: Buffer): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
}
