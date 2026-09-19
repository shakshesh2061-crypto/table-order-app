import { Router } from "express";
import multer from "multer";
import QRCode from "qrcode";
import { authenticate, requireRole } from "../auth/middleware.js";
import { menuRepository } from "../repositories/menuRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { tableRepository } from "../repositories/tableRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { activeStorageProvider } from "../storage/activeStorageProvider.js";
import { activeAuthProvider } from "../auth/activeAuthProvider.js";
import {
  createCategorySchema,
  createMenuItemSchema,
  createStaffSchema,
  createTableSchema,
  updateMenuItemSchema,
  updateStaffSchema,
} from "../schemas/index.js";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

adminRouter.use(authenticate, requireRole("admin"));

// --- Categories ---
adminRouter.post("/categories", async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const category = await menuRepository.createCategory(parsed.data.name, parsed.data.sort_order ?? 0);
  res.status(201).json(category);
});

adminRouter.patch("/categories/:id", async (req, res) => {
  await menuRepository.updateCategory(req.params.id, req.body);
  res.json({ ok: true });
});

adminRouter.delete("/categories/:id", async (req, res) => {
  await menuRepository.deleteCategory(req.params.id);
  res.json({ ok: true });
});

// --- Menu items ---
adminRouter.post("/menu-items", async (req, res) => {
  const parsed = createMenuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const item = await menuRepository.createItem(parsed.data);
  res.status(201).json(item);
});

adminRouter.patch("/menu-items/:id", async (req, res) => {
  const parsed = updateMenuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await menuRepository.updateItem(req.params.id, parsed.data);
  res.json({ ok: true });
});

adminRouter.delete("/menu-items/:id", async (req, res) => {
  await menuRepository.deleteItem(req.params.id);
  res.json({ ok: true });
});

adminRouter.post("/menu-items/:id/photo", upload.single("photo"), async (req, res) => {
  const item = await menuRepository.findItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (!req.file) return res.status(400).json({ error: "No photo uploaded" });
  const { url } = await activeStorageProvider.save(req.file.originalname, req.file.buffer);
  await menuRepository.updateItem(req.params.id, { photo_url: url } as never);
  res.json({ url });
});

// --- Staff accounts ---
adminRouter.get("/staff", async (_req, res) => {
  const [staff, admins] = await Promise.all([userRepository.listByRole("staff"), userRepository.listByRole("admin")]);
  res.json([...staff, ...admins].map(({ password_hash, ...rest }) => rest));
});

adminRouter.post("/staff", async (req, res) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const user = await activeAuthProvider.adminCreateUser(parsed.data);
    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

adminRouter.patch("/staff/:id", async (req, res) => {
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await userRepository.update(req.params.id, parsed.data);
  res.json({ ok: true });
});

adminRouter.delete("/staff/:id", async (req, res) => {
  const existing = await userRepository.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Staff account not found" });
  await activeAuthProvider.deleteUser(existing.email);
  await userRepository.delete(req.params.id);
  res.json({ ok: true });
});

// --- Tables / QR ---
adminRouter.get("/tables", async (_req, res) => {
  res.json(await tableRepository.list());
});

adminRouter.post("/tables", async (req, res) => {
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const table = await tableRepository.create(parsed.data.label);
  res.status(201).json(table);
});

adminRouter.patch("/tables/:id", async (req, res) => {
  await tableRepository.update(req.params.id, req.body);
  res.json({ ok: true });
});

adminRouter.delete("/tables/:id", async (req, res) => {
  await tableRepository.delete(req.params.id);
  res.json({ ok: true });
});

adminRouter.get("/tables/:id/qr", async (req, res) => {
  const table = await tableRepository.findById(req.params.id);
  if (!table) return res.status(404).json({ error: "Table not found" });
  const orderUrl = `${req.protocol}://${req.get("host")}/order?table=${table.qr_token}`;
  const png = await QRCode.toBuffer(orderUrl, { width: 400 });
  res.setHeader("Content-Type", "image/png");
  res.send(png);
});

// --- Analytics ---
adminRouter.get("/analytics/daily-orders", async (req, res) => {
  const date = (req.query.date as string) ?? new Date().toISOString();
  res.json({ date, count: await orderRepository.dailyOrderCount(date) });
});

adminRouter.get("/analytics/revenue", async (req, res) => {
  const from = (req.query.from as string) ?? new Date(0).toISOString();
  const to = (req.query.to as string) ?? new Date().toISOString();
  res.json({ from, to, revenue_cents: await orderRepository.revenueBetween(from, to) });
});

adminRouter.get("/analytics/popular-items", async (req, res) => {
  const limit = Number(req.query.limit ?? 5);
  res.json(await orderRepository.popularItems(limit));
});
