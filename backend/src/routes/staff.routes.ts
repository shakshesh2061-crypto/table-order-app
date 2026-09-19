import { Router } from "express";
import { authenticate, requireRole } from "../auth/middleware.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { menuRepository } from "../repositories/menuRepository.js";
import { tableRepository } from "../repositories/tableRepository.js";
import { orderService } from "../services/orderService.js";
import { activeEventPublisher } from "../realtime/activeEventPublisher.js";
import { updateOrderStatusSchema } from "../schemas/index.js";
import type { OrderStatus } from "../types/index.js";

export const staffRouter = Router();

staffRouter.get("/orders", authenticate, requireRole("staff", "admin"), async (req, res) => {
  const status = req.query.status as OrderStatus | undefined;
  const orders = status
    ? await orderRepository.listByStatuses([status])
    : await orderRepository.listByStatuses(["received", "preparing", "ready"]);
  res.json(orders);
});

staffRouter.patch("/orders/:id/status", authenticate, requireRole("staff", "admin"), async (req, res) => {
  const parsed = updateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const order = await orderService.advanceStatus(req.params.id, parsed.data.status);
    res.json(order);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

staffRouter.patch("/menu-items/:id/availability", authenticate, requireRole("staff", "admin"), async (req, res) => {
  const isAvailable = Boolean(req.body?.is_available);
  const item = await menuRepository.findItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  await menuRepository.setAvailability(req.params.id, isAvailable);
  await activeEventPublisher.publish({ type: "menu_item.availability_changed", itemId: req.params.id, isAvailable });
  res.json({ ok: true });
});

staffRouter.get("/tables", authenticate, requireRole("staff", "admin"), async (_req, res) => {
  const sessions = await tableRepository.listActiveSessionsWithTables();
  res.json(sessions);
});
