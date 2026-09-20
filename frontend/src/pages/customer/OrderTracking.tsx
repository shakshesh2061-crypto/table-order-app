import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../../api/endpoints/orders";
import { StatusBadge } from "../../components/StatusBadge";
import { LoadingState } from "../../components/LoadingState";
import { Celebration } from "../../components/Celebration";
import { useOrderSocket } from "../../realtime/useOrderSocket";
import { useCart } from "./CartContext";
import { ORDER_STATUS_FLOW } from "@table-order/shared";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { tableSessionToken } = useCart();

  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);
  const [showCelebration, setShowCelebration] = useState(justPlaced);

  useEffect(() => {
    if (!justPlaced) return;
    const timer = setTimeout(() => setShowCelebration(false), 1800);
    return () => clearTimeout(timer);
  }, [justPlaced]);

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.byId(id!, tableSessionToken),
    enabled: Boolean(id),
    refetchInterval: 15000,
  });

  useOrderSocket({
    sessionToken: tableSessionToken ?? undefined,
    onEvent: (event) => {
      if (event.type === "order.status_changed" && event.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ["order", id] });
      }
    },
  });

  if (!order) return <LoadingState message="Loading order…" />;

  const activeIndex = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number]);

  return (
    <div className="p-4">
      {showCelebration && <Celebration />}
      {justPlaced && (
        <div className="mb-3 bg-brand-50 border-2 border-brand-100 rounded-2xl px-3 py-2 text-center font-display font-semibold text-brand-700 animate-pop-in">
          🎉 Order placed! We'll get cooking right away.
        </div>
      )}
      <div className="bg-white border-2 border-neutral-100 rounded-2xl p-4 shadow-card animate-fade-in-up">
        <div className="flex justify-between items-center">
          <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-4 flex items-center">
          {ORDER_STATUS_FLOW.map((step, idx) => (
            <div key={step} className="flex-1 flex items-center">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${idx <= activeIndex ? "bg-brand-500" : "bg-neutral-200"}`}
              />
              {idx < ORDER_STATUS_FLOW.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors ${idx < activeIndex ? "bg-brand-500" : "bg-neutral-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1 capitalize">
          {ORDER_STATUS_FLOW.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}× {item.name_snapshot}
              </span>
              <span>{formatPrice(item.price_cents_snapshot * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1">
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal_cents)}</span>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-sm text-accent-600 font-medium">
              <span>Points discount ({order.points_redeemed} pts)</span>
              <span>−{formatPrice(order.discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-bold text-lg">
            <span>Total</span>
            <span className="text-brand-600">{formatPrice(order.total_cents)}</span>
          </div>
        </div>

        {order.points_earned > 0 && (
          <div className="mt-3 bg-accent-50 border-2 border-accent-100 rounded-xl px-3 py-2 text-sm font-semibold text-accent-700 animate-pop-in">
            🌟 You earned {order.points_earned} points on this order!
          </div>
        )}
      </div>
    </div>
  );
}
