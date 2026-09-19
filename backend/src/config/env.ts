import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  uploadsDir: required("UPLOADS_DIR", "./uploads"),

  authProvider: (process.env.AUTH_PROVIDER ?? "local") as "local" | "cognito",
  storageProvider: (process.env.STORAGE_PROVIDER ?? "local") as "local" | "s3",

  cognitoRegion: process.env.AWS_REGION ?? "us-east-1",
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,

  s3BucketName: process.env.S3_BUCKET_NAME,
  s3Region: process.env.AWS_REGION ?? "us-east-1",

  realtimePublisher: (process.env.REALTIME_PUBLISHER ?? "local") as "local" | "dynamodb",
  wsEventsTable: process.env.WS_EVENTS_TABLE,
  wsConnectionsTable: process.env.WS_CONNECTIONS_TABLE,
  dynamoRegion: process.env.AWS_REGION ?? "us-east-1",
};
