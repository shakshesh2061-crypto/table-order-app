import { Router } from "express";
import { authenticate, optionalAuthenticate, requireRole } from "../auth/middleware.js";
import { createOrderSchema } from "../schemas/index.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { tableRepository } from "../repositories/tableRepository.js";
import { orderService, tableSessionService } from "../services/orderService.js";
import { userRepository } from "../repositories/userRepository.js";

export const ordersRouter = Router();

ordersRouter.get("/loyalty/points", authenticate, requireRole("customer"), async (req, res) => {
  const points = await userRepository.getPoints(req.user!.id);
  res.json({ points });
});

ordersRouter.post("/tables/:qrToken/session", async (req, res) => {
  try {
    const { table, session } = await tableSessionService.resolveOrCreate(req.params.qrToken);
    res.json({ table: { id: table.id, label: table.label }, session });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

ordersRouter.post("/orders", optionalAuthenticate, async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const order = await orderService.placeOrder({
      tableSessionId: parsed.data.table_session_id ?? undefined,
      customerId: req.user?.role === "customer" ? req.user.id : undefined,
      specialRequests: parsed.data.special_requests ?? undefined,
      items: parsed.data.items,
      redeemPoints: parsed.data.redeem_points,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

ordersRouter.get("/orders/mine", authenticate, requireRole("customer"), async (req, res) => {
  const orders = await orderRepository.listByCustomer(req.user!.id);
  res.json(orders);
});

ordersRouter.get("/orders/session/:sessionToken", async (req, res) => {
  const session = await tableRepository.findSessionByToken(req.params.sessionToken);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const orders = await orderRepository.listBySession(session.id);
  res.json(orders);
});

ordersRouter.get("/orders/:id", optionalAuthenticate, async (req, res) => {
  const order = await orderRepository.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isOwner = req.user?.role === "customer" && order.customer_id === req.user.id;
  const isStaff = req.user?.role === "staff" || req.user?.role === "admin";

  let isGuestWithSession = false;
  const sessionToken = req.query.sessionToken as string | undefined;
  if (sessionToken && order.table_session_id) {
    const session = await tableRepository.findSessionByToken(sessionToken);
    isGuestWithSession = Boolean(session && session.id === order.table_session_id);
  }

  if (!isOwner && !isStaff && !isGuestWithSession) {
    return res.status(403).json({ error: "Not authorized to view this order" });
  }
  res.json(order);
});

ordersRouter.post("/orders/:id/reorder", authenticate, requireRole("customer"), async (req, res) => {
  try {
    const order = await orderService.reorder(req.params.id, req.user!.id);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
