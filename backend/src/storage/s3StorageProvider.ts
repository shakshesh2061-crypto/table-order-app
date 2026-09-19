import { randomUUID } from "node:crypto";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import type { StorageProvider } from "./storageProvider.js";

const client = new S3Client({ region: env.s3Region });

function requireBucket(): string {
  if (!env.s3BucketName) throw new Error("S3_BUCKET_NAME is not configured");
  return env.s3BucketName;
}

export const s3StorageProvider: StorageProvider = {
  async save(fileName: string, buffer: Buffer) {
    const bucket = requireBucket();
    const ext = path.extname(fileName);
    const key = `menu-photos/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentTypeFor(ext),
      })
    );

    return { url: `https://${bucket}.s3.${env.s3Region}.amazonaws.com/${key}` };
  },

  async delete(url: string) {
    const bucket = requireBucket();
    const key = url.split(`.amazonaws.com/`)[1];
    if (!key) return;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};

function contentTypeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}
