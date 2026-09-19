import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

let cached: string | undefined;

/**
 * Local dev: DB_PASSWORD is set directly (or unused, for the SQLite client).
 * Lambda: DB_PASSWORD_PARAM names an SSM SecureString fetched once per cold
 * start and cached in module scope for the container's lifetime — the
 * plaintext password never appears in an env var, CloudFormation template,
 * or stack output.
 */
export async function resolveDbPassword(): Promise<string | undefined> {
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  if (cached) return cached;

  const paramName = process.env.DB_PASSWORD_PARAM;
  if (!paramName) return undefined;

  const client = new SSMClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const result = await client.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
  cached = result.Parameter?.Value;
  return cached;
}
