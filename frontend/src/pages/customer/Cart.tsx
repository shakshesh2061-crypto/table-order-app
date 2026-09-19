import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart, MAX_ITEM_QUANTITY } from "./CartContext";
import { ordersApi } from "../../api/endpoints/orders";
import { Button } from "../../components/Button";
import { useAuth } from "../../auth/AuthContext";
import { effectivePriceCents, POINTS_PER_DOLLAR_REDEEMED } from "../../types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Cart() {
  const { lines, updateQuantity, removeLine, clear, subtotalCents, tableSessionId } = useCart();
  const { user } = useAuth();
  const [specialRequests, setSpecialRequests] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const navigate = useNavigate();

  const { data: pointsData } = useQuery({
    queryKey: ["loyalty", "points"],
    queryFn: ordersApi.myPoints,
    enabled: user?.role === "customer",
  });
  const balance = pointsData?.points ?? 0;

  const maxDollarsFromBalance = Math.floor(balance / POINTS_PER_DOLLAR_REDEEMED);
  const maxDollarsFromSubtotal = Math.floor(subtotalCents / 100);
  const redeemableDollars = Math.min(maxDollarsFromBalance, maxDollarsFromSubtotal);
  const pointsToRedeem = usePoints ? redeemableDollars * POINTS_PER_DOLLAR_REDEEMED : 0;
  const discountCents = usePoints ? redeemableDollars * 100 : 0;
  const totalCents = subtotalCents - discountCents;

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      const order = await ordersApi.placeOrder({
        table_session_id: tableSessionId,
        special_requests: specialRequests || undefined,
        redeem_points: pointsToRedeem,
        items: lines.map((l) => ({
          menu_item_id: l.menuItem.id,
          quantity: l.quantity,
          selected_addons: l.selectedAddons,
        })),
      });
      clear();
      navigate(`/customer/orders/${order.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500">
        <div className="text-4xl mb-2">🛒</div>
        Your cart is empty.
        <div className="mt-4">
          <Button onClick={() => navigate("/customer/menu")}>Browse menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {lines.map((line) => {
        const basePrice = effectivePriceCents(line.menuItem.price_cents, line.menuItem.discount_percent);
        const addonsTotal = line.selectedAddons.reduce((s, a) => s + a.price_cents, 0);
        return (
          <div key={line.key} className="bg-white border-2 border-neutral-100 rounded-2xl p-3 shadow-card animate-fade-in-up">
            <div className="flex justify-between">
              <p className="font-semibold">{line.menuItem.name}</p>
              <button className="text-sm text-red-500 font-medium" onClick={() => removeLine(line.key)}>
                Remove
              </button>
            </div>
            {line.selectedAddons.map((a) => (
              <p key={a.option_label} className="text-xs text-neutral-500">
                {a.group_name}: {a.option_label}
              </p>
            ))}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  className="w-7 h-7 rounded-full border-2 border-neutral-200"
                  onClick={() => updateQuantity(line.key, line.quantity - 1)}
                >
                  −
                </button>
                <span className="font-semibold">{line.quantity}</span>
                <button
                  className="w-7 h-7 rounded-full border-2 border-neutral-200 disabled:opacity-40"
                  disabled={line.quantity >= MAX_ITEM_QUANTITY}
                  onClick={() => updateQuantity(line.key, line.quantity + 1)}
                >
                  +
                </button>
              </div>
              <p className="font-bold text-brand-600">{formatPrice((basePrice + addonsTotal) * line.quantity)}</p>
            </div>
          </div>
        );
      })}

      <textarea
        placeholder="Special requests (optional)"
        value={specialRequests}
        onChange={(e) => setSpecialRequests(e.target.value)}
        className="w-full border-2 border-neutral-200 rounded-xl p-3 text-sm focus:border-brand-400 focus:outline-none"
        rows={2}
      />

      {user?.role === "customer" && balance > 0 && (
        <div className="bg-accent-50 border-2 border-accent-100 rounded-2xl p-3 animate-fade-in-up">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-semibold text-accent-700">
              🌟 You have {balance} points ({formatPrice(maxDollarsFromBalance * 100)} available)
            </span>
            <input
              type="checkbox"
              checked={usePoints}
              onChange={(e) => setUsePoints(e.target.checked)}
              disabled={redeemableDollars <= 0}
              className="w-5 h-5 accent-accent-500"
            />
          </label>
          {usePoints && redeemableDollars > 0 && (
            <p className="text-xs text-accent-600 mt-1">
              Redeeming {pointsToRedeem} points for {formatPrice(discountCents)} off
            </p>
          )}
        </div>
      )}

      <div className="space-y-1 pt-2">
        <div className="flex justify-between text-sm text-neutral-500">
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-sm text-accent-600 font-medium">
            <span>Points discount</span>
            <span>−{formatPrice(discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between font-display font-bold text-xl">
          <span>Total</span>
          <span className="text-brand-600">{formatPrice(totalCents)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" onClick={placeOrder} disabled={placing}>
        {placing ? "Placing order…" : "Place order 🎉"}
      </Button>
    </div>
  );
}
