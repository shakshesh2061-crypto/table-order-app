import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { menuRouter } from "./routes/menu.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { staffRouter } from "./routes/staff.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  // Only serve local-disk uploads when actually using local storage — under
  // S3 storage (Lambda deployment), uploaded files are served directly from
  // S3's own public URL and this route has nothing to serve.
  if (env.storageProvider === "local") {
    app.use("/uploads", express.static(path.join(__dirname, "..", env.uploadsDir)));
  }

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api", ordersRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/admin", adminRouter);

  return app;
}
