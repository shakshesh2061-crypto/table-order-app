import { useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api/endpoints/staff";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { useOrderSocket } from "../../realtime/useOrderSocket";
import type { OrderStatus } from "@table-order/shared";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function LiveQueue() {
  const queryClient = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["staff", "orders"],
    queryFn: () => staffApi.orders(),
    refetchInterval: 20000,
  });

  useOrderSocket({
    onEvent: (event) => {
      if (event.type === "order.status_changed") {
        queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      }
    },
  });

  async function advance(orderId: string, next: OrderStatus) {
    await staffApi.updateStatus(orderId, next);
    queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
  }

  if (!orders || orders.length === 0) {
    return <div className="p-8 text-center text-neutral-500">No active orders right now.</div>;
  }

  return (
    <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => {
        const next = NEXT_STATUS[order.status];
        return (
          <div key={order.id} className="bg-white border border-neutral-200 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="font-medium">#{order.id.slice(0, 8)}</p>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-neutral-500">{new Date(order.created_at).toLocaleTimeString()}</p>
            {order.special_requests && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">{order.special_requests}</p>
            )}
            <ul className="mt-2 space-y-1 text-sm">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.name_snapshot}
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm font-medium">{formatPrice(order.total_cents)}</span>
              {next && (
                <Button className="text-xs" onClick={() => advance(order.id, next)}>
                  Mark {next}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
