export type { Role, OrderStatus, AddonGroup, AddonOption, WsEvent, SetItemRef } from "@table-order/shared";
export { effectivePriceCents, POINTS_PER_DOLLAR_EARNED, POINTS_PER_DOLLAR_REDEEMED } from "@table-order/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "customer" | "staff" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
