import { Router } from "express";
import { activeAuthProvider } from "../auth/activeAuthProvider.js";
import { authenticate } from "../auth/middleware.js";
import { loginSchema, registerSchema } from "../schemas/index.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await activeAuthProvider.register(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await activeAuthProvider.login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});
