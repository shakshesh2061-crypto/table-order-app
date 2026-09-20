import serverlessHttp from "serverless-http";
import { createApp } from "./app.js";

// Without an explicit binary list, serverless-http treats every response
// body as a UTF-8 string before handing it to API Gateway — any raw binary
// response (the QR PNG, uploaded photos if ever proxied) gets each non-ASCII
// byte replaced with the UTF-8 replacement character, corrupting the file.
// Declaring these content types here makes serverless-http base64-encode the
// body and set isBase64Encoded: true instead.
export const handler = serverlessHttp(createApp(), {
  binary: ["image/png", "image/jpeg", "image/webp", "image/gif"],
});
