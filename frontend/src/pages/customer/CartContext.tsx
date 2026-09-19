import { createContext, useContext, useState, type ReactNode } from "react";
import type { MenuItem, SelectedAddon } from "../../types";
import { effectivePriceCents } from "../../types";

export interface CartLine {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  selectedAddons: SelectedAddon[];
}

interface CartContextValue {
  lines: CartLine[];
  tableSessionId: string | null;
  tableSessionToken: string | null;
  tableLabel: string | null;
  setTableSession: (id: string | null, token: string | null, label: string | null) => void;
  addLine: (menuItem: MenuItem, quantity: number, selectedAddons: SelectedAddon[]) => void;
  removeLine: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const MAX_ITEM_QUANTITY = 9;

function lineTotal(line: CartLine): number {
  const addonsTotal = line.selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);
  const basePrice = effectivePriceCents(line.menuItem.price_cents, line.menuItem.discount_percent);
  return (basePrice + addonsTotal) * line.quantity;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [tableSessionId, setTableSessionId] = useState<string | null>(
    () => sessionStorage.getItem("table_session_id")
  );
  const [tableSessionToken, setTableSessionToken] = useState<string | null>(
    () => sessionStorage.getItem("table_session_token")
  );
  const [tableLabel, setTableLabel] = useState<string | null>(() => sessionStorage.getItem("table_label"));

  function setTableSession(id: string | null, token: string | null, label: string | null) {
    setTableSessionId(id);
    setTableSessionToken(token);
    setTableLabel(label);
    if (id) sessionStorage.setItem("table_session_id", id);
    else sessionStorage.removeItem("table_session_id");
    if (token) sessionStorage.setItem("table_session_token", token);
    else sessionStorage.removeItem("table_session_token");
    if (label) sessionStorage.setItem("table_label", label);
    else sessionStorage.removeItem("table_label");
  }

  function addLine(menuItem: MenuItem, quantity: number, selectedAddons: SelectedAddon[]) {
    const key = `${menuItem.id}:${selectedAddons.map((a) => a.option_label).join(",")}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(MAX_ITEM_QUANTITY, l.quantity + quantity) } : l
        );
      }
      return [...prev, { key, menuItem, quantity: Math.min(MAX_ITEM_QUANTITY, quantity), selectedAddons }];
    });
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) return removeLine(key);
    const clamped = Math.min(MAX_ITEM_QUANTITY, quantity);
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: clamped } : l)));
  }

  function clear() {
    setLines([]);
  }

  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        tableSessionId,
        tableSessionToken,
        tableLabel,
        setTableSession,
        addLine,
        removeLine,
        updateQuantity,
        clear,
        subtotalCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
